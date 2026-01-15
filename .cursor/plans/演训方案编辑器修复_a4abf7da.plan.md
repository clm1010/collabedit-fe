---
name: 演训方案编辑器修复
overview: 修复演训方案编辑器的三个问题：1) 图片在导入Word和复制粘贴时显示为base64文本；2) Word红头文件导入后文字排版/对齐不正确；3) 工具栏和气泡菜单的链接功能改用LinkPopover组件实现。
todos:
  - id: copy-link-popover
    content: 复制 LinkPopover.vue 到演训方案 toolbar 目录
    status: completed
  - id: fix-tiptap-editor-link
    content: 修改 TiptapEditor.vue：集成 LinkPopover，替换 window.prompt
    status: completed
  - id: fix-insert-toolbar-link
    content: 修改 InsertToolbar.vue：集成 LinkPopover，移除原有对话框
    status: completed
  - id: fix-image-parsing
    content: 修复图片解析问题：确保 img 标签被正确解析为图片节点
    status: completed
  - id: fix-redhead-format
    content: 修复红头文件排版：优化 cleanWordHtml 保留 text-align 样式
    status: completed
  - id: test-all
    content: 全面测试：图片导入、红头文件排版、链接功能
    status: completed
---

# 演训方案编辑器三项功能修复

## 问题分析

### 问题1：图片解析显示为 base64 文本

- **场景**：导入 Word 文档包含图片、复制粘贴包含图片的内容
- **原因**：HTML 中的 `<img>` 标签被当作纯文本处理，未被 Tiptap 正确解析为图片节点
- **根因**：`setContent` 或 `insertContent` 时，HTML 未被正确解析

### 问题2：Word 红头文件排版问题

- **场景**：导入红头文件 Word 文档后文字排版/对齐不正确
- **参考**：需对照 https://corp3.ai.zhongshuruizhi.com/#/ai 网站效果

### 问题3：链接功能使用 window.prompt

- **当前实现**：`TiptapEditor.vue` 中使用 `window.prompt` 获取链接地址
- **目标**：完全参考 `LinkPopover.vue` 实现

---

## 修复方案

### 修复1：图片解析问题

**文件**：[`TiptapEditor.vue`](e:/job-project/collabedit-fe/src/views/training/document/components/TiptapEditor.vue)

**方案**：确保图片 HTML 被正确解析

- 检查 `ResizableImage` 扩展的 `parseHTML` 配置
- 确保 `allowBase64: true` 和正确的 HTML 属性解析
- 在 Word 导入时，确保图片标签格式正确

**关键代码位置**：

- `ResizableImage.ts` 第 32-109 行：检查图片解析配置
- `StartToolbar.vue` 中的 `confirmWordImport` 方法：检查 HTML 处理

### 修复2：Word 红头文件排版

**文件**：[`wordParser.ts`](e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.ts)

**方案**：优化 HTML 清理逻辑，保留文本对齐样式

- 在 `cleanWordHtml` 函数中保留 `text-align` 样式
- 在 `convertBlockStylesToInline` 中保留对齐属性
- 确保段落的 `text-align: center/right/justify` 被保留

**关键代码位置**：

- `cleanWordHtml` 函数（第 89-170 行）
- `convertBlockStylesToInline` 函数（第 1241-1320 行）
- `StartToolbar.vue` 中的 `cleanWordHtml` 函数（第 977-1235 行）

### 修复3：链接功能改用 LinkPopover

**文件**：

- [`TiptapEditor.vue`](e:/job-project/collabedit-fe/src/views/training/document/components/TiptapEditor.vue)
- [`InsertToolbar.vue`](e:/job-project/collabedit-fe/src/views/training/document/components/toolbar/InsertToolbar.vue)

**方案**：复制并集成 `LinkPopover.vue` 组件

- 将 `LinkPopover.vue` 复制到演训方案的 toolbar 目录
- 在 `TiptapEditor.vue` 中：
- 导入 `LinkPopover` 组件
- 添加 `linkPopoverVisible`、`linkPopoverUrl`、`linkPopoverTriggerRect` 状态
- 将 `toggleBubbleLink` 方法改为打开 LinkPopover
- 添加 `handleLinkApply` 和 `handleLinkRemove` 事件处理
- 添加点击链接打开编辑的事件监听
- 在 `InsertToolbar.vue` 中：
- 将 `insertLink` 方法改为打开 LinkPopover
- 删除原有的链接对话框

**参考实现**：[`MarkdownEditor.vue`](e:/job-project/collabedit-fe/src/views/template/editor/components/MarkdownEditor.vue) 第 591-599 行、705-709 行、1032-1063 行

---

## 实现步骤

1. 复制 `LinkPopover.vue` 到演训方案目录
2. 修改 `TiptapEditor.vue`：

- 集成 LinkPopover 组件
- 修改气泡菜单链接按钮逻辑
- 添加链接点击事件监听

3. 修改 `InsertToolbar.vue`：

- 集成 LinkPopover（通过 props/events 与父组件通信）
- 移除原有对话框

4. 修复图片解析问题：

- 检查并修复 `ResizableImage` 扩展
- 优化 Word 导入时的 HTML 处理

5. 修复红头文件排版：

- 优化 `cleanWordHtml` 保留对齐样式

6. 测试验证所有功能
