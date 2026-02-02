---
name: fix-highlight-loss
overview: 定位 getFileStream 解析链路中背景色未落到 HTML 的原因，并补齐 Word 高亮/底纹映射，必要时在渲染前做兜底转换，确保字体背景色恢复。
todos:
  - id: trace-parse-branch
    content: 确认 getFileStream 实际解析分支与输出
    status: completed
  - id: fix-docx-preview-highlight
    content: 补齐 docx-preview 高亮到 inline 的映射
    status: completed
  - id: fix-ooxml-highlight
    content: 增强 OOXML w:highlight/w:shd 解析
    status: completed
  - id: postprocess-mark-wrap
    content: 完善 postprocess 背景色转 mark 规则
    status: completed
  - id: verify-highlight
    content: 按 getFileStream 流程回归验证
    status: completed
isProject: false
---

# 修复背景色丢失

## 结论要点

- 你提供的 DOM 片段中没有任何 `background-color` 或 `<mark>` 标记，这说明问题发生在解析链路（输出 HTML 未携带高亮信息），而不是 ColorPicker 面板本身。
- 按你的确认，采用“解析优先 + 编辑器兜底”的方案。

## 变更范围（计划）

- 解析链路：
  - `[e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.pipeline.ts](e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.pipeline.ts)`
  - `[e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.preview.ts](e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.preview.ts)`
  - `[e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.ooxml.ts](e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.ooxml.ts)`
  - `[e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.postprocess.ts](e:/job-project/collabedit-fe/src/views/training/document/utils/wordParser.postprocess.ts)`
- 兜底转换（如解析仍缺失）：
  - `[e:/job-project/collabedit-fe/src/views/training/document/components/TiptapEditor.vue](e:/job-project/collabedit-fe/src/views/training/document/components/TiptapEditor.vue)` 或解析后的 HTML 回填点（确认后执行）。

## 具体步骤

1. **确认 getFileStream 实际走的解析分支**

- 追踪 `parseFileContent` 与 `smartParseDocument` 的分支选择，确定当前文件是否走 `parseOoxmlDocumentEnhanced`、`mammoth` 或 `docx-preview`。
- 输出入口/分支日志（仅开发态）以定位背景色丢失发生的解析器。

1. **补齐 docx-preview 输出的背景色映射**

- 检查 `postProcessDocxPreviewHtml` 中 `convertInlineStylesToTiptap` 前后的 HTML 是否包含 `mso-highlight`、`mso-shading`、`background` 或 `background-color`。
- 若 docx-preview 通过样式类标记高亮（非 inline），增加对相关 class 的识别与转化为 `background-color` 的逻辑。

1. **强化 OOXML 路径的高亮映射**

- 在 `wordParser.ooxml.ts` 中增强 `w:highlight`/`w:shd` 的解析：
  - 过滤 `none/auto/transparent` 等无效值。
  - 补齐 `white` 等可能输出的颜色名 → hex 映射。
  - 确保 run/pPr 级别背景色最终落在 `style` 中并进入 HTML。

1. **补齐后处理规则**

- 在 `convertInlineStylesToTiptap` 中扩展背景色转换：
  - 覆盖 `span/font/p` 的 `background-color` 转 `mark`。
  - 覆盖 `mso-highlight`、`mso-shading`、`background` 的别名场景。

1. **兜底策略（仅在解析仍缺失时启用）**

- 在编辑器渲染入口处，对 HTML 做一次快速扫描：
  - 如果存在 `background-color` 但未被 `mark` 包裹，统一包裹为 `<mark data-color>`。
  - 该步骤只作用于加载内容，不影响用户手工编辑。

1. **回归验证**

- 按你给出的 `getFileStream` 复现流程重新导入。
- 检查：
  - 页面背景色高亮是否出现。
  - ColorPicker 自定义面板 RGB/HSL/HEX 是否回填。

## 参考 DOM 片段（已收到）

- 目前 `<h1>` 内 `span` 均无 `background-color`，说明高亮未进入 HTML，这将作为排查基线。
