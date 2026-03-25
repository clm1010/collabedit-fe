---
name: DragHandle拖拽修复归档
overview: DragHandle 拖拽抓手松手无效果问题的完整修复记录，包括根因分析、历次迭代和最终解决方案。已完成。
todos: []
isProject: false
---

# DragHandle 拖拽松手无效果 -- 修复归档

## 问题描述

编辑器中的 DragHandle（六点拖动抓手）可以拖动段落、图片、表格等块级节点，但松手后文档无任何变化，节点未移动到目标位置。

## 最终根因

`@tiptap/extension-drag-handle` 插件在初始化时通过 `wrapper.appendChild(element)` 将 Vue 渲染的 DragHandle DOM 元素移出了 Vue 控制的 DOM 树，放入插件自建的 wrapper 容器中。插件通过 `element.addEventListener("dragstart", onDragStart)` 注册的事件监听器与用户实际交互的 DOM 元素之间产生了断裂，导致：

1. 插件内部的 `onDragStart` 回调从未被触发
2. `onElementDragStart`（我们的自定义回调）从未被调用
3. `view.dragging`（ProseMirror 的拖拽状态）始终为空
4. ProseMirror 的 `drop` 处理器无法识别拖拽内容，松手后无任何效果

## 最终修复方案

在 `document` 上注册全局 `dragstart` 捕获阶段监听器，绕过插件内部断裂的事件链，直接驱动拖拽逻辑。

### 核心代码（TiptapEditor.vue）

```
globalDragStartHandler          -- 全局 dragstart 捕获处理器，检测 .drag-handle 元素后转发
handleElementDragStart          -- 设置 view.dragging + 阻止 clearData + queueMicrotask 补全 node
onMounted 注册 + onBeforeUnmount 清理全局监听器
```

### 修复原理

```
dragstart 事件在 .drag-handle 元素上触发
    |
    v
全局捕获监听器（document, capture phase）
    |-- 检测 event.target 是否在 .drag-handle 内
    |-- 调用 handleElementDragStart(e)
    |     |-- dataTransfer.setData('text/plain', ' ')
    |     |-- 设置 view.dragging = { slice, move: true }
    |     |-- Object.defineProperty 阻止 clearData
    |     |-- queueMicrotask 补全 view.dragging.node
    v
用户松手 → ProseMirror drop handler
    |-- 读取 view.dragging（已正确设置）
    |-- 使用 node.replace(tr) 精确删除源节点
    |-- 在目标位置插入 slice
    v
文档更新，节点移动成功
```

## 历次修复迭代

### 第 1 次：patch clearData + 自定义 handleDrop（失败）

- **方向**：在 `handleElementDragStart` 中 patch `dataTransfer.clearData` 使其自动补回数据；同时编写自定义 `handleDragHandleDrop` 通过 MIME 类型传递源节点位置，手动执行 `tr.delete + tr.insert`
- **失败原因**：自定义 drop 逻辑绕过了 ProseMirror 充分测试的原生 drop 处理（dropPoint、mapping、schema 校验），在 Y.js 协同编辑场景下源位置快照可能过期，且两条 drop 路径（自定义 vs ProseMirror 原生）互相干扰

### 第 2 次：移除自定义 drop + 最小化干预（失败）

- **方向**：移除所有自定义 drop 代码（`DRAG_HANDLE_POS_MIME`、`getTopLevelNodePos`、`handleDragHandleDrop`、`editorProps.handleDrop`），仅通过 `onElementDragStart` 回调做两件事：阻止 `clearData` + `queueMicrotask` 补全 `view.dragging.node`
- **失败原因**：虽然策略正确，但 `onElementDragStart` 本身就没被调用。插件的 `onDragStart` 事件链已断裂，所有依赖插件回调的方案都无法生效

### 第 3 次：全局 dragstart 捕获监听器（成功）

- **方向**：不再依赖插件内部的事件传递机制，在 `document` 上注册 `dragstart` 捕获阶段监听器，直接检测 `.drag-handle` 元素并调用 `handleElementDragStart`
- **成功原因**：完全绕过了插件的 DOM 移动导致的事件断裂问题，捕获阶段在任何其他处理器之前执行，确保 `view.dragging` 始终被正确设置

## 涉及文件

- `src/views/training/document/components/TiptapEditor.vue` -- 唯一修改文件

## 相关保留代码清单

| 位置                      | 内容                         | 作用         |
| ------------------------- | ---------------------------- | ------------ |
| Template 34-60            | DragHandle 组件及 props/slot | 拖拽手柄 UI  |
| Import 264-265            | DragHandle + NodeRange       | 依赖导入     |
| Extension 526-527         | NodeRange 注册               | 拖拽选区支持 |
| Script 545-629            | DragHandle 相关逻辑          | 核心拖拽实现 |
| onMounted 641             | 注册 globalDragStartHandler  | 生命周期绑定 |
| onBeforeUnmount 1022-1023 | 移除 globalDragStartHandler  | 生命周期清理 |
| Style 1837-1920           | DragHandle + NodeRange CSS   | 视觉样式     |
