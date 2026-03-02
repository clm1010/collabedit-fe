---
name: 删除TemplateSubclass表
overview: 从 Prisma schema 中删除已废弃的 TemplateSubclass 模型，并生成 migration 清理数据库中对应的表。
todos:
  - id: remove-model
    content: 从 prisma/schema.prisma 中删除 TemplateSubclass 模型定义（L394-401）
    status: completed
  - id: run-migration
    content: 执行 npx prisma migrate dev --name remove_template_subclass 生成并应用 migration
    status: in_progress
isProject: false
---

# 删除废弃的 TemplateSubclass 表

## 背景

经过上一轮字典标准化改造后，`TemplateSubclass` 表已被 `DictItem`（`dictType = 'tb_file_type'`）完全替代。后端不再有任何代码读写此表：

- `routes/template.ts` 中 `/tbTemplate/getTemTypeData` 路由已删除
- `seed.ts` 中 `seedTemplateSubclass` 函数已删除
- 前端 `getTemplateSubclass` 实现已改为调用 `/sjrh/dict/dataList`

## 修改内容

### 1. 删除 Prisma 模型定义

[prisma/schema.prisma](e:\job-project\collabedit-node-backend\prisma\schema.prisma) L394-401：删除整个 `model TemplateSubclass { ... }` 块。

### 2. 生成并执行 migration

运行 `npx prisma migrate dev --name remove_template_subclass` 生成 migration SQL，将数据库中的 `TemplateSubclass` 表 DROP 掉。

### 风险评估

- 无风险：后端代码中已无任何 `prisma.templateSubclass` 调用
- 如果数据库中存有旧的 TemplateSubclass 数据，migration 会将其删除（数据已由 `tb_file_type` 字典项替代，不会丢失）
