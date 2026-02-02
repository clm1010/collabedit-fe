---
name: 修复 Markdown 对齐格式丢失
overview: 修复模板管理 Markdown 编辑器中文本对齐（居中、右对齐）样式在保存后丢失的问题。通过在 HTML 转 Markdown 时保留带对齐样式的 HTML 标签，并确保加载时正确解析。
todos:
  - id: fix-p-align
    content: 修改 fileParser.ts 中段落转换逻辑，保留带 text-align 样式的 HTML 标签
    status: completed
  - id: fix-heading-align
    content: 修改 fileParser.ts 中标题转换逻辑，保留带 text-align 样式的 HTML 标签
    status: completed
  - id: sync-editor-convert
    content: 同步修改 MarkdownCollaborativeEditor.vue 中的 convertMarkdownContent 函数
    status: completed
  - id: test-verify
    content: 测试验证：设置对齐样式 -> 保存 -> 重新打开 -> 验证样式保留
    status: completed
isProject: false
---

# 修复 Markdown 编辑器对齐格式丢失

## 问题定位

**根本原因**：[fileParser.ts](e:\job-project\collabedit-fe\src\views\template\editor\utils\fileParser.ts) 中的 `convertContentToMarkdown` 函数在将 HTML 转换为 Markdown 时，丢弃了 `<p>` 和 `<h1-h6>` 标签上的 `style="text-align: xxx"` 属性。

**问题代码**（第 434-435 行）：

```typescript
.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
```

## 解决方案

采用**混合模式**：对于带对齐样式的内容，保留完整 HTML 标签；对于普通内容，转换为标准 Markdown。

### 方案优势

- 兼容标准 Markdown 语法
- `markdown-it` 的 `html: true` 配置可直接解析保留的 HTML 标签
- 无需修改 API 接口或后端
- 符合 Tiptap 官方 Markdown 扩展的设计理念

## 修改内容

### 1. 修改 `convertContentToMarkdown` 函数

**文件**：[fileParser.ts](e:\job-project\collabedit-fe\src\views\template\editor\utils\fileParser.ts)

修改逻辑：

- 段落处理：检测 `text-align` 样式，若存在则保留完整 `<p>` 标签
- 标题处理：检测 `text-align` 样式，若存在则保留完整 `<h1-h6>` 标签

**修改前**：

```typescript
// 处理段落
.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
// 处理标题
.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
```

**修改后**：

```typescript
// 处理段落 - 保留带对齐样式的 HTML 标签
.replace(/<p([^>]*)>(.*?)<\/p>/gi, (match, attrs, content) => {
  if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
    return match + '\n\n'  // 保留完整 HTML
  }
  return content + '\n\n'  // 转换为纯文本
})
// 标题同理处理
```

### 2. 验证加载逻辑

**文件**：[fileParser.ts](e:\job-project\collabedit-fe\src\views\template\editor\utils\fileParser.ts)

确认 `markdown-it` 配置已启用 HTML 解析（第 13-18 行）：

```typescript
const md = new MarkdownIt({
  html: true,  // 允许 HTML 标签 - 这是关键
  breaks: true,
  linkify: true,
  typographer: true
})
```

此配置已正确，保留的 HTML 标签在加载时可被正确解析。

### 3. 同步处理 MarkdownCollaborativeEditor.vue

**文件**：[MarkdownCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\template\editor\MarkdownCollaborativeEditor.vue)

检查 `convertMarkdownContent` 函数（第 690-832 行）中的段落和标题处理逻辑，确保与 `fileParser.ts` 保持一致。

## 测试验证

1. 打开模板管理，编辑一个文档
2. 选中文本，设置居中/右对齐
3. 点击保存
4. 返回列表，重新点击写作进入编辑器
5. 验证对齐样式是否保留

## 其他格式样式检查

同步检查以下样式是否也需要保留：

- 字体颜色 (`color`)
- 背景色 (`background-color`)
- 字体大小 (`font-size`)

如需保留，采用相同的处理模式。