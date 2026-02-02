---
name: fix-restart-style-loss
overview: 修复中间件重启后编辑器内容/样式被协同同步覆盖的问题，调整预加载与协同同步的时序与覆盖策略，保证本地解析内容优先且可持久化。
todos:
  - id: analyze-flow
    content: 梳理预加载与Yjs同步时序与覆盖路径
    status: pending
  - id: apply-guard
    content: 调整预加载应用策略与同步回写时机
    status: pending
  - id: cache-validate
    content: 加入缓存时间戳校验与回退规则
    status: pending
  - id: verify-restart
    content: 按复现流程回归验证内容/样式保留
    status: pending
isProject: false
---

- 核心问题定位在“预加载内容”与“Yjs 同步”的竞态：组件挂载先读 IndexedDB 并解析，但随后 initCollaboration 触发同步，可能用空内容覆盖；现有逻辑在 onSynced 时才应用预加载，顺序偏晚。关键位置在 `onMounted` 与 `initCollaboration`。

```923:961:e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue
onMounted(async () => {
  const cachedContent = await getDocContent(documentId.value)
  if (cachedContent) {
    const parsedContent = await parseFileContent(cachedContent)
    preloadedContent.value = parsedContent
    isFirstLoadWithContent.value = true
    tryApplyPreloadedContent()
  }
  loadDocument()
  initCollaboration()
})
```

```304:435:e:\job-project\collabedit-fe\src\lmHooks\useCollaboration.ts
// 初始化 Y.Doc + WebsocketProvider，sync 可能很早触发
provider.value = new WebsocketProvider(wsUrl, currentDocumentId, ydoc.value, { ... })
provider.value.on('sync', handleProviderSync)
if (provider.value.synced && !isReady.value) {
  setTimeout(() => { onSynced?.() }, 50)
}
```

- 方案一（推荐）：在协同同步前完成预加载内容的应用，或在同步回调内优先判断“本地有预加载内容/服务器为空”再决定是否应用；同时避免 `setContentSafely(..., true)` 立即触发协同回写。
- 方案二（保守）：保持同步时序不变，扩大 `applyPreloadedContent` 的强制覆盖条件，并加上“已同步但内容为空/无样式”判定。缺点是仍有竞态风险。
- 若需要防止旧缓存覆盖新内容，引入缓存时间戳/版本校验（`docStorage.ts` 已保存 `timestamp`）。

```39:86:e:\job-project\collabedit-fe\src\views\utils\docStorage.ts
store.put({ key: `doc_content_${docId}`, content, timestamp: Date.now() })
// getDocContent 直接返回 content，未做过期判断
```

- 修复后在协同编辑页执行“停止中间件→重启→刷新页面→内容/样式仍保留”的回归验证，并记录是否仍出现空文档。

