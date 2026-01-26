---
name: Fix Doc Load Order
overview: 定位演训方案写作进入编辑器时文件流解析不显示的问题，梳理前端加载/协同同步/IndexedDB时序，并在前端与协同中间件中加入明确的同步策略，确保 MinIO 文档稳定显示。
todos:
  - id: analyze-fe-seq
    content: 梳理写作入口与IndexedDB写入时序
    status: completed
  - id: sync-gate
    content: 实现协同同步与预加载内容的栅栏
    status: completed
  - id: middleware-sync
    content: 检查并修正中间件空文档同步策略
    status: completed
  - id: verify-minio-doc
    content: 复测指定MinIO文档加载稳定性
    status: completed
isProject: false
---

# Fix Doc Load Order

## 目标与范围

- 覆盖前端解析与加载顺序、IndexedDB缓存使用、协同同步时序，以及协同中间件同步策略。
- 复现场景使用 MinIO 文件 `51af594f-d40d-43c2-b905-8ca9f06644c2.docx`（FileObject id 同名）。

## 现状与问题点（基于现有代码）

- 前端在进入编辑器时并行执行解析与协同初始化，可能发生竞态：解析完成但编辑器/协同未就绪，或协同同步空文档覆盖解析内容。
- IndexedDB 缓存会在解析后立即清理，一旦应用失败难以重试。
- 协同中间件对空文档的同步策略可能导致“空更新”提前完成，触发前端渲染并覆盖预加载内容。

## 计划

1. **前端写作入口流程梳理与时序收敛**

- 检查并整理 `@collabedit-fe/src/views/training/performance/index.vue` 中写作流程：文件流获取、base64 转换、`saveDocContent` 写入成功后再跳转编辑器。
- 若写入未完成即跳转，调整为确保 IndexedDB 写入完成后再进入编辑器。

2. **编辑器预加载与协同同步的统一调度**

- 在 `@collabedit-fe/src/views/training/document/TiptapCollaborativeEditor.vue` 中引入“加载状态机/栅栏”：
- 解析完成（preloadedContent ready）
- 编辑器 ready（handleEditorReady）
- 协同已同步（provider.synced 或 useCollaboration 的 onSynced）
- 只有当以上条件满足时，才执行 `applyPreloadedContent`。
- 将 IndexedDB 清理延后到“内容成功写入编辑器并确认应用”后。

3. **Tiptap 子组件初始化时序检查**

- 在 `@collabedit-fe/src/views/training/document/components/` 下确认 `TiptapEditor.vue` 的 `onCreate` / collaboration 绑定时序，避免 `onCreate` 先于协同同步完成导致内容覆盖。
- 必要时增加一个事件/回调，由父组件在“协同同步完成”后才触发初次 `setContent`。

4. **协同中间件同步策略修正**

- 在 `@collaborative-middleware/src/collaboration/collaboration.gateway.ts` 中验证：
- 新文档同步空更新时是否会导致客户端“空文档覆盖”。
- 如果存在持久化内容，应在首次连接时注入 Y.Doc（或延迟空同步）。
- 为“首次加载带预置内容”场景增加策略：允许客户端优先写入预加载内容或服务端主动返回已持久化内容。

5. **验证与回归**

- 以 `51af594f-d40d-43c2-b905-8ca9f06644c2` 文档复测：
- 进入“写作”后，内容稳定显示。
- 多次刷新/快速切换文档后仍稳定。
- 观察控制台日志无“applyPreloadedContent 跳过/被覆盖”的异常。

## 关键文件

- `@collabedit-fe/src/views/training/performance/index.vue`
- `@collabedit-fe/src/views/training/document/TiptapCollaborativeEditor.vue`
- `@collabedit-fe/src/views/training/document/components/TiptapEditor.vue`
- `@collaborative-middleware/src/collaboration/collaboration.gateway.ts`

## 可选说明（如需）

- 若存在模板 Markdown 端同类问题，可在上述状态机逻辑中复用一套同步栅栏机制。