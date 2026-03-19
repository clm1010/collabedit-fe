---
name: create-crud-module
description: 创建全栈 CRUD 模块的完整工作流，包括后端 Prisma 模型、Express 路由/服务、前端 API 封装和页面组件。当需要新增完整的增删改查功能时使用。涉及 collabedit-node-backend 和 collabedit-fe 两个仓库。
---

# 创建全栈 CRUD 模块

## 后端部分（collabedit-node-backend）

### Step 1: Prisma 模型 — `prisma/schema.prisma`

```prisma
model Example {
  id        Int      @id @default(autoincrement())
  name      String
  // ... 业务字段
  status    Int      @default(0) @map("status")
  delFlg    Int      @default(0) @map("del_flg")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("example")
}
```

规则：模型 PascalCase，列 snake_case + `@map`，外键 `{模型}Id` + `@map("{模型}_id")`。

运行 `prisma db push` 同步数据库。

### Step 2: Service — `src/services/{module}.service.ts`

```typescript
import prisma from '../../db/prisma.js'

export const exampleService = {
  async page(query, skip, take) {
    const where = { delFlg: 0 }
    // 构建查询条件...
    const [list, total] = await Promise.all([
      prisma.example.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.example.count({ where })
    ])
    return { list, total }
  },
  async create(data) { /* prisma.example.create */ },
  async update(id, data) { /* prisma.example.update */ },
  async remove(id) { /* 软删除: prisma.example.update({ where: { id }, data: { delFlg: 1 } }) */ },
}
```

### Step 3: 路由 — `src/routes/{module}.ts`

```typescript
import { Router } from 'express'
import { ok, fail } from '../../utils/response.js'
import { exampleService } from '../../services/{module}.service.js'
import { parsePage, pageResult } from '../../utils/pagination.js'

const router = Router()

router.get('/{module}/page', async (req, res) => {
  try {
    const { skip, take } = parsePage(req)
    const result = await exampleService.page(req.query, skip, take)
    return ok(res, pageResult(result.list, result.total))
  } catch (e: any) { return fail(res, e.message) }
})

// POST create, PUT update, DELETE remove...

export default router
```

### Step 4: 注册路由 — `src/main.ts`

在 `apiRouter.use(...)` 中注册新路由。

### Step 5: Seed（可选）— `src/seed.ts`

新增 seed 函数，使用 `upsert` 保证幂等。

## 前端部分（collabedit-fe）

### Step 6: 类型 — `src/types/{module}.ts`

```typescript
export interface ExampleVO {
  id: number
  name: string
  // ...
}
```

遵循 `VO` 后缀规范。

### Step 7: API — `src/api/{module}/index.ts`

```typescript
import { javaRequest } from '@/config/axios/javaService'

export const getExamplePage = (params) => javaRequest.get({ url: '/{module}/page', params })
export const createExample = (data) => javaRequest.post({ url: '/{module}/create', data })
// ...
```

### Step 8: 页面 — `src/views/{module}/index.vue`

使用 `<script setup lang="ts">`，Element Plus 表格组件，`useTable` hook。

### Step 9: 表单组件 — `src/views/{module}/components/`

新增/编辑表单、弹窗组件。

## 可选分支：带文件上传

- 路由加 `multer` 中间件：`upload.single('file')`
- Service 调 `file.service.ts` 的 MinIO 方法
- 前端 API 用 `javaRequest.upload()` 方法
