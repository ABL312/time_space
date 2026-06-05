你是「时空信箱」项目的 frontend-dev，现在执行 Phase 7 任务。

## 项目信息
- 仓库: D:\time_space
- 前端目录: D:\time_space\frontend
- 主题风格: 「深空信号站」科幻HUD风格（hud/panel/label/btn/data-value 等 CSS class）

## 你的任务

### 任务 A: CreatePage 加 author_id (接口对接要求)

当前 `CreatePage.tsx` 的 FormData 没有传 `author_id`，后端需要这个字段。

1. 在 `handleSubmit` 函数中，FormData 构建时加上：
   ```typescript
   fd.append('author_id', user.id)
   ```
2. 确认 `user` 从 `useUserStore()` 获取且 `user.id` 存在
3. 如果 `user` 为 null（未登录），显示提示并阻止提交

### 任务 B: CreatePage 集成声音克隆 (接口对接要求)

在 CreatePage 中添加声音克隆功能区域：

1. **在语音录制区域下方，添加"声音克隆"区域**：
   - 标题: "AI 声音克隆 (可选)"
   - 说明文字: "上传 10 秒语音样本，AI 将用你的声音朗读留言"
   - 录音按钮: 录制 10 秒语音样本（和主语音录制分开）
   - 文字输入框: 输入要朗读的文字（默认用留言内容）
   - "生成克隆语音" 按钮
   - 生成中显示 loading 状态
   - 生成成功后显示播放预览

2. **调用 voice-clone API**：
   ```typescript
   const handleVoiceClone = async () => {
     const fd = new FormData()
     fd.append('sample', voiceSampleBlob, 'sample.webm')
     fd.append('text', cloneText || message)
     const res = await fetch('/api/ai/voice-clone', { method: 'POST', body: fd })
     const data = await res.json()
     setVoiceCloneUrl(data.audio_url)
   }
   ```

3. **创建胶囊时传 voice_clone_url**：
   ```typescript
   if (voiceCloneUrl) {
     fd.append('voice_clone_url', voiceCloneUrl)
   }
   ```

4. **样式要求**：
   - 使用 panel class 包裹
   - 按钮用 btn class
   - 标题用 label class
   - 和现有深空信号站主题一致

### 任务 C: Bug 检查与修复 (#22 前端部分)

1. **检查所有页面的 API 调用**：
   - 确认 api.ts 中的类型定义和后端返回一致
   - 特别检查 CapsuleResponse 类型是否包含所有字段

2. **检查路由跳转**：
   - 确认所有 navigate() 路径正确
   - 确认 /capsule/:id 路由参数正确传递

3. **检查错误处理**：
   - 所有 API 调用都有 try-catch
   - 错误信息显示给用户（不是空白页）

4. **检查移动端适配**：
   - 所有页面在 375px 宽度下不溢出
   - 按钮可点击区域足够大（至少 44px）

### 技术要求
- Tailwind utility classes，深空信号站主题
- 中文 UI
- 不安装新 npm 包
- 声音克隆录音用 MediaRecorder API（和主语音录制一样）

### 工作流
1. 先 `git pull` 获取最新代码
2. 读取 CreatePage.tsx, api.ts, types/index.ts 了解当前代码
3. 加 author_id
4. 加声音克隆功能
5. Bug 检查
6. git add . && git commit -m "feat(frontend): add author_id + voice clone integration + bug fixes"
7. git push（如果可能）

### 重要提醒
- 如果遇到任何报错，**停下来告诉我（Tostar）**
- 不要修改后端代码
- 声音克隆是可选功能，如果实现复杂可以简化（比如只显示输入框，不实现录音）
