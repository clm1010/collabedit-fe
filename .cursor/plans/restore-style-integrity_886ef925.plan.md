---
name: restore-style-integrity
overview: 调整 IndexedDB 缓存过期为 20 分钟，并逐项对照 minIO 文档与编辑器显示，修复字体/字号/颜色/标题样式不一致的问题。
todos:
  - id: cache-ttl-20m
    content: 将 IndexedDB 缓存过期改为 20 分钟
    status: completed
  - id: style-compare
    content: 对照 minIO-2 与 docx 标注不一致项
    status: completed
  - id: style-fix
    content: 修复解析与工具栏映射导致的不一致
    status: completed
  - id: regression
    content: 重启流程回归并核对样式联动
    status: completed
isProject: false
---

## 目标

- 将 IndexedDB 文档缓存过期时间从 1 小时调整为 20 分钟，避免旧缓存影响样式一致性。
- 以 `minIO-2.jpg` 和本地 `ade719c0-56ce-4b15-826b-d5860d1a5a7a.docx` 为基准，逐块验证并修复编辑器中的字体、字号、颜色、标题格式。

## 关键文件

- [e:\job-project\collabedit-fe\src\views\utils\docStorage.ts](e:\job-project\collabedit-fe\src\views\utils\docStorage.ts)
- [e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue)
- [e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\StartToolbar.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\StartToolbar.vue)
- [e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\types.ts](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\types.ts)
- [e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ooxml.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.ooxml.ts)
- [e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.postprocess.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.postprocess.ts)

## 执行步骤

1. **缓存过期调整**

- 在 `docStorage.ts` 中将 `expireTime` 从 1 小时改为 20 分钟，保持仅过期则返回 `null` 的逻辑不变。

1. **样式完整性对照与定位**

- 使用 `minIO-2.jpg` 与本地 docx 逐块对照编辑器表现，记录不一致项（字体、字号、颜色、标题级别）。
- 对照编辑器内容的实际 DOM 样式与 Tiptap 属性，判断是解析输出缺失还是工具栏显示/应用偏差。

1. **解析与映射修复**

- 若是解析缺失：在 `wordParser.ooxml.ts` / `wordParser.postprocess.ts` 补齐字体、字号、颜色、标题相关的提取与 HTML 内联样式输出。
- 若是工具栏匹配问题：在 `StartToolbar.vue` 的 normalize 逻辑与 `types.ts` 选项中修正映射规则。

1. **回归验证**

- 走“停止中间件→重启→进入编辑器”流程；确保内容与样式完整呈现。
- 在编辑器中选中不同区域，确认字体/字号/颜色/标题均与 Word 文档一致且工具栏联动正确。

## 备注

- minIO 本地地址为 `http://127.0.0.1:9001/...`，外部抓取不可用，将以本地 docx 与截图为准。
