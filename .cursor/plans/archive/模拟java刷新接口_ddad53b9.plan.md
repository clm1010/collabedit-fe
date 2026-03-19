---
name: 模拟Java刷新接口
overview: 在 Node 后端添加两个模拟 Java 接口路由，配合 `.env.local` 切换到 java 模式，即可本地测试完整的 Java 权限/刷新流程。
todos:
  - id: mock-java-routes
    content: 'Node auth.ts: 添加 /sjrh/permission/refreshToken 和 /sjrh/permission/getPermission 模拟路由'
    status: completed
  - id: switch-backend-type
    content: '.env.local: VITE_BACKEND_TYPE 改为 java'
    status: completed
isProject: false
---

# 本地模拟 Java 刷新接口

## 思路

Node 后端的 `ok()` 返回格式为 `{code: 200, data: ..., msg: '...'}`，与 Java 后端完全一致。只需在 Node `auth.ts` 中添加两个路由，复用现有的 `rotateRefreshToken` 和用户查询逻辑即可。

## 改动

### 1. Node 后端添加模拟路由 ([auth.ts](collabedit-node-backend/src/routes/auth.ts))

在现有路由后面添加两个 Java 风格的路由：

```typescript
// ===== 模拟 Java 接口（本地测试用） =====

// 模拟 Java 刷新 Token 接口
router.post('/sjrh/permission/refreshToken', async (req, res) => {
  const refreshToken = String(req.query.refreshToken ?? '')
  if (!refreshToken) {
    return fail(res, '缺少刷新令牌', 400)
  }
  const tokens = await rotateRefreshToken(refreshToken)
  if (!tokens) {
    return fail(res, '无效的刷新令牌', 401)
  }
  return ok(res, tokens)
})

// 模拟 Java 获取权限接口
router.get('/sjrh/permission/getPermission', authGuard, async (req, res) => {
  // 复用 get-permission-info 的逻辑，返回格式一致
  ...
})
```

`ok(res, tokens)` 返回 `{code:200, data:{accessToken:'...', refreshToken:'...'}}` -- 与 Java 真实接口格式完全匹配。

### 2. 切换前端到 Java 模式 ([.env.local](collabedit-fe/.env.local))

```diff
- VITE_BACKEND_TYPE=node
+ VITE_BACKEND_TYPE=java
```

这样前端的 `refreshToken.ts` 会自动使用 `/sjrh/permission/refreshToken`，`externalUser.ts` 会使用 `/sjrh/permission/getPermission`。

## 测试流程

1. 启动 Node 后端
2. 前端 `VITE_BACKEND_TYPE=java`，启动前端
3. 用带 token 的 URL 访问页面
4. 等 token 过期（或手动清除 accessToken），触发 401
5. 观察控制台是否自动调用 `/api/sjrh/permission/refreshToken` 并成功刷新
