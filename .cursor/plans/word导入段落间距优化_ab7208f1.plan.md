---
name: Word导入样式优化
overview: 修复 Word 文档导入后段落间距过大和字体缺失的问题，通过优化 CSS 样式和增强 Word 解析器来还原原始文档的排版效果。
todos:
  - id: css-fix
    content: 修改 TiptapEditor.vue 中的 CSS 段落间距样式
    status: completed
  - id: font-fix
    content: 添加编辑器基础字体和字体回退机制
    status: completed
  - id: parser-enhance
    content: 增强 wordParser.ts 以解析和保留 Word 原始段落间距
    status: completed
  - id: font-fallback
    content: 在 wordParser.ts 中为中文字体添加回退链
    status: completed
isProject: false
---

# Word 文档导入样式优化方案

## 问题诊断

从图片对比分析，问题表现为：

- Word 中：标题和正文紧凑排列，使用"方正小标宋"等中文字体
- 编辑器中：每个段落之间有明显的额外间距，字体显示为系统默认字体

根本原因有三个：

### 1. CSS 段落间距过大

[TiptapEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue) 第 1143-1145 行：

```css
> * + * {
  margin-top: 0.75em;
}
```

这给每个相邻元素都添加了 0.75em 的顶部边距。

### 2. Word 段落解析未保留原始段落间距

[wordParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts) 中，每个 Word 段落都转换为独立 `<p>` 标签，但未考虑原始文档的段落间距设置。

### 3. 字体缺失问题（新发现）

**问题 A：编辑器没有设置基础字体**

- `.tiptap` 类没有设置 `font-family`
- 编辑器内容继承浏览器默认字体，而非中文友好的字体

**问题 B：字体解析缺少回退机制**

- wordParser.ts 第 895-900 行直接使用 Word 字体名称
- 如 `font-family: "方正小标宋"` 在用户系统没有该字体时会回退到默认字体
- 缺少字体回退链（如 `"方正小标宋", "SimSun", "宋体", serif`）

**从图片对比：**

- Word (wd-1.jpg)：字体为"方正小标宋"，字号 14.5
- 编辑器 (wd-2.jpg)：字体明显不同，是系统默认无衬线字体

## 解决方案

### 方案 A：CSS 样式优化（推荐首选）

1. **降低默认段落间距**

- 将 `> * + *` 的 `margin-top` 从 `0.75em` 改为 `0`
- 依靠 `line-height: 1.75` 来控制行间距
- 只为标题等特定元素保留合适的上边距

1. **为段落添加适当的行高和间距控制**

- 段落 `p` 保持 `line-height: 1.75`
- 段落间使用更小的 `margin-bottom: 0.5em` 或 `0.25em`

1. **添加编辑器基础字体（字体修复）**

- 在 `.tiptap` 类中添加 `font-family` 声明
- 使用中文友好的字体栈：`"SimSun", "宋体", "Microsoft YaHei", "微软雅黑", serif`

### 方案 B：Word 解析器增强（可选配合使用）

1. **保留 Word 原始段落间距**

- 在 `convertParagraphEnhanced` 函数中提取 `<w:spacing>` 的 `@_w:after` 和 `@_w:before` 属性
- 转换为对应的 CSS `margin-top` 和 `margin-bottom`

1. **智能段落合并**（适用于纯文本短行）

- 检测连续的短段落（如每行只有几个字）
- 可选择性地将它们合并，用 `<br>` 分隔

### 方案 C：字体回退机制（字体修复）

1. **在 wordParser.ts 中添加字体映射和回退**

- 创建常用中文字体映射表
- 为每个解析出的字体添加回退链

1. **字体映射示例**：

```javascript
const fontFallbackMap = {
  方正小标宋: '"方正小标宋", "FangSong", "仿宋", "SimSun", "宋体", serif',
  宋体: '"SimSun", "宋体", "STSong", serif',
  黑体: '"SimHei", "黑体", "Microsoft YaHei", sans-serif',
  楷体: '"KaiTi", "楷体", "STKaiti", serif',
  仿宋: '"FangSong", "仿宋", "STFangsong", serif'
}
```

## 推荐实施步骤

1. **修改 TiptapEditor.vue 样式**（段落间距 + 字体）

- 移除 `> * + *` 的通用间距规则
- 为 `p` 标签设置合适的 `margin-bottom`
- 保留标题 `h1-h6` 的间距设置
- **为 `.tiptap` 添加基础字体声明**

1. **增强 wordParser.ts 字体处理**（字体回退）

- 创建中文字体映射和回退表
- 修改 `convertRunToHtml` 和 `convertRunEnhanced` 函数
- 为解析出的字体添加回退链

1. **增强 wordParser.ts 段落处理**（可选优化）

- 在 `convertParagraphEnhanced` 中解析 Word 段落间距
- 将 Word 的 `w:spacing` 转换为 CSS margin

## 关键代码修改位置

- [TiptapEditor.vue 第 1139-1162 行](e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue)：CSS 样式（段落间距 + 基础字体）
- [wordParser.ts 第 895-900 行](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)：`convertRunToHtml` 字体处理
- [wordParser.ts 第 2944-2951 行](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)：`convertRunEnhanced` 字体处理
- [wordParser.ts 第 2783-2922 行](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)：`convertParagraphEnhanced` 函数

## 预期效果

修改后，导入的 Word 文档将：

- 保持与原文档相似的紧凑排版
- 段落之间使用适当的间距而非过大的空白
- 标题和正文的层级关系仍然清晰可辨
- **字体显示更接近原始 Word 文档**（使用中文友好的字体栈）
- **即使原字体不存在，也能优雅回退到相似字体**

## 备选方案（免费）

Tiptap 官方的 Conversion 服务是付费的，但我们可以：

1. 继续使用现有的 mammoth + 自定义 OOXML 解析器
2. 优化 CSS 样式来适配解析结果
3. 增强解析器以提取更多样式信息
4. **添加字体回退机制确保字体显示正确**

这些都是免费的解决方案，无需使用 Tiptap 的付费转换服务。

## 两个文档的区别分析

根据分析，"海油工作安排(活动)通知-已调优.docx" 和 "联合指挥作战方案" 可能的区别：

1. **段落结构**：前者每行可能都是独立段落（Enter 换行），后者可能使用更合理的段落结构
2. **字体设置**：两者可能使用不同的字体（如"方正小标宋" vs "宋体"）
3. **段落间距设置**：Word 中的 `w:spacing` 属性值可能不同

这些差异导致在当前解析器下，"海油工作安排" 文档显示效果与 Word 中差异更大。
