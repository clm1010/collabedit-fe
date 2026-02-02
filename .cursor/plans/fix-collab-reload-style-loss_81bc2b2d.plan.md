---
name: fix-collab-reload-style-loss
overview: 修复中间件重启后协同文档为空导致样式丢失的问题，确保重新从 MinIO 的 docx 解析并稳定注入编辑器，同时保留字体/字号/颜色/背景色/标题格式。
todos:
  - id: guard-empty-collab
    content: 强化协同空文档覆盖策略
    status: completed
  - id: preserve-inline-style
    content: 校验/修正解析后的 inline 样式保留
    status: completed
  - id: font-match
    content: 确保标题字体匹配 fontFamilyOptions
    status: completed
  - id: restart-test
    content: 按重启流程回归验证
    status: completed
isProject: false
---

# 中间件重启后样式丢失修复方案

## 目标

- 中间件重启后，协同文档为空时 **强制以 MinIO 的 docx 解析结果为准**。
- 保证解析 HTML 的字体/字号/颜色/背景色/标题样式不会被覆盖或清洗掉。

## 关键路径与现状

- 入口获取文件流并写入 IndexedDB：
  - `[e:\job-project\collabedit-fe\src\views\training\performance\index.vue](e:\job-project\collabedit-fe\src\views\training\performance\index.vue)` `handleEdit()`
- 加载与注入：
  - `[e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue)` `onMounted()` → `parseFileContent()` → `applyPreloadedContent()` → `setContentSafely()`
- 解析器：
  - `[e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)` `parseOoxmlDocumentEnhanced()` / `convertInlineStylesToTiptap()`

## 实施步骤

1. **强化“协同空文档”判定与覆盖策略**

- 在 `TiptapCollaborativeEditor.vue` 中完善当前内容检测：如果协同同步后内容缺失样式/仅纯文本，则强制覆盖为解析后的 HTML。
- 保留现有 `hasStyleHints`，增加对标题/mark/颜色的判定，避免协同空内容覆盖。

2. **确保解析输出不被清洗**

- 在 `wordParser.ts` 中核对 `convertInlineStylesToTiptap()` 的清洗规则（尤其是 div→p、标题 font-size、color/background-color）确保不会丢掉样式。
- 对 “标题字体/字号/颜色/背景色” 明确保留 inline style。

3. **字体与标题的关联稳定性**

- 检查 `StartToolbar.vue` 的 `normalizeFontFamilyValue` 是否在 `fontFamilyOptions` 中正确匹配标题字体（避免回退字体抢占）。
- 若需要，补齐 alias 映射和主字体优先级。

4. **复测路径与日志**

- 按你给的复现流程重启中间件并进入编辑器，确认样式完整。
- 重点验证：标题字体、字号、颜色/背景色、正文段落字体。

## 测试清单

- 停止中间件 → 重启 `pnpm start:dev` → 进入编辑器
- 对比 `fix1.jpg` 与 `fix2.jpg` 差异是否消失
- 验证工具栏字体是否正确联动到 `fontFamilyOptions`

## 涉及文件

- `[e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue)`
- `[e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ts)`
- `[e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\StartToolbar.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\StartToolbar.vue)`
