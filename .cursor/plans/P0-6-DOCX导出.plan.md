# P0-6: Markdown编辑器DOCX导出

> **优先级**: P0 | **预估工期**: 7天 | **前置依赖**: P0-0, P0-2

## 目标

为模板编辑器新增 Word(.docx) 导出能力。GJB 438C 文档必须以 .docx 格式提交。

## 现有可复用

- 演训编辑器已有 DOCX 导出：`src/views/training/document/utils/wordParser` 中的 `docModelToDocx` 等
- 项目已有 `docx` npm 依赖
- [documentExport.ts](e:/job-project/collabedit-fe/src/views/utils/documentExport.ts)：HTML 导出逻辑

## 实现步骤

### Step 1: 提取共享导出核心逻辑

新增 `src/shared/utils/htmlToDocx.ts`：
- 从演训编辑器的 word 导出逻辑中提取可复用的 HTML→docx 转换核心
- 主要函数：
  - `htmlToDocxDocument(html, options)`: HTML → docx Document 对象
  - `parseHtmlToDocxElements(html)`: HTML DOM → docx Paragraph/Table/Image 数组
  - `createDocxFromEditor(editor, ydoc, options)`: 从 Tiptap editor 实例直接导出

### Step 2: 模板编辑器专用导出

新增 `src/views/template/editor/utils/wordExport.ts`：

```typescript
import { Document, Packer, Paragraph, TextRun, Table, Header, Footer, PageNumber, NumberOfPages } from 'docx'
import { htmlToDocxDocument } from '@/shared/utils/htmlToDocx'

interface GjbExportOptions {
  title: string
  ydoc: Y.Doc            // 读取 documentMeta Y.Map
  includeHeader: boolean
  includeFooter: boolean
  includeWatermark: boolean
}

export async function exportToDocx(editor: Editor, options: GjbExportOptions): Promise<Blob> {
  const html = editor.getHTML()
  const meta = options.ydoc.getMap('documentMeta')
  
  // 构建 docx Document
  const doc = new Document({
    sections: [{
      headers: { default: buildHeader(meta) },
      footers: { default: buildFooter(meta) },
      children: await parseHtmlToDocxElements(html, {
        headingStyles: GJB_HEADING_STYLES,
        bodyFont: 'FangSong',
        bodySize: 28,  // half-points (14pt)
        firstLineIndent: 420, // twips (2em ≈ 420 twips)
      })
    }]
  })
  
  return Packer.toBlob(doc)
}

export async function downloadDocx(editor: Editor, options: GjbExportOptions) {
  const blob = await exportToDocx(editor, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${options.title}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
```

### Step 3: HTML→docx 元素解析

在 `htmlToDocx.ts` 中实现核心解析：
- **标题**：`<h1>`-`<h5>` → docx Paragraph + HeadingLevel + 黑体样式 + 自动编号
- **正文**：`<p>` → docx Paragraph + 仿宋四号 + 首行缩进
- **表格**：`<table>` → docx Table + 断行/标题重复属性
- **图片**：`<img>` → docx ImageRun（下载图片 → base64 → docx 嵌入）
- **列表**：`<ul>/<ol>` → docx Paragraph + numbering
- **代码块**：`<pre>` → docx Paragraph + 等宽字体
- **链接**：`<a>` → docx ExternalHyperlink
- **格式**：bold/italic/underline/strike/color/highlight → docx TextRun 属性

### Step 4: 工具栏集成

修改 [MarkdownEditor.vue](e:/job-project/collabedit-fe/src/views/template/editor/components/MarkdownEditor.vue) 工具栏：

在现有"导出MD"按钮旁添加"导出Word"按钮：
```html
<button class="toolbar-btn toolbar-btn-text" @click="handleExportWord" title="导出为 Word 文档">
  <Icon icon="mdi:file-word" />
  <span class="btn-text">导出Word</span>
</button>
```

```typescript
const handleExportWord = async () => {
  if (!editor.value) return
  await downloadDocx(editor.value, {
    title: props.title || '文档',
    ydoc: props.ydoc,
    includeHeader: true,
    includeFooter: true,
    includeWatermark: false,
  })
  ElMessage.success('Word 文档导出成功')
}
```

### Step 5: 图片处理

导出时图片处理：
1. `src` 为 URL：fetch 下载 → ArrayBuffer → docx ImageRun
2. `src` 为 base64：直接转为 ArrayBuffer → docx ImageRun
3. `src` 为 blob：通过 `data-origin-src` 回退到 base64

## 涉及文件

**新增**：
- `src/shared/utils/htmlToDocx.ts`
- `src/views/template/editor/utils/wordExport.ts`

**修改**：[MarkdownEditor.vue](e:/job-project/collabedit-fe/src/views/template/editor/components/MarkdownEditor.vue)（工具栏 + 导出函数）

## 风险评估

| 风险 | 措施 |
|------|------|
| HTML→docx 转换复杂 | 分步实现，先文本/标题/表格，再图片/列表 |
| 图片下载可能失败 | 使用 try/catch，失败时跳过或插入占位 |
| docx 样式与 GJB 438C 不完全一致 | 逐步调整 font/size/spacing 参数 |

## 验收标准

- [ ] 模板编辑器工具栏有"导出Word"按钮
- [ ] 导出的 .docx 文件可在 WPS/Word 中正常打开
- [ ] 标题自动应用黑体和对应字号
- [ ] 正文自动应用仿宋四号 + 首行缩进
- [ ] 表格、图片、列表正确渲染
- [ ] 页眉页脚正确渲染（如已设置）
