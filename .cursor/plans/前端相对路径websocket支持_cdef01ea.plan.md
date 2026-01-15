---
name: 前端相对路径WebSocket支持
overview: 修改前端 WebSocket 配置代码，支持相对路径自动转换，实现一次构建多环境部署。
todos:
  - id: modify-editor-config
    content: 修改 editorConfig.ts 的 resolveWsUrl 函数，支持相对路径
    status: pending
  - id: modify-markdown-config
    content: 修改 markdownConfig.ts 的 getWsBaseUrl 函数，支持相对路径
    status: pending
  - id: update-env-prod
    content: 更新 .env.prod 配置为相对路径 VITE_WS_URL=/ws
    status: pending
---

# 前端相对路径 WebSocket 支持方案

## 目标

让前端支持 `VITE_WS_URL=/ws` 这种相对路径配置，自动根据当前页面的 `window.location` 构建完整的 WebSocket URL。

## 需要修改的文件

### 1. [src/views/training/document/config/editorConfig.ts](src/views/training/document/config/editorConfig.ts)

修改 `resolveWsUrl` 函数，增加相对路径支持：

```typescript
const resolveWsUrl = () => {
  const envUrl = (import.meta.env.VITE_WS_URL as string | undefined) || 'ws://localhost:3001'

  // 如果是相对路径，根据当前页面 host 动态构建完整 URL
  if (envUrl.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const basePath = envUrl.replace(/\/+$/, '')
    return `${protocol}//${host}${basePath}/collaboration`
  }

  // 兼容完整 URL 格式
  const normalized = envUrl.replace(/\/+$/, '')
  return normalized.endsWith('/collaboration') ? normalized : `${normalized}/collaboration`
}
```

### 2. [src/views/template/editor/config/markdownConfig.ts](src/views/template/editor/config/markdownConfig.ts)

修改 `getWsBaseUrl` 函数，增加相对路径支持：

```typescript
const getWsBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_WS_URL

  // 如果是相对路径，根据当前页面 host 动态构建完整 URL
  if (envUrl?.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}${envUrl.replace(/\/+$/, '')}`
  }

  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
  }
  return 'ws://localhost:3001'
}
```

### 3. 环境变量配置 (.env.prod)

生产环境配置改为相对路径：

```bash
# WebSocket - 使用相对路径，由 Nginx 代理
VITE_WS_URL=/ws
```

## 路径映射关系

- 前端请求 `ws://当前域名/ws/collaboration` → Nginx 代理到 `ws://中间件:3001/collaboration`
- 前端请求 `ws://当前域名/ws/markdown` → Nginx 代理到 `ws://中间件:3001/markdown`

## 兼容性

修改后的代码同时支持：

- 相对路径：`/ws`（生产环境推荐）
- 完整 URL：`ws://192.168.8.104:3001`（开发环境或直连场景）
