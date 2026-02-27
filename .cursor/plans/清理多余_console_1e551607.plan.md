---
name: 清理多余 console
overview: 分析 training 和 template 两个目录下所有文件的 console 调用，删除纯调试用的 console.log，保留 catch 块中的 console.error / console.warn 及有意义的降级/重试警告，共涉及 5 个文件、45 处删除。
todos:
  - id: clean-management-vue
    content: 清理 management/index.vue：删除 26 处 console.log 调试日志
    status: completed
  - id: clean-markdown-editor
    content: 清理 MarkdownCollaborativeEditor.vue：删除 10 处 console.log 调试日志
    status: completed
  - id: clean-postprocess
    content: 清理 wordParser.postprocess.ts：删除 5 处 console.log 字体标题转换调试日志
    status: completed
  - id: clean-mammoth
    content: 清理 wordParser.mammoth.ts：删除 4 处 console.log 解析过程调试日志
    status: completed
  - id: clean-worker
    content: 清理 wordParser.worker.ts：删除 1 处 console.log 回退调试日志
    status: completed
isProject: false
---

# 清理多余 console 调用

## 总览

共 5 个文件需要修改，删除 45 处 `console.log`，无任何 `console.error` / `console.warn` 被删除。

## 保留原则

- **保留** `catch` 块中的 `console.error` / `console.warn`（错误信息记录）
- **保留** 有意义的降级/重试警告（如 Worker 回退、内容设置重试失败）
- **删除** 函数入口调试日志（如 `console.log('写作:', row)`）
- **删除** 过程跟踪日志（如 `console.log('查询参数', cleanParams)`）
- **删除** 临时开发用 log（如带 `-----------` 分隔符的）

---

## 文件 1：`[src/views/template/management/index.vue](e:\job-project\collabedit-fe\src\views\template\management\index.vue)`

删除 **26** 处 `console.log`，保留全部 `console.error`。

删除的 console.log（按行号）：

- 682: `console.log('查询参数', cleanParams)` — 查询参数调试
- 783: `console.log('写作:', row)` — 函数入口调试
- 796: `console.log('协作用户:', ...)` — 协作用户调试
- 799: `console.log('调用权限校验接口, id:', ...)` — 接口调用调试
- 802: `console.log('权限校验结果:', permResult)` — 接口结果调试
- 815: `console.log('调用文件流接口, id:', row.id)` — 接口调用调试
- 817: `console.log('文件流结果:', streamResult, ...)` — 接口结果调试
- 838: `console.log('文件流有效, size:', ...)` — 过程跟踪
- 854-859: `console.log('base64 转换完成, ...')` — 过程跟踪（多行）
- 867: `console.log('文件流已存储到 sessionStorage, ...')` — 过程跟踪
- 870: `console.log('空文档，将打开空白编辑器')` — 分支调试
- 928: `console.log(updateData, '-----------updateData-----------')` — 开发临时
- 948: `console.log('上传文档文件:', ...)` — 过程跟踪
- 952: `console.log('上传结果:', uploadResult, ...)` — 接口结果调试
- 960: `console.log('上传成功(解包响应), 文件ID:', fileId)` — 分支调试
- 966: `console.log('上传成功(完整响应), 文件ID:', fileId)` — 分支调试
- 980: `console.log(saveData, '-----------saveData-----------')` — 开发临时
- 985: `console.log(saveData, '-----------saveData-----------')` — 开发临时
- 1115: `console.log('提交审核参数:', submitData)` — 接口参数调试
- 1117: `console.log('提交审核结果:', result)` — 接口结果调试
- 1328: `console.log('发布参数:', ...)` — 接口参数调试
- 1335: `console.log('发布结果:', result)` — 接口结果调试
- 1363: `console.log('审核执行:', row)` — 函数入口调试
- 1425: `console.log('获取审核记录:', row.id)` — 接口调用调试
- 1427: `console.log('获取审核记录结果:', res)` — 接口结果调试

保留（共 9 处 console.error）：688、702、896、996、1059、1136、1182、1253、1298、1354、1410、1431

---

## 文件 2：`[src/views/template/editor/MarkdownCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\template\editor\MarkdownCollaborativeEditor.vue)`

删除 **9** 处 `console.log`，保留全部 `console.error` 和 `console.warn`。

删除的 console.log：

- 288: `console.log('[自动保存] 内容无变化，跳过保存')` — 频繁自动保存调试
- 293: `console.log('[自动保存] 开始保存...')` — 频繁自动保存调试
- 298: `console.log('[自动保存] 保存成功')` — 频繁自动保存调试
- 438: `console.log('协同同步已有内容，跳过初始内容应用...')` — 初始化调试
- 465: `console.log('编辑器已有实质内容...')` — 初始化调试
- 470: `console.log('编辑器为空，应用初始 Markdown 内容...')` — 初始化调试
- 489: `console.log('初始内容应用成功')` — 初始化调试
- 526: `console.log('Markdown 编辑器已就绪')` — 初始化调试
- 572: `console.log('保存文件，文档ID:', ...)` — 过程跟踪
- 606: `console.log('提交审核参数:', data)` — 接口参数调试

保留（3 处 console.error + 3 处 console.warn）：300、397、474、478、492、501、590

---

## 文件 3：`[src/views/training/document/utils/wordParser.postprocess.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.postprocess.ts)`

删除 **5** 处 `console.log`，保留 1 处 `console.warn`。

删除的 console.log（全部为字体标题转换过程的调试日志）：

- 411: `console.log('convertLargeFontParagraphsToHeadings: 已有 X 个标题元素')`
- 417: `console.log('convertLargeFontParagraphsToHeadings: 检查 X 个段落')`
- 434-436: `console.log('段落检测: ...')` — 多行
- 469-471: `console.log('✓ 转换段落为 hX: ...')` — 多行
- 475: `console.log('convertLargeFontParagraphsToHeadings: 共转换 X 个段落')`

保留：482 `console.warn('convertLargeFontParagraphsToHeadings 失败:', e)`

---

## 文件 4：`[src/views/training/document/utils/wordParser.mammoth.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.mammoth.ts)`

删除 **4** 处 `console.log`，保留 1 处 `console.error`。

删除的 console.log：

- 89: `console.log('格式未知，尝试作为 HTML 解析...')` — 解析过程调试
- 100: `console.log('检测到 HTML 格式的 Word 兼容文件')` — 解析过程调试
- 160: `console.log('mammoth 未检测到标题，尝试从大字体段落转换')` — 解析过程调试
- 165: `console.log('Word 文档解析成功，警告信息:', result.messages)` — 解析过程调试

保留：168 `console.error('Word 文档解析失败:', error)`

---

## 文件 5：`[src/views/training/document/utils/wordParser.worker.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\wordParser.worker.ts)`

删除 **1** 处 `console.log`，保留 `console.error` 和 `console.warn`。

删除：

- 27: `console.log('Worker 需要 DOM，回退到主线程:', reason)` — 内部回退调试

保留：36 `console.error`、44 `console.warn`

---

## 不需要修改的文件

以下文件的所有 console 调用均为 catch 块内的 `console.error` / `console.warn`，全部保留：

- `TiptapCollaborativeEditor.vue` — 9 处 console.error（全部在 catch 块）
- `TiptapEditor.vue` — 3 处 console.warn（全部在 catch 块）
- `wordParserWorker.ts` — 8 处 console.warn（全部在 catch 块）
- `wordParser.ooxml.ts` — 20 处（全部在 catch 块或错误分支）
- `wordParser.html.ts` — 1 处 console.warn（catch 块）
- `docModelToDocx.ts` — 1 处 console.warn（catch 块）
