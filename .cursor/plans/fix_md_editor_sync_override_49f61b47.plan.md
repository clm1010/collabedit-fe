---
name: Fix MD Editor Sync Override
overview: 修复模板写作编辑器中"MinIO 文件更新后，协同服务器旧 Y.Doc 覆盖新内容"的问题，纯前端修改，不改后端/接口。
todos:
  - id: fix-apply-logic
    content: 修改 applyInitialContent 函数，isFirstLoadWithContent 为 true 时强制应用新内容
    status: completed
  - id: remove-skip-branch
    content: 移除编辑器有内容则跳过的逻辑分支
    status: completed
  - id: add-debug-log
    content: 添加强制覆盖模式的日志输出
    status: completed
  - id: verify-fix
    content: 浏览器测试验证：更新 MinIO 文件后点击写作能显示新内容
    status: completed
isProject: false
---

# 修复模板写作编辑器内容不更新问题

## 问题根因

协同服务器缓存了旧的 Y.Doc，当用户更新 MinIO 文件后再次进入写作页：

1. 后端 `/tbTemplate/getFileStream` 正确返回了**新内容**
2. 协同服务器把**旧 Y.Doc** 同步给客户端
3. 当前代码检测到"编辑器已有内容"就**跳过**了新内容应用

关键代码位置 [`MarkdownCollaborativeEditor.vue`](e:\job-project\collabedit-fe\src\views\template\editor\MarkdownCollaborativeEditor.vue) 第 304 行：

```typescript
// 当前逻辑：编辑器有内容（>10字符）就跳过
if (isEditorEmpty || (isFirstLoadWithContent.value && currentStripped.length < 10)) {
  // 应用新内容
} else {
  // 跳过 - 这里导致新内容被忽略
}
```

## 修复方案

修改 `applyInitialContent` 函数，当 `isFirstLoadWithContent` 为 true 时**强制应用**新内容，不再检查编辑器是否已有内容。

### 修改点 1：强制应用逻辑

修改 [`MarkdownCollaborativeEditor.vue`](e:\job-project\collabedit-fe\src\views\template\editor\MarkdownCollaborativeEditor.vue) 第 302-344 行的判断逻辑：

```typescript
// 修改前：检查编辑器是否为空
if (isEditorEmpty || (isFirstLoadWithContent.value && currentStripped.length < 10)) {

// 修改后：首次加载有内容时强制应用，无视协同同步的旧内容
if (isFirstLoadWithContent.value || isEditorEmpty) {
```

### 修改点 2：移除"编辑器有内容则跳过"的分支

将第 331-343 行的"重试/跳过"逻辑改为：当 `isFirstLoadWithContent` 为 true 时始终强制应用，不再走"跳过"分支。

### 修改点 3：添加强制覆盖日志

增加日志输出，便于调试：

```typescript
if (isFirstLoadWithContent.value) {
  console.log('首次加载模式：强制应用新内容，覆盖协同旧内容')
}
```

## 影响评估

- **正常场景**：用户点击"写作"进入，加载 MinIO 最新文件并显示
- **多人协同**：如果用户 A 正在编辑，用户 B 点击"写作"进入会加载 MinIO 文件并覆盖 A 的编辑内容 - 这是**预期行为**，因为用户 B 的意图是"加载文件开始编辑"
- **刷新页面**：由于 `hasContent` 查询参数和 sessionStorage 内容都在，会重新应用 MinIO 内容