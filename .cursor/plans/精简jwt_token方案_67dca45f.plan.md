---
name: 精简JWT Token方案
overview: 通过精简 Node 后端 JWT payload 来缩短 token 长度。只改动后端 1-2 个文件，前端和 Java 后端完全不受影响。
todos:
  - id: step1-remove-jti
    content: 'auth.service.ts: 移除 payload 中的 jti (randomUUID)，保留 import'
    status: completed
  - id: step2-shorten-names
    content: 'auth.service.ts: 将 payload 字段名改为短名 (uid/un/tid)；auth.ts: 在 jwt.verify 后添加字段名映射逻辑（2 处）'
    status: completed
isProject: false
---

# A 方案：精简 Node 后端 JWT Payload 缩短 Token

## 背景

- **生产环境**：前端只连 Java 后端，Java 使用 `IdUtil.fastSimpleUUID()` 生成 32 位不透明 token
- **开发环境**：前端连 Node 后端，Node 使用 `jwt.sign()` 生成 ~250-350 位 JWT token
- **前端**：完全不关心 token 格式，只做存储/发送/刷新，无需任何改动

## 当前 JWT Payload 分析

[auth.service.ts](e:\job-project\collabedit-node-backend\src\services\auth.service.ts) 第 20-26 行：

```javascript
const jti = randomUUID() // "550e8400-e29b-41d4-a716-446655440000" (36 字符)
const payload = { userId, username, tenantId, jti }
//               ~1-4位   ~5-20位   ~1-4位    36位
// + jwt 自动添加 iat(10位) + exp(10位)
```

Base64 编码后的 token 组成（约 250-350 字符）：

- Header `{"alg":"HS256","typ":"JWT"}` --> ~36 字符（固定）
- Payload --> ~130-180 字符（可优化）
- Signature --> ~43 字符（固定）

## 优化措施（分两步，可选执行）

### 第 1 步：移除 `jti`（节省 ~50 字符）-- 推荐

**改动原因**：`jti` 是完整 UUID (36字符)，仅用于"确保唯一"，但实际上：

- accessToken 是无状态验证（签名校验），`iat` + `exp` + 内容不同已保证唯一
- refreshToken 存 DB，DB 的 `token` 字段 unique 约束已保证唯一
- `jti` 在整个代码库中没有任何地方被读取或校验

**只改 1 个文件**：[src/services/auth.service.ts](e:\job-project\collabedit-node-backend\src\services\auth.service.ts)

改动内容：

```javascript
// 改前（第 21-22 行）
const jti = randomUUID()
const payload = { userId, username, tenantId, jti }

// 改后
const payload = { userId, username, tenantId }
```

注意：`randomUUID` 的 import 不能删除，因为第 32 行 `id: randomUUID()` 还在用。

**效果**：token 从 ~300 字符缩短到 ~250 字符

### 第 2 步：缩短 payload 字段名（再节省 ~20 字符）-- 可选

**改动原因**：`userId`/`username`/`tenantId` 这些长字段名会被 base64 编码进 token。

**改 2 个文件**：

**(1)** [src/services/auth.service.ts](e:\job-project\collabedit-node-backend\src\services\auth.service.ts) -- token 签发

```javascript
// 改前
const payload = { userId, username, tenantId }

// 改后：JWT 内部使用短字段名
const payload = { uid: userId, un: username, tid: tenantId }
```

**(2)** [src/middleware/auth.ts](e:\job-project\collabedit-node-backend\src\middleware\auth.ts) -- token 解析还原

`AuthPayload` 类型定义不变，在 `jwt.verify` 之后做字段名映射：

```typescript
// 改前（第 22 行）
req.auth = jwt.verify(auth.replace('Bearer ', ''), env.jwtSecret) as AuthPayload

// 改后：将短字段名映射回标准 AuthPayload
const decoded = jwt.verify(auth.replace('Bearer ', ''), env.jwtSecret) as any
req.auth = { userId: decoded.uid, username: decoded.un, tenantId: decoded.tid }
```

同样的映射需要在第 44-45 行的正常验证逻辑中也做：

```typescript
// 改前（第 45 行）
const payload = jwt.verify(token, env.jwtSecret) as AuthPayload

// 改后
const decoded = jwt.verify(token, env.jwtSecret) as any
const payload: AuthPayload = { userId: decoded.uid, username: decoded.un, tenantId: decoded.tid }
```

**效果**：token 再缩短 ~20 字符，总计从 ~300 缩短到 ~230 字符

## 影响范围全面核查

### 不需要改动的文件（已逐一确认）

- **前端** `collabedit-fe` -- 完全不受影响，token 对前端是不透明字符串
- **Java 后端** -- 完全不受影响，生产环境不用 Node 后端
- **collaborative-middleware** -- 无任何 auth/token 代码
- [src/types/express.d.ts](e:\job-project\collabedit-node-backend\src\types\express.d.ts) -- `AuthPayload` 类型不变，下游代码无感知
- [src/routes/auth.ts](e:\job-project\collabedit-node-backend\src\routes\auth.ts) -- 使用 `req.auth.userId`/`req.auth.username`，由中间件映射后无变化
- [src/routes/system/user.ts](e:\job-project\collabedit-node-backend\src\routes\system\user.ts) -- 只使用 `req.auth.userId`，不受影响
- [src/config/env.ts](e:\job-project\collabedit-node-backend\src\config\env.ts) -- JWT secret/expiry 配置不变
- [prisma/schema.prisma](e:\job-project\collabedit-node-backend\prisma\schema.prisma) -- RefreshToken 表结构不变
- [src/services/file.service.ts](e:\job-project\collabedit-node-backend\src\services\file.service.ts) -- 使用 `randomUUID` 做文件 ID，与 JWT 无关

### `req.auth` 字段使用全表

| 文件 | 使用的字段 | 是否受影响 |
| --- | --- | --- |
| middleware/auth.ts (authGuard) | 设置 `req.auth` | 第 2 步需映射 |
| middleware/auth.ts (roleGuard) | `req.auth.userId` | 不受影响 |
| middleware/auth.ts (requirePermission) | `req.auth.userId` | 不受影响 |
| routes/auth.ts (get-permission-info) | `req.auth.userId` | 不受影响 |
| routes/auth.ts (user/info) | `req.auth.userId`, `req.auth.username` | 不受影响(中间件已映射) |
| routes/auth.ts (sjrh/permission/getPermission) | `req.auth.userId`, `req.auth.username` | 不受影响(中间件已映射) |
| routes/system/user.ts (profile) | `req.auth.userId` | 不受影响 |

## 注意事项

- 改动后，已登录用户的旧 token 会因 payload 结构变化导致中间件解析出 `undefined` 字段。建议**改完后清除浏览器 localStorage 重新登录**。
- 第 1 步和第 2 步可独立执行。如果只想最小改动，只做第 1 步即可。
