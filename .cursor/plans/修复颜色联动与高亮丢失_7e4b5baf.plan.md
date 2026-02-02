---
name: 修复颜色联动与高亮丢失
overview: 修复颜色面板数值未联动与解析后字体背景色仍丢失的问题。
todos:
  - id: fix-color-panel-binding
    content: 修复 ColorPicker 数值联动与空值问题
    status: completed
  - id: fix-highlight-parse
    content: 补齐背景色提取与 mark 转换规则
    status: completed
  - id: verify-color-highlight
    content: 回归验证颜色面板与背景色显示
    status: completed
isProject: false
---

# 修复颜色联动与高亮丢失

- 分析并修复颜色面板空值：
  - 在 `[e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\ColorPicker.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\ColorPicker.vue)` 中，确保打开面板时使用当前颜色初始化 `rgb/hsl/hex`，并在色板/色相拖动时同步输入框值。
  - 补充对 `rgba`/颜色名/短 hex 的标准化，确保 `hexInput` 与 RGB/HSL 始终同步，避免显示空值。
  - 确认 `@input`/`@change` 同步调用路径不被 `v-model` 的延迟刷新覆盖。
- 修复解析后字体背景色丢失：
  - 在 `[e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.postprocess.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.postprocess.ts)` 中扩展背景色提取规则：覆盖 `background`、`mso-highlight`、`shd` 等遗留样式，并确保所有背景色都被转换为 `<mark data-color>`。
  - 校验 `Highlight` 扩展的 HTML 规则是否能识别当前输出格式，如有必要在 `[e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue)` 中补充 `Highlight.configure({ HTMLAttributes/parseHTML })` 来兼容 `mark[data-color]`。
- 回归验证：
  - 打开“演训方案 → 写作”并重新拉取文件流，验证 `font-color6` 场景中标题/正文的背景色是否恢复。
  - 打开颜色面板，选择色板与拖动色相后确认 RGB/HSL/HEX 输入框有数值联动，不再为空。
