---
name: saveFile 添加文档分类参数
overview: 同时为演训方案（/getPlan/saveFile）和模板（/tbTemplate/saveFile）的上传文件接口加上 fileType 参数，在上传阶段即写入分类，增强健壮性；模板侧同步为 Template 模型添加 fileType 字段，数据全量重置（prisma db push + seed）。
todos:
  - id: tmpl-schema
    content: 在 prisma/schema.prisma 的 Template 模型中添加 fileType String? 字段，执行 prisma db push 重置数据库
    status: completed
  - id: tmpl-seed
    content: 在 src/seed.ts 的 seedTemplateSamples 中为每条种子数据补充 fileType 字段值
    status: completed
  - id: perf-type-def
    content: 在 src/types/performance.ts 的 UploadDocumentData 接口中添加可选的 fileType 字段
    status: completed
  - id: perf-api-layer
    content: 在 src/api/training/index.ts 的 uploadDocument 方法中，将 fileType 追加到 FormData
    status: completed
  - id: perf-call-site
    content: 在 performance/index.vue 的 handleFormSave 调用 uploadDocument 处传入 fileType
    status: completed
  - id: perf-backend
    content: 在 collabedit-node-backend/src/routes/training.ts 的 /getPlan/saveFile 路由中接收 fileType，有 id 时写入
    status: completed
  - id: tmpl-type-def
    content: 在 src/types/management.ts 的 ImportTemplateData 接口中添加可选的 fileType 字段
    status: completed
  - id: tmpl-api-layer
    content: 在 src/api/template/index.ts 的 saveDocument 方法中，将 fileType 追加到 FormData
    status: completed
  - id: tmpl-call-site
    content: 在 template/management/index.vue 的 handleSave 调用 saveDocument 处传入 fileType（值取 formData.temSubclass）
    status: completed
  - id: tmpl-backend
    content: 在 collabedit-node-backend/src/routes/template.ts 的 /tbTemplate/saveFile 路由中接收 fileType，有 id 时写入
    status: completed
isProject: false
---

# saveFile 接口添加文档分类参数方案（最终版）

## 目标

1. **演训方案**：`/getPlan/saveFile` 同时传入 `fileType`，在上传阶段即写入记录，增强健壮性（当前 `createNewData` 才写入）
2. **模板**：`/tbTemplate/saveFile` 同时传入 `fileType`，`Template` 模型新增 `fileType` 字段；由于数据全部重置，无需迁移脚本，用 `prisma db push` 直接同步

---

## 数据库与 seed 情况说明

- 项目**没有 migrations 目录**，使用 `prisma db push` 直接同步 schema，不走迁移文件
- `Template` 模型当前**无 `fileType` 字段**，需手动添加后执行 `prisma db push --force-reset`（数据全量重置）
- `seed.ts` 中 `seedTemplateSamples` 写入了 3 条样例数据，需同步补充 `fileType` 值

---

## 改动清单

### 一、后端 — 数据库 & seed（模板侧前置）

**1. `prisma/schema.prisma`**（`Template` 模型，第 323-346 行）

在 `temSubclass` 之后添加：

```prisma
fileType      String?  @map("file_type")
```

执行命令：

```bash
npx prisma db push --force-reset
npx tsx src/seed.ts
```

**2. `src/seed.ts`**（第 378-415 行，`seedTemplateSamples`）

为每条样例补充 `fileType`，值与 `temSubclass` 保持一致：

```typescript
{ templateName: '作战命令模板', ..., temSubclass: 'ZZWS', fileType: 'ZZWS', ... },
{ templateName: '演训方案模板', ..., temSubclass: 'YXFA', fileType: 'YXFA', ... },
{ templateName: '发布预览模板', ..., temSubclass: 'ZZJH', fileType: 'ZZJH', ... },
```

---

### 二、后端 — 路由层

**3. `src/routes/training.ts`**（第 143-162 行，`/getPlan/saveFile`）

