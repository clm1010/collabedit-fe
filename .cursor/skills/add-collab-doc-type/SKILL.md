---
name: add-collab-doc-type
description: 新增协同编辑文档类型的完整工作流，涉及中间件 NestJS 模块创建和前端 WebSocket 连接集成。当需要新增一种支持实时协同编辑的文档类型时使用。涉及 collaborative-middleware 和 collabedit-fe 两个仓库。
---

# 新增协同文档类型

## 中间件部分（collaborative-middleware）

### Step 1: 创建 Gateway — `src/{type}-collaboration/{type}-collaboration.gateway.ts`

从现有 `collaboration.gateway.ts` 复制（两个 Gateway 逻辑高度相似），修改：
- `@WebSocketGateway({ path: '/{type}' })` — 新的 WebSocket path
- `private persistence = new LeveldbPersistence('./yjs-data/{type}')` — 新的存储路径
- `private logger = new Logger('{Type}CollaborationGateway')` — 新的日志前缀
- URL 解析中的 path 匹配

Gateway 需实现：
- `OnGatewayConnection`：解析 docId 和用户信息，初始化 Y.Doc
- `OnGatewayDisconnect`：清理连接，启动空闲计时器
- `OnModuleDestroy`：清理所有文档和连接

### Step 2: 创建 Module — `src/{type}-collaboration/{type}-collaboration.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { TypeCollaborationGateway } from './{type}-collaboration.gateway'

@Module({
  providers: [TypeCollaborationGateway],
})
export class TypeCollaborationModule {}
```

### Step 3: 注册 — `src/app.module.ts`

在 `imports` 数组中添加新模块。

## 前端部分（collabedit-fe）

### Step 4: WebSocket 连接

建立到新 path 的 WebSocket 连接：

```typescript
const wsUrl = `${VITE_WS_URL}/{type}/${docId}?userId=${user.id}&userName=${encodeURIComponent(user.name)}&userColor=${user.color}&deviceId=${deviceId}&tabId=${tabId}`
const provider = new WebsocketProvider(wsUrl, docId, ydoc)
```

### Step 5: 编辑器集成

在编辑器组件中集成 Y.js Provider：
- `Collaboration.configure({ document: ydoc, field: 'default' })`
- `CollaborationCursor.configure({ provider })`

### Step 6: 验证

- 多浏览器标签页打开同一文档，验证实时同步
- 关闭所有标签页，等待 2 分钟后重新打开，验证 LevelDB 持久化
- 检查 Awareness（光标、用户信息）正常显示
