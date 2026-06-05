# 紧急修复：用户注册 API 报错

## 问题
`POST /api/users` 返回错误：`{"detail":"There was an error parsing the body"}`

## 测试命令
```bash
curl -X POST http://localhost:8002/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"测试用户","interest_tags":["校园回忆","爱情故事","家庭传承"]}'
```

## 排查方向
1. 检查 `backend/app/routers/users.py` 的 `create_user` 函数
2. 检查 Pydantic 模型 `UserCreate` 定义
3. 检查是否有编码问题（中文）
4. 查看后端日志中的详细错误

## 验证
修复后重新测试 curl 命令，应该返回 201 + 用户对象

## 提交
```bash
git add -A
git commit -m "fix(backend): resolve user registration API parsing error"
git push
```
