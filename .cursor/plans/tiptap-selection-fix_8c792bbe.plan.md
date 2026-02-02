---
name: tiptap-selection-fix
overview: 修复首次进入协同编辑器时的 TextSelection 报错，通过预加载内容标准化确保文档中存在可用文本块，并完成本地复现与验证。
todos:
  - id: normalize-preload
    content: 为预加载内容增加可选区标准化逻辑
    status: completed
  - id: verify-manual
    content: 启动前端并在两入口验证无报错
    status: completed
isProject: false
---

# 修复 Tiptap 选区错误

## 目标

- 确保首次进入演训方案与模板管理编辑器时，不再触发 `TextSelection endpoint not pointing into a node with inline content (doc)`。
- 不影响现有协同编辑、预加载与自动保存逻辑。

## 变更方案

- 在演训方案与模板的预加载内容应用链路中，对 HTML 做“可放置光标”标准化：
  - 若内容为空或首个顶层节点非文本块，包裹为 `<p>...</p>`。
  - 无论内容结构如何，追加一个空段落 `<p></p>`，保证文档含有文本块。
- 仅在首次应用预加载内容/初始内容时进行标准化，不改变用户后续编辑内容。
- 复用现有重试与协同同步逻辑，不更改协同连接时序。

## 涉及文件

- [e:/job-project/collabedit-fe/src/views/training/document/TiptapCollaborativeEditor.vue](e:/job-project/collabedit-fe/src/views/training/document/TiptapCollaborativeEditor.vue)
  - 在 `applyPreloadedContent` 的 `tryApplyContent` 内，对 `content` 做标准化后再 `setContent`。
- [e:/job-project/collabedit-fe/src/views/template/editor/MarkdownCollaborativeEditor.vue](e:/job-project/collabedit-fe/src/views/template/editor/MarkdownCollaborativeEditor.vue)
  - 在 `applyInitialContent` 的 `tryApplyContent` 内，对 `content` 做相同标准化。

## 参考片段

```530:646:e:/job-project/collabedit-fe/src/views/training/document/TiptapCollaborativeEditor.vue
const applyPreloadedContent = () => {
  // ...
  const tryApplyContent = (retryCount = 0, maxRetries = 5, delay = 300) => {
    // ...
    if (isEditorEmpty || (isFirstLoadWithContent.value && currentStripped.length < 10)) {
      // setContent 在此执行
    }
  }
}
```

## 测试计划

- 本地启动前端开发服务器。
- 复现路径：
  - 进入演训方案编辑器，首次点击“写作/编辑”进入页面。
  - 进入模板管理编辑器，首次点击“写作/编辑”进入页面。
- 验证点：
  - 控制台无 `TextSelection endpoint not pointing into a node with inline content (doc)`。
  - 预加载内容正常展示，自动保存与协同状态不受影响。
