---
name: add-docmodel-node
description: 新增 DocModel 文档节点类型的完整工作流，涉及 5 个文件的同步修改。当需要支持新的文档元素类型（如脚注、水印、图表标题等）的 DOCX 导入导出时使用。
---

# 新增 DocModel 节点类型

## 概述

DocModel 是 DOCX 导入导出的中间模型。新增节点类型**必须同步修改 5 个文件**，缺一不可。

所有文件位于 `src/views/training/document/utils/docModel/`。

## 工作流步骤

### Step 1: 定义类型 — `types.ts`

1. 新增 Block 接口：

```typescript
export interface DocMyBlock {
  type: 'myBlock'
  // 特有属性
  content: string
  style?: Partial<DocStyle>
}
```

2. 加入联合类型：

```typescript
export type DocBlock =
  | DocParagraph
  | DocHeading
  // ...
  | DocMyBlock  // 新增
```

### Step 2: HTML 解析 — `htmlParser.ts`

在 `parseElement()` 或 `parseBlock()` 中添加 HTML -> DocModel 的解析逻辑：

```typescript
if (element.tagName === 'MY-TAG' || element.getAttribute('data-type') === 'my-block') {
  return {
    type: 'myBlock',
    content: element.textContent || '',
    // ...
  }
}
```

### Step 3: HTML 序列化 — `serializer.ts`

在 `serializeBlock()` 中添加 DocModel -> HTML 的序列化逻辑：

```typescript
case 'myBlock':
  return `<div data-type="my-block">${escapeHtml(block.content)}</div>`
```

### Step 4: DOCX 解析 — `docx4jsParser.ts`

在 DOCX 解析流程中添加识别新节点类型的逻辑，将 OOXML 元素映射到 DocModel。

### Step 5: DOCX 导出 — `docModelToDocx.ts`

在导出流程中添加 DocModel -> `docx` 库对象的转换：

```typescript
case 'myBlock':
  return new Paragraph({
    children: [new TextRun({ text: block.content })],
    // ...
  })
```

### Step 6: 验证

- 导入含有该元素的 .docx 文件，检查 DocModel 解析是否正确
- 检查 DocModel -> HTML 序列化是否正确
- 导出为 .docx，用 Word 打开验证格式
- 确认双向转换（导入 -> 编辑 -> 导出）不丢失数据
