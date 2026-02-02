---
name: restore-docx-styles
overview: 定位重新启动后加载样式丢失的链路，并修复解析与注入流程，使从 MinIO 拉取的 DOCX 在编辑器中稳定保留字体/字号/颜色/标题等样式。
todos:
  - id: audit-parse-output
    content: 检查并补全 wordParser 输出的 inline 样式
    status: pending
  - id: verify-injection
    content: 核验 setContentSafely 注入保留 style 属性
    status: pending
  - id: stabilize-cache
    content: 评估并实现 HTML 缓存/优先加载策略
    status: pending
  - id: restart-test
    content: 按重启流程回归测试样式一致性
    status: pending
isProject: false
---

# 还原样式修复方案

## 现状定位

- 加载链路：`getPlan/getFileStream` → base64 → IndexedDB → `parseFileContent` → HTML → `setContentSafely` 注入编辑器。关键位置：
  - `[e:\job-project\collabedit-fe\src\views\training\performance\index.vue](e:\job-project\collabedit-fe\src\views\training\performance\index.vue)` `handleEdit()`
  - `[e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue)` `applyPreloadedContent()` / `setContentSafely()`
  - `[e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)` `parseFileContent()`

## 修复方向

- 强化 `wordParser` 对字体/字号/颜色/标题样式的解析输出，确保 **所有样式都被写入 inline style**（避免仅靠 CSS 类）。
- 确认 `setContentSafely` 注入时是否保留 inline style（例如 `createNodeFromContent` 解析选项），必要时增加规范化/白名单。
- 若仅依赖 DOCX 重新解析存在不稳定，补充 **保存时同时持久化解析后的 HTML**（只读情况下可先验证，最终是否落库需根据后端约束决定）。

## 具体步骤

1. **检查并补全解析输出**：
  - 阅读 `wordParser.ts` 中 run/paragraph/heading 的样式输出，确认 `font-family`、`font-size(px)`、`color`、`bold/italic`、`text-align`、`line-height`、`spacing` 等是否完整；对缺失项补全并统一 `px`。
2. **核验注入链路**：
  - 在 `TiptapCollaborativeEditor.vue` 中核对 `setContentSafely` 是否丢弃 style 属性；必要时调整 `createNodeFromContent` 的 `parseOptions` 或改用 `editor.commands.setContent` 路径验证差异。
3. **缓存与持久化策略**：
  - 若只读入 DOCX 每次都解析导致样式不稳定，评估在 `index.vue` 写作入口中 **解析后 HTML 缓存** 以及在加载时优先使用 HTML（若存在）。
4. **测试复现与回归**：
  - 按你给出的步骤重启三端，重新打开文档，验证与 `save1.jpg` 一致；对标题/正文/颜色/字号逐段比对。

## 计划涉及文件

- `[e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)`
- `[e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue)`
- `[e:\job-project\collabedit-fe\src\views\training\performance\index.vue](e:\job-project\collabedit-fe\src\views\training\performance\index.vue)`
- （可选）`[e:\job-project\collabedit-fe\src\views\utils\docStorage.ts](e:\job-project\collabedit-fe\src\views\utils\docStorage.ts)`

## 测试方式

- 复现：完全停止三端 → 重新启动 → 打开演训方案 → 对比 `save1.jpg` 与加载效果。
- 验证点：标题字体/字号、正文字体/字号、颜色、对齐与标题级别均不丢失。

