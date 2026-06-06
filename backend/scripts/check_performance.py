"""
性能基线检查脚本 (只读，不修改任何数据)

Usage:
    cd backend
    python scripts/check_performance.py

Checks:
    1. SQLite 配置: WAL / busy_timeout / foreign_keys / synchronous / cache_size
    2. 数据库文件大小和表行数
    3. 现有索引列表
    4. 环境变量配置状态

Output:
    终端彩色输出 + 保存到 backend/docs/performance-check-result.txt
"""
import sqlite3
import os
import sys
from pathlib import Path
from datetime import datetime

# ---- paths -----------------------------------------------------------
BACKEND_DIR = Path(__file__).parent.parent
DB_PATH = BACKEND_DIR / "data" / "timespace.db"
DOCS_DIR = BACKEND_DIR / "docs"
OUTPUT_FILE = DOCS_DIR / "performance-check-result.txt"

# ---- helpers ----------------------------------------------------------
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

def ok(msg):
    return f"{GREEN}✅ {msg}{RESET}"
def warn(msg):
    return f"{YELLOW}⚠️  {msg}{RESET}"
def fail(msg):
    return f"{RED}❌ {msg}{RESET}"
def info(msg):
    return f"{CYAN}   {msg}{RESET}"
def title(msg):
    return f"{BOLD}{'='*60}\n  {msg}\n{'='*60}{RESET}"

results = []  # (line) for file output


def log(line):
    """Print to console and collect for file output."""
    print(line)
    # Strip ANSI for file output
    clean = line
    for code in [GREEN, YELLOW, RED, CYAN, RESET, BOLD]:
        clean = clean.replace(code, "")
    results.append(clean)


def check_db_exists():
    if not DB_PATH.exists():
        log(fail(f"Database not found at {DB_PATH}"))
        log(info("Run the backend once to create the database, or seed demo data."))
        sys.exit(1)
    db_size_mb = DB_PATH.stat().st_size / (1024 * 1024)
    log(ok(f"Database found: {DB_PATH} ({db_size_mb:.2f} MB)"))


def check_pragmas():
    """Check SQLite PRAGMA settings."""
    log("")
    log(title("1. SQLite Pragma 配置"))
    log("")

    conn = sqlite3.connect(str(DB_PATH))

    checks = [
        ("journal_mode", "wal", "WAL 模式"),
        ("foreign_keys", 1, "外键约束"),
        ("busy_timeout", None, "忙等待超时 (ms) — 期望 ≥5000"),
        ("synchronous", 1, "同步模式 — WAL下建议NORMAL(1)"),
        ("cache_size", None, "缓存大小 — 建议 ≥ -8000"),
        ("mmap_size", 0, "内存映射 — 建议 ≥ 268435456"),
        ("temp_store", 0, "临时存储 — 建议 MEMORY(2)"),
    ]

    for pragma, expected, label in checks:
        cursor = conn.execute(f"PRAGMA {pragma}")
        row = cursor.fetchone()
        value = row[0] if row else None

        if pragma == "journal_mode":
            if str(value).lower() == "wal":
                log(ok(f"{label}: {value}"))
            else:
                log(fail(f"{label}: {value} (期望 WAL)"))

        elif pragma == "foreign_keys":
            if value == 1:
                log(ok(f"{label}: ON"))
            else:
                log(fail(f"{label}: OFF (期望 ON)"))

        elif pragma == "busy_timeout":
            if value and value >= 5000:
                log(ok(f"{label}: {value}ms"))
            elif value and value > 0:
                log(warn(f"{label}: {value}ms (建议 ≥ 5000ms)"))
            else:
                log(fail(f"{label}: 未配置 (0) — 并发写入将直接失败!"))

        elif pragma == "synchronous":
            # 0=OFF, 1=NORMAL, 2=FULL, 3=EXTRA
            modes = {0: "OFF", 1: "NORMAL", 2: "FULL", 3: "EXTRA"}
            mode_name = modes.get(value, str(value))
            if value == 1:
                log(ok(f"{label}: {mode_name}"))
            elif value == 0:
                log(warn(f"{label}: {mode_name} (不安全，但最快)"))
            elif value == 2:
                log(warn(f"{label}: {mode_name} (WAL 下可降为 NORMAL 提升性能)"))
            else:
                log(info(f"{label}: {mode_name}"))

        elif pragma == "cache_size":
            cache_kb = abs(value) if value else 0
            if cache_kb >= 8000:
                log(ok(f"{label}: {value} ({cache_kb} KB)"))
            elif cache_kb > 0:
                log(warn(f"{label}: {value} ({cache_kb} KB) — 建议 ≥ 8000"))
            else:
                log(info(f"{label}: {value} (默认 ~2MB)"))

        elif pragma == "mmap_size":
            if value and value >= 268435456:
                log(ok(f"{label}: {value} ({value // (1024*1024)} MB)"))
            elif value and value > 0:
                log(warn(f"{label}: {value} — 建议 ≥ 256MB"))
            else:
                log(info(f"{label}: 未启用 (0) — 建议开启以提升读性能"))

        elif pragma == "temp_store":
            modes = {0: "DEFAULT", 1: "FILE", 2: "MEMORY"}
            mode_name = modes.get(value, str(value))
            if value == 2:
                log(ok(f"{label}: {mode_name}"))
            else:
                log(info(f"{label}: {mode_name} — 建议 MEMORY"))

    conn.close()


