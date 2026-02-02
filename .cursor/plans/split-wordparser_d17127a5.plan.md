---
name: split-wordparser
overview: 将现有 `wordParser.ts` 拆分为清晰的模块（输入处理、解析策略、OOXML 解析、后处理），保持现有导出兼容，并顺手修复已识别的解析/样式链问题。
todos:
  - id: inventory-exports
    content: 梳理 wordParser 导出与引用
    status: completed
  - id: extract-shared
    content: 抽取 shared 工具函数
    status: completed
  - id: split-modules
    content: 拆分解析器与后处理模块
    status: completed
  - id: update-exports
    content: 更新入口 re-export 兼容
    status: completed
  - id: regression-test
    content: 按复现流程回归验证
    status: completed
isProject: false
---

# 拆分 `wordParser.ts` 方案

## 目标

- 拆分单体 `wordParser.ts`，降低耦合与误触发风险。
- 保持对外 API/导出 **完全兼容**，避免影响现有功能。
- 在拆分过程中修复已确认的样式链/解析选择问题（不改后端）。

## 拆分结构（统一在 utils 目录）

所有新增文件统一放在 `[e:\\job-project\\collabedit-fe\\src\\views\\training\\document\\utils](e:\\job-project\\collabedit-fe\\src\\views\\training\\document\\utils)`：\n\n- `wordParser.pipeline.ts`：文件格式识别、解析策略选择（原 `parseFileContent` 相关）\n- `wordParser.ooxml.ts`：OOXML 解析（styles/font/theme/numbering/convertParagraph/convertRun 等）\n- `wordParser.postprocess.ts`：HTML 清洗、样式转换、标题转换（原 `convertInlineStylesToTiptap` 等）\n- `wordParser.preview.ts`：docx-preview 解析\n- `wordParser.mammoth.ts`：mammoth 解析\n- `wordParser.redhead.ts`：红头文件解析\n- `wordParser.shared.ts`：工具函数（formatPx、mergeRPr、resolveFontFromRFonts、hasStyleHintsInHtml 等）

## 兼容策略

- `[e:\\job-project\\collabedit-fe\\src\\views\\training\\document\\utils\\wordParser.ts](e:\\job-project\\collabedit-fe\\src\\views\\training\\document\\utils\\wordParser.ts)` 保留为 **兼容入口**，仅做 re-export。\n- 保持 `[e:\\job-project\\collabedit-fe\\src\\views\\training\\document\\utils\\wordParser\\index.ts](e:\\job-project\\collabedit-fe\\src\\views\\training\\document\\utils\\wordParser\\index.ts)` 同样兼容导出。

## 实施步骤

1. **梳理依赖与导出**

- 列出 `wordParser.ts` 现有导出与被调用位置。
- 确定拆分后每个函数落到哪个模块，保持名称与签名不变。

1. **抽取公共工具**

- 把 `formatPx`、`mergeRPr`、`resolveFontFromRFonts`、`hasStyleHintsInHtml` 等移入 `shared.ts`。

1. **分模块迁移**

- `wordParser.pipeline.ts`：`parseFileContent`、文件格式检测、策略 fallback。\n - `wordParser.ooxml.ts`：`parseOoxmlDocumentEnhanced` + styles/theme/numbering 解析 + `convertParagraph/Run`。\n - `wordParser.postprocess.ts`：`convertInlineStylesToTiptap`、`convertLargeFontParagraphsToHeadings`。\n - `wordParser.preview.ts`、`wordParser.mammoth.ts`、`wordParser.redhead.ts`：各解析器隔离。

1. **更新入口导出**

- `wordParser.ts` 与 `utils/wordParser/index.ts` re-export 新模块，保持对外 API 不变。

1. **回归验证**

- 重点验证 `parseFileContent` 路径与 docx-preview fallback 是否一致。
- 用现有复现步骤检查样式是否仍稳定。

## 影响文件

- `[e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)`
- `[e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser\index.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser\index.ts)`
- 新增：`wordParser.pipeline.ts`, `wordParser.ooxml.ts`, `wordParser.postprocess.ts`, `wordParser.preview.ts`, `wordParser.mammoth.ts`, `wordParser.redhead.ts`, `wordParser.shared.ts`

## 测试建议

- 重新走你现在的“中间件重启后进入编辑器”流程对比 `fix1.jpg` / `fix2.jpg`。
- 验证标题字体、字号、颜色/背景色是否完整恢复。
