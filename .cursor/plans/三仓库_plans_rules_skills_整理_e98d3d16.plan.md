---
name: 三仓库 Plans Rules Skills 整理
overview: 整理前端、中间件、后端三个仓库的 Plans/Rules/Skills 体系：归档已完成的 plan 文件，更新 docmodel rule 补充图片分类经验，汇总当前状态。
todos:
  - id: archive-completed-plans
    content: 归档 9 个已完成的 plan 文件到 archive/ 子目录
    status: completed
  - id: update-docmodel-rule
    content: 更新 docmodel.mdc 补充图片分类规则章节（DocRun.image vs DocImageBlock）
    status: completed
isProject: false
---

# 三仓库 Plans / Rules / Skills 整理

## 现状总览

| 项目                     | Rules | Skills | Plans (活跃) | Plans (归档) |
| ------------------------ | ----- | ------ | ------------ | ------------ |
| collabedit-fe            | 7     | 4      | ~86          | 59           |
| collabedit-node-backend  | 3     | 0      | 0            | 0            |
| collaborative-middleware | 1     | 0      | 0            | 0            |

Rules 和 Skills 已全部创建完毕（[rules*与skills*规划](e:\job-project\collabedit-fe.cursor\plans\rules_与_skills_规划_a137cb40.plan.md) 8 项 todos 全部 completed）。

---

## 一、归档已完成的 Plan 文件

以下 9 个 plan 文件所有 todos 已 completed，需移入 `.cursor/plans/archive/`：

| 文件                                      | 说明                                     |
| ----------------------------------------- | ---------------------------------------- |
| `修复块图片变行内_6fc73029.plan.md`       | 保存后块图片变行内 -- **本次修复**       |
| `修复导入行内图片变块_fcbc9e38.plan.md`   | 导入后行内图片变块 -- **本次修复**       |
| `修复docx4js策略回退v2_40236df0.plan.md`  | docx4js 回退 + cleanWordHtml 破坏 inline |
| `修复docx解析排版不一致_250b4158.plan.md` | wp:inline vs wp:anchor 区分              |
| `修复文档内容重复_637f718d.plan.md`       | Y.js LevelDB 预加载冲突                  |
| `修复文件解析缓存问题_f5b36a3d.plan.md`   | IndexedDB 缓存策略                       |
| `修复块图片行和导入图片_25105d2b.plan.md` | CSS font-size:0 + 行内图片丢失           |
| `修复导出导入排版问题_9e00abd1.plan.md`   | 标题变蓝 + 块图片多一行                  |
| `rules_与_skills_规划_a137cb40.plan.md`   | Rules/Skills 规划（已全部执行）          |

## 二、更新 docmodel.mdc Rule

补充从图片修复中提炼的关键约定（[docmodel.mdc](e:\job-project\collabedit-fe.cursor\rules\docmodel.mdc)），新增"图片分类规则"章节：

```markdown
## 图片分类规则（DocRun.image vs DocImageBlock）

- **DocImageBlock**（块图片）：段落中仅含一张图片、无文本内容 -> `type: 'image'` 块，DOCX 导出宽度上限 600px，独占段落
- **DocRun.image**（行内图片）：段落中图片与文字混排 -> 作为 `DocRun.image`，DOCX 导出宽度上限 300px，混在段落中

关键判定逻辑：

- **导入路径**（`docx4jsParser.ts` `parseBlocksFromTree`）：解析 `<p>` 后检查 `imgRuns.length === 1 && textRuns.length === 0`，满足则提升为 `DocImageBlock`
- **保存路径**（`htmlParser.ts` `parseParagraphWithInlineImages`）：`isSoleImage = !hasTextContent`，若为 true 则走块图片路径，否则按 `data-display` / `hasInlineStyle` 判定行内
- **序列化**（`serializer.ts`）：`DocRun.image` 输出 `data-display="inline"`，`DocImageBlock` 输出 `data-display="block"`
```

