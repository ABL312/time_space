import subprocess, os

os.chdir(r'D:\48h')

# Remove temp files that shouldn't be in the repo
temp_files = [
    'check_css_usage.py', 'debug39.txt', 'debug39err.txt',
    'fetch_issues.py', 'git_push.py', 'git_pullpush.py',
    'run_build.py', 'run_lint.py',
    'issue39.json', 'issue40.json', 'issue41.json', 'issue42.json',
    'frontend/build_result.txt', 'frontend/lint_result.txt',
]

for f in temp_files:
    if os.path.exists(f):
        os.remove(f)
        print(f"Removed: {f}")

# Stage deletions and commit
subprocess.run(['git', 'add', '-A'])
r = subprocess.run(['git', 'commit', '-m', 'chore: remove temporary scripts and debug files'], capture_output=True, text=True)
print(f"\nCommit: {r.stdout.strip()}")

r2 = subprocess.run(['git', 'push'], capture_output=True, text=True)
print(f"Push: return code {r2.returncode}")
if r2.stderr:
    print(r2.stderr)