```typescript
const fileType = req.body?.fileType
// ...
if (id) {
  await prisma.trainingPerformance.update({
    where: { id },
    data: { fileId: record.id, ...(fileType ? { fileType } : {}) }
  })
}
```

**4. `src/routes/template.ts`**（第 123-142 行，`/tbTemplate/saveFile`）

```typescript
const fileType = req.body?.fileType
// ...
if (id) {
  await prisma.template.update({
    where: { id },
    data: { fileId: record.id, ...(fileType ? { fileType } : {}) }
  })
}
```

---

### 三、前端 — 类型定义

**5. `src/types/performance.ts`**（第 134-137 行）

```typescript
export interface UploadDocumentData {
  id?: string
  file: File
  fileType?: string // 新增
}
```

**6. `src/types/management.ts`**（`ImportTemplateData` 接口附近）

```typescript
export interface ImportTemplateData {
  file: File
  fileType?: string // 新增
}
```

---

### 四、前端 — API 封装层

**7. `src/api/training/index.ts`**（第 181-188 行，`uploadDocument`）

```typescript
if (data.fileType) {
  formData.append('fileType', data.fileType)
}
```

**8. `src/api/template/index.ts`**（第 164-168 行，`saveDocument`）

```typescript
if (data.fileType) {
  formData.append('fileType', data.fileType)
}
```

---

### 五、前端 — 调用处

**9. `src/views/training/performance/index.vue`**（第 491 行）

```typescript
const uploadResult = await PerformanceApi.uploadDocument({
  file: uploadFile!,
  fileType: fileType // 新增，此时 fileType 已从 formData 取值（第 456 行）
})
```

**10. `src/views/template/management/index.vue`**（第 888 行）

```typescript
const uploadResult = await TemplateApi.saveDocument({
  file: uploadFile.value!,
  fileType: formData.temSubclass // 新增，复用表单中已有的必填字段
})
```

---

## 不受影响的范围

- `TiptapCollaborativeEditor.vue` → `saveDocumentFile`：独立封装，走 `documentApi.ts`，不走 `uploadDocument`
- `MarkdownCollaborativeEditor.vue` → `saveMarkdownFile`：独立封装，走 `markdownApi.ts`，不走 `saveDocument`
- `file.service.ts` → `uploadFile()`：文件存储层，无需感知业务分类
- `FileObject` 数据模型：存储层模型，不加 `fileType`
- 演训方案的"新建文档"路径：不走 `uploadDocument`，只走 `createNewData`
- 模板的"新建文档"路径：不走 `saveDocument`，只走 `savaTemplate`
- 编辑模式：不走上传接口

---

## 评审补充说明

### 关于"两步写入"健壮性问题

两个模块都属于同等程度的可选优化：

- **演训方案**：`saveFile`（无 id）→ 拿到 `fileId` → `createNewData`（一次性写入 `fileType + fileId`）
- **模板管理**：`saveFile`（无 id）→ 拿到 `fileId` → `savaTemplate`（一次性写入 `temSubclass + fileId`）

两者中 `fileType`/`temSubclass` 本身不会"中途丢失"，因为都在第二步一次性写入。真正的风险是第一步成功、第二步失败时产生**孤儿文件对象**（文件已上传但无业务归属记录），这是两个模块共同的问题。给 `saveFile` 加 `fileType` 仅在有 `id`（编辑器覆盖保存场景）时才有实际写入意义，对新建场景后端接到 `fileType` 但不会立即写入（因为没有记录可更新）。

### 关于 `prisma db push --force-reset` 影响范围

该命令清空**整个数据库**，不只是 Template 表，包括所有演训方案、审核记录、用户等数据。执行后必须立即运行 `seed.ts` 恢复所有初始数据。请确认 `seed.ts` 中包含了所有必要的种子函数（TrainingPerformance、User、Dict 等），避免其他模块数据丢失。
