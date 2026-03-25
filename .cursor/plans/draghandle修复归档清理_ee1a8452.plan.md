---
name: DragHandle修复归档清理
overview: 删除 3 个已完成的 DragHandle 修复方案文件，生成问题总结归档文档，并清理 TiptapEditor.vue 中残留的调试代码。
todos:
  - id: delete-plans
    content: 删除 3 个旧方案文件
    status: completed
  - id: create-archive
    content: 生成 DragHandle 修复总结归档文档
    status: completed
  - id: cleanup-dev-logs
    content: 清理 handleDragNodeChange/addParagraphAfter 中二次修复时加入的 DEV 调试日志
    status: completed
  - id: verify-lint
    content: 验证无 lint 错误
    status: completed
isProject: false
---

# DragHandle 修复归档与代码清理

## 1. 删除 3 个旧方案文件

- [draghandle终极修复acc36f28.plan.md](e:\job-project\collabedit-fe.cursor\plans\draghandle终极修复_acc36f28.plan.md)
- [draghandle二次根因修复29ab2e08.plan.md](e:\job-project\collabedit-fe.cursor\plans\draghandle二次根因修复_29ab2e08.plan.md)
- [行内图片对齐与draghandle修复0e932e03.plan.md](e:\job-project\collabedit-fe.cursor\plans\行内图片对齐与draghandle修复_0e932e03.plan.md)

## 2. 生成问题总结归档文档

创建一份新的归档方案，记录：

- **问题描述**：DragHandle 拖拽抓手可以拖动段落/图片/表格，但松手后文档无任何变化
- **根因**：DragHandle 插件通过 `wrapper.appendChild(element)` 将 Vue 渲染的 DOM 元素移出了 Vue 控制的 DOM 树，导致插件注册在原始元素上的 `addEventListener("dragstart", onDragStart)` 与用户实际交互的 DOM 元素断裂，`onElementDragStart` 回调从未被调用，`view.dragging` 始终为空
- **修复方式**：在 `document` 上注册全局 `dragstart` 捕获阶段监听器，绕过插件内部断裂的事件链，直接调用 `handleElementDragStart` 设置 `view.dragging`
- **历次修复迭代记录**（3 次尝试的方向和失败原因）

## 3. 代码清理审查

经过全面审查，[TiptapEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue) 中：

**已清理（此前已完成）**：

- `DRAG_HANDLE_POS_MIME` 常量 — 已删除
- `getTopLevelNodePos` 函数 — 已删除
- `handleDragHandleDrop` 函数 — 已删除
- 自定义 `editorProps.handleDrop` — 已删除
- 所有 `[DH-DIAG]` 诊断日志 — 已删除
- 全局诊断 `drop` 监听器 — 已删除
- 废弃的 `DragHandle.ts` 自定义扩展文件 — 已删除

**需要清理**：

- 第 552-554 行：`import.meta.env.DEV` 包裹的 `console.debug('[编辑器] DragHandle node-change', ...)` — 这是二次修复时加入的调试日志，可移除
- 第 563-565 行：`import.meta.env.DEV` 包裹的 `console.warn('[编辑器] DragHandle 节点无效，跳过插入')` — 这是二次修复时加入的调试日志，可移除

**保留的正式修复代码**：

- `globalDragStartHandler` — 全局 dragstart 捕获处理器（核心修复）
- `handleElementDragStart` — 设置 `view.dragging` + 阻止 `clearData` + `queueMicrotask` 补全 node
- `onMounted` 注册 + `onBeforeUnmount` 清理全局监听器
- `handleDragNodeChange` + `currentDragNode` ref
- `addParagraphAfter`
- Template: DragHandle 及所有 props（`:nested="true"`, `:on-element-drag-start`）
- `NodeRange` 扩展注册
- `.ProseMirror-selectednoderange` 拖拽高亮 CSS