## 三、保留的活跃 Plan 分类

### 功能路线图（保留，未来开发参考）

- `GJB438C-方案总览索引.plan.md` -- 总索引
- `gjb438c协同编辑功能适配_c8df26c3.plan.md` -- 17 项 pending
- P0 系列：P0-0 基础能力补齐、P0-1 预设样式模板、P0-2 标题编号、P0-3 页眉页脚、P0-4 表格样式、P0-5 目录索引、P0-6 DOCX 导出
- P1 系列：P1-1 图片拖拽、P1-2 样式刷、P1-3 交叉引用、P1-4 批注修订、P1-5 拼写检查
- P2 系列：P2-1 图片高级编辑、P2-2 版本对比、P2-3 文档结构导航、P2-4 水印密级、P2-5 文档属性检查

### 进行中/部分完成（保留）

- `全量字典标准化改造_ceff0adc` -- 14/15 completed，1 pending
- `素材分页加载功能_2bbb2e5d` -- 部分 in_progress
- `删除templatesubclass表_b152fe39` -- 部分 in_progress
- `部署与ws代理方案_4568ee0f` -- 部分 in_progress
- `独立素材库方案_7acba113` -- 部分 completed
- `演训编辑器纯JS合并_7a178057` -- 部分 completed

### 待决策/未启动（保留）

- `修复docx4js图片丢失v2_af25fedb` -- 全部 pending
- `修复文档内容重复_2793af94` -- 全部 pending
- `统一接口与路由限制方案_1c94fbd2` -- 全部 pending
- `修复重复用户与踢人机制_7d71bb4c` -- 全部 pending
- `演训方案编辑链路重构_06048a5e` / `终版_5015c9bb` -- 全部 pending
- 其他 pending 计划若干

## 四、三仓库 Rules 清单（现状确认，无需修改）

### collabedit-fe（7 个）

| Rule                      | 作用范围                               |
| ------------------------- | -------------------------------------- |
| `editor-architecture.mdc` | 双编辑器架构总览                       |
| `vue-component.mdc`       | Vue 组件规范                           |
| `tiptap-extension.mdc`    | Tiptap 扩展开发规范                    |
| `docmodel.mdc`            | DocModel 文档模型规范 **（本次更新）** |
| `api-and-auth.mdc`        | API 层与认证体系                       |
| `store-and-hooks.mdc`     | 状态管理与 Composables                 |
| `type-conventions.mdc`    | 类型命名规范                           |

### collabedit-node-backend（3 个）

| Rule                      | 作用范围                                       |
| ------------------------- | ---------------------------------------------- |
| `project-conventions.mdc` | 项目通用约定（ES Modules、路由注册、环境配置） |
| `prisma-model.mdc`        | Prisma 模型定义规范                            |
| `route-service.mdc`       | Express 路由与服务层规范                       |

### collaborative-middleware（1 个）

| Rule                        | 作用范围                    |
| --------------------------- | --------------------------- |
| `collaboration-gateway.mdc` | 协同编辑 WebSocket 网关规范 |

## 五、Skills 清单（现状确认，无需修改）

全部位于 `collabedit-fe/.cursor/skills/`：

| Skill                     | 触发场景               | 涉及仓库      |
| ------------------------- | ---------------------- | ------------- |
| `create-tiptap-extension` | 新增 Tiptap 扩展       | 前端          |
| `add-docmodel-node`       | 新增 DocModel 节点类型 | 前端          |
| `create-crud-module`      | 新增全栈 CRUD 模块     | 前端 + 后端   |
| `add-collab-doc-type`     | 新增协同文档类型       | 前端 + 中间件 |

## 影响范围

- 归档操作：仅移动文件到 `archive/`，不影响代码
- `docmodel.mdc` 更新：仅补充文档说明，不影响代码行为
- 后端和中间件：无需修改（rules/skills 已完备）