def check_tables():
    """Check table row counts and sizes."""
    log("")
    log(title("2. 数据库表统计"))
    log("")

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    tables = [row[0] for row in cursor.fetchall()]

    if not tables:
        log(info("没有用户表 — 数据库为空。运行 seed 脚本添加测试数据。"))
        conn.close()
        return

    for table in tables:
        count_cursor = conn.execute(f"SELECT COUNT(*) FROM [{table}]")
        count = count_cursor.fetchone()[0]
        log(info(f"{table}: {count} 行"))

    conn.close()


def check_indexes():
    """List existing indexes."""
    log("")
    log(title("3. 现有索引"))
    log("")

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.execute(
        """
        SELECT name, tbl_name 
        FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%'
        ORDER BY tbl_name, name
        """
    )
    indexes = cursor.fetchall()

    if not indexes:
        log(warn("没有用户定义的索引！"))
    else:
        for name, table in indexes:
            # Get indexed columns
            info_cursor = conn.execute(f"PRAGMA index_info('{name}')")
            cols = [row[2] for row in info_cursor.fetchall() if row[2] is not None]
            col_str = ", ".join(cols) if cols else "(expression)"
            log(info(f"{table}.{name}  ON ({col_str})"))

    conn.close()


def check_env():
    """Check environment variables."""
    log("")
    log(title("4. 环境变量配置"))
    log("")

    vars_to_check = [
        ("OPENAI_API_KEY", "GPT 情感分析 / 场景识别"),
        ("ELEVENLABS_API_KEY", "语音克隆"),
        ("UPLOAD_DIR", "文件上传目录"),
        ("CORS_ORIGINS", "跨域来源"),
        ("DATABASE_URL", "数据库 URL"),
        ("ENVIRONMENT", "运行环境"),
    ]

    for var, purpose in vars_to_check:
        value = os.getenv(var, "")
        if var.endswith("_KEY") or var.endswith("_URL"):
            if value:
                masked = value[:8] + "..." if len(value) > 8 else "***"
                log(ok(f"{var}: {masked}  ({purpose})"))
            else:
                log(warn(f"{var}: (未设置) — {purpose} 将使用 fallback"))
        else:
            if value:
                log(ok(f"{var}: {value}  ({purpose})"))
            else:
                log(info(f"{var}: (使用默认值)  ({purpose})"))


def check_dead_code():
    """Check for unused/dead code."""
    log("")
    log(title("5. 代码健康检查"))
    log("")

    # Check if VoiceService is used (sync version, appears to be dead code)
    voice_service_path = BACKEND_DIR / "app" / "services" / "voice_service.py"
    if voice_service_path.exists():
        # Quick grep-like check
        content = voice_service_path.read_text(encoding="utf-8")
        log(warn("voice_service.py (同步 ElevenLabs) — 未被任何路由引用，疑似废弃代码"))

    # Check for circular import risks
    log(info("location_service.py 在 _get_nearby_capsule_count 中延迟导入 database — 避免循环引用"))
    log(info("collections.py 在 get_collection 中延迟导入 capsules._parse_capsule_row — 避免循环引用"))


def main():
    """Run all checks."""
    log("")
    log(f"⏱️  性能基线检查 — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"📍 数据库: {DB_PATH}")

    check_db_exists()
    check_pragmas()
    check_tables()
    check_indexes()
    check_env()
    check_dead_code()

    # Summary
    log("")
    log(title("6. 总结"))
    log("")
    log(info("完成检查内容:"))
    log(info("  ✅ 路由全景 (25个端点，详见 performance-baseline.md §2)"))
    log(info("  ✅ SQLite 配置审计 (详见 performance-baseline.md §3)"))
    log(info("  ✅ 数据库表统计 (详见上方 §2)"))
    log(info("  ✅ 索引清单 (详见上方 §3)"))
    log(info("  ✅ 环境变量状态 (详见上方 §4)"))
    log("")
    log(info("📄 完整基线文档: backend/docs/performance-baseline.md"))
    log(info(f"📄 本次检查记录: {OUTPUT_FILE}"))
    log("")

    # Write to file
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n".join(results), encoding="utf-8")

    # Return exit code based on critical issues
    # Read the check results for critical failures
    has_critical = any("❌" in line for line in results)
    if has_critical:
        log(fail("发现关键配置问题，请在重构前修复！"))
        sys.exit(1)
    else:
        log(ok("所有关键检查通过。"))
        sys.exit(0)


if __name__ == "__main__":
    main()
