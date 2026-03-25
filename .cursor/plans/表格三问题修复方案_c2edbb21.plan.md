---
name: 表格三问题修复方案
overview: 修复编辑器表格保存后的三类问题：(1) 语义标签样式丢失/异变 (2) 列宽不一致且行高不支持 (3) 单元格背景色面板替换为完整 ColorPicker。
todos:
  - id: fix-semantic-tags
    content: htmlParser.ts collectRuns 添加语义标签识别（strong/em/b/i/u/s/del/sub/sup）
    status: completed
  - id: fix-blockquote-italic
    content: docModelToDocx.ts buildBlockquote 去掉 italic ?? true 默认值，改为保留原始值
    status: completed
  - id: fix-colwidths-filter
    content: htmlParser.ts parseTable 移除 colWidths 的 .filter()，用 0 填补无宽度列
    status: completed
  - id: add-row-height
    content: 五文件同步添加行高支持：types/htmlParser/serializer/docModelToDocx(buildTable + buildEndnoteTableXml)
    status: completed
  - id: replace-color-panel
    content: TableToolbar + TableBubbleMenu 的简单色块替换为 ColorPicker 组件
    status: completed
isProject: false
---

# 表格保存后样式/列宽/背景色三问题修复

## 问题 1：表格字体样式异变（斜体被增加/丢失）

### 根因

`[htmlParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts)` 的 `collectRuns` 函数（第 145-217 行）**不识别语义 HTML 标签**，只从 `style` 属性提取样式：

```145:205:e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts
const collectRuns = (node: Node, inheritedStyle?: RunStyle): DocRun[] => {
  // ... 只调用 parseRunStyle(element) 读内联 style ...
  // 没有对 <strong>/<em>/<b>/<i>/<u>/<s>/<del> 做处理
}
```

Tiptap 编辑器使用语义标签输出格式：`<strong>` = 粗体、`<em>` = 斜体、`<u>` = 下划线、`<s>` = 删除线。这些标签没有 `style` 属性，所以 `parseRunStyle` 返回空，导致保存时**粗体/斜体/下划线/删除线全部丢失**。

粗体丢失后，某些中文字体在 Word 中的渲染会发生视觉变化（笔画变细、字形变窄），可能被感知为"增加了斜体"。

此外，`[docModelToDocx.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docModelToDocx.ts)` 第 351 行 `buildBlockquote` 有个默认斜体问题：

```351:351:e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docModelToDocx.ts
          italic: run.style?.italic ?? true,
```

如果表格单元格内含 blockquote 内容，即使原文不是斜体也会被强制设为斜体。

### 修复方案

**修改文件**：`[htmlParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts)`

在 `collectRuns` 函数中（第 202-204 行的 `else` 分支之前），添加对语义标签的识别逻辑：

```typescript
const tag = element.tagName.toLowerCase()
const semanticStyle: RunStyle = {}
if (tag === 'strong' || tag === 'b') semanticStyle.bold = true
if (tag === 'em' || tag === 'i') semanticStyle.italic = true
if (tag === 'u') semanticStyle.underline = true
if (tag === 's' || tag === 'del') semanticStyle.strike = true
if (tag === 'sub') semanticStyle.subscript = true
if (
  tag === 'sup' &&
  !element.getAttribute('data-docx-footnote') &&
  !element.getAttribute('data-docx-endnote') &&
  !element.getAttribute('data-footnote-id') &&
  !element.getAttribute('data-endnote-id')
) {
  semanticStyle.superscript = true
}
```

然后把语义样式合并到 `currentStyle`（在 `parseRunStyle` 之后）。

---

## 问题 2：表格列宽不一致 + 行高不支持

### 根因（列宽）

`[htmlParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts)` `parseTable` 中第 414 行的 `.filter()` 会移除没有解析出宽度的列，导致 `colWidths` 数组长度可能小于实际列数：

```414:414:e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts
        .filter((value): value is number => typeof value === 'number')
```

假设 4 列中第 3 列无宽度 -> `colWidths = [100, 150, 250]`（只有 3 个元素）-> `buildTable` 中 `slice(colIndex, ...)` 索引错位，后续列宽全部不对。

### 修复方案（列宽）

**修改文件**：`[htmlParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts)`

将 `.filter(...)` 改为保持数组长度，用 0 填补无宽度的列：

```typescript
.map((col) => {
  const colStyle = col.getAttribute('style') || ''
  const colMap = colStyle ? extractStyleMap(colStyle) : {}
  const width = parsePxValue(col.getAttribute('width') || undefined)
  return width || parsePxValue(colMap['min-width']) || parsePxValue(colMap['width']) || 0
})
```

`buildTable` 中已有 `cellWidth ? ... : undefined` 的 truthy 检查，`0` 值会自动跳过，不会设置 0 宽度。

### 根因（行高）

行高在整条链路中**完全未支持**：

- `[types.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\types.ts)` `DocTableRow` 无 `height` 字段
- `htmlParser.ts` `parseTable` 不读 `<tr>` 的 `height` 样式
- `serializer.ts` 不输出行高
- `docModelToDocx.ts` `buildTable` 的 `new TableRow(...)` 不设行高

### 修复方案（行高）

需同步修改 4 个文件（5 处）：

1. `**[types.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\types.ts)`：`DocTableRow` 添加 `height?: number`
2. `**[htmlParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts)`：`parseTable` 中读取 `<tr>` 的 `height` 样式
3. `**[serializer.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\serializer.ts)`：序列化时输出 `<tr style="height: Xpx">`
4. `**[docModelToDocx.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docModelToDocx.ts)` `buildTable`：`new TableRow({ height: { value: pxToTwip(row.height), rule: HeightRule.ATLEAST }, children: cells })`（需在 import 中添加 `HeightRule`）
5. `**[docModelToDocx.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docModelToDocx.ts)` `buildEndnoteTableXml`（第 950 行）：XML 方式的表格行也需输出行高，在 `<w:tr>` 中添加 `<w:trPr><w:trHeight w:val="..." w:hRule="atLeast"/></w:trPr>`

---

## 问题 3：单元格背景色面板替换为 ColorPicker

### 现状

- `[TableToolbar.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\TableToolbar.vue)` 第 71-100 行：手写 `el-popover` + `cellColors` 简单色块网格
- `[TableBubbleMenu.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\TableBubbleMenu.vue)` 第 31-51 行：同样的简单色块网格
- 字体背景色使用的 `[ColorPicker.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\ColorPicker.vue)`：完整组件，含默认色 + 标准色 + HSL 高级取色 + HEX/RGB/HSL 多模式输入

### 修复方案

**修改文件**：

1. `**[TableToolbar.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\TableToolbar.vue)`：将第 71-100 行的 `el-popover` + 手写色块替换为 `ColorPicker` 组件：

```html
<ColorPicker
  v-model="currentCellBg"
  icon="mdi:format-color-fill"
  title="背景颜色"
  @change="setCellBackground"
/>
```

需导入 `ColorPicker`，移除不再使用的 `cellColors` 常量。

1. `**[TableBubbleMenu.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\TableBubbleMenu.vue)**`：同样替换第 31-51 行，需适配气泡菜单的紧凑尺寸（可能需要对 `ColorPicker` 的按钮样式做 `:deep()` 覆盖，或给 `ColorPicker` 加一个可选的 `compact` prop）。
