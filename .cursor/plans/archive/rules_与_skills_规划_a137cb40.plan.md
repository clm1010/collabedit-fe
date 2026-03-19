---
name: Rules 与 Skills 规划
overview: 为 collabedit-fe、collabedit-node-backend、collaborative-middleware 三个仓库建立 Cursor Rules 和 Skills 体系，让 AI 在每次对话中自动遵守项目约定，并能高效执行复杂的跨文件工作流。
todos:
  - id: fe-rules
    content: 创建前端 7 个 Rules：editor-architecture.mdc、vue-component.mdc、tiptap-extension.mdc、docmodel.mdc、api-and-auth.mdc、store-and-hooks.mdc、type-conventions.mdc
    status: completed
  - id: be-rules
    content: 创建后端 3 个 Rules：route-service.mdc、prisma-model.mdc、project-conventions.mdc
    status: completed
  - id: mw-rules
    content: 创建中间件 1 个 Rule：collaboration-gateway.mdc
    status: completed
  - id: skill-tiptap
    content: '创建 Skill: create-tiptap-extension（Tiptap 扩展开发工作流）'
    status: completed
  - id: skill-docmodel
    content: '创建 Skill: add-docmodel-node（DocModel 节点类型工作流）'
    status: completed
  - id: skill-crud
    content: '创建 Skill: create-crud-module（全栈 CRUD 模块工作流，含可选文件上传与 seed）'
    status: completed
  - id: skill-collab
    content: '创建 Skill: add-collab-doc-type（协同文档类型工作流）'
    status: completed
  - id: plan-cleanup
    content: Plan 文件整理：归档已完成 plan 到 archive/ 子目录 + 修正 6 个名称与内容不一致的文件
    status: completed
isProject: false
---

# Rules 与 Skills 整体规划（评审修订版）

## 一、Rules（自动生效的项目约定）

Rules 放在各仓库的 `.cursor/rules/` 目录下，AI 每次对话自动加载。每个 Rule 文件针对特定的文件类型或目录生效。

### 1. collabedit-fe（前端）

需要 **7 个 Rule 文件**：

**1.0 `editor-architecture.mdc` — 双编辑器架构总览**（新增，源自 GJB 438C 方案 plan 审查）

- 适用范围：`src/views/training/`**, `src/views/template/`**
- 核心约定：
  - 项目有两套完全独立的富文本编辑器，路径、保存格式、WebSocket 端点、功能完整度各不相同：
    - **演训编辑器 (TiptapEditor)**：路径 `src/views/training/document/`，保存格式 DOCX（通过 DocModel 管线），WebSocket `/collaboration`，功能丰富（字体/图片/格式刷/分页/查找替换等）
    - **模板编辑器 (MarkdownEditor)**：路径 `src/views/template/editor/`，保存格式 Markdown，WebSocket `/markdown`，功能基础（文本+表格+颜色）
  - 两套编辑器的扩展目录不同：演训编辑器在 `toolbar/extensions/`，模板编辑器在 `extensions/`
  - 规划中有共享扩展目录 `src/shared/extensions/`（尚未创建），未来公共扩展应提取到此处
  - 修改编辑器功能时，必须确认影响的是哪套编辑器，避免改错目标
  - 两套编辑器共用同一个中间件（collaborative-middleware），但通过不同 WebSocket path 区分

**1.1 `vue-component.mdc` — Vue 组件规范**

- 适用范围：`src/**/*.vue`
- 核心约定：
  - 始终使用 `<script setup lang="ts">`
  - Props 用 `interface Props` + `defineProps<Props>()` + `withDefaults`
  - Emits 用 `defineEmits<{ (e: 'name', payload: T): void }>()`
  - 样式用 `<style lang="scss" scoped>`，穿透用 `:deep()`
  - 编辑器注入用 `useEditor()` 获取实例
  - 路径别名用 `@/`
  - 全局 SCSS 变量通过 `@use "@/styles/variables.scss" as *` 自动注入，可直接使用 `$namespace` 等变量
  - Element Plus 按需引入（`unplugin-element-plus` + `ElementPlusResolver`），无需手动 import 组件
  - 自定义业务组件放 `src/lmComponents/` 下，按功能分目录，通过 `index.ts` 统一导出

**1.2 `tiptap-extension.mdc` — Tiptap 扩展开发规范**

- 适用范围：`src/**/extensions/`
- 核心约定：
  - 扩展文件 `{Name}.ts` + 可选 Vue 节点视图 `{Name}Component.vue`
  - 用 `declare module '@tiptap/core'` 扩展命令类型
  - 必须实现 `addOptions`、`parseHTML`、`renderHTML`、`addCommands`
  - 需要自定义渲染时用 `VueNodeViewRenderer(Component)`
  - 扩展需在 [TiptapEditor.vue](src/views/training/document/components/TiptapEditor.vue) 中注册

**1.3 `docmodel.mdc` — DocModel 文档模型规范**

- 适用范围：`src/**/docModel/`**, `src/**/wordParser/`
- 核心约定：
  - 导入数据流：DOCX -> parser.ts -> DocModel -> serializer.ts -> HTML
  - 导出数据流：DocModel -> docModelToDocx.ts -> DOCX
  - **DOCX 解析管道有多层回退策略**（优先级从高到低）：红头文件检测 -> OOXML Enhanced 直接解析 -> DocModel 管线（docx4js） -> Mammoth 兜底
  - **重要警告**：Mammoth 作为兜底策略**不输出内联样式**（font-family, font-size, color, background-color），回退到 Mammoth 会导致样式丢失。应优先确保 OOXML Enhanced 或 DocModel 管线正常工作
  - 当 HTML 已包含样式时，应直接透传，避免经过 DocModel round-trip 丢失样式
  - 新增节点类型需同步修改 5 个文件：[types.ts](src/views/training/document/utils/docModel/types.ts)、[htmlParser.ts](src/views/training/document/utils/docModel/htmlParser.ts)、[serializer.ts](src/views/training/document/utils/docModel/serializer.ts)、[docx4jsParser.ts](src/views/training/document/utils/docModel/docx4jsParser.ts)、[docModelToDocx.ts](src/views/training/document/utils/docModel/docModelToDocx.ts)
  - DocBlock 类型必须在 `types.ts` 的联合类型中声明

**1.4 `api-and-auth.mdc` — API 层与认证体系**

- 适用范围：`src/api/`**, `src/config/axios/`**, `src/utils/auth.ts`, `src/permission.ts`
- 核心约定：
  - 按业务模块分文件，统一命名导出
  - 使用 `javaRequest`（`config/axios/javaService.ts`）封装（get/post/upload/download）
  - Mock/Java 后端通过 `USE_MOCK` 切换
  - 视图级独立 API 放 `views/{module}/api/` 下
  - Axios 实例分层：`service.ts`（主实例 + 拦截器）、`javaService.ts`（Java 专用）、`refreshToken.ts`（Token 刷新队列，区分 `VITE_BACKEND_TYPE` 指向 Java 或 Node 刷新接口）
  - 错误码映射：`config/axios/errorCode.ts` 中 `code -> msg`
  - 401 处理：`handle401` 使用请求队列暂存并发请求，等 Token 刷新完成后重发
  - 权限指令 `v-hasPermi`（模板中控制元素显隐），`checkPermi`/`checkRole`（逻辑中判断）
  - 路由守卫在 `permission.ts` 中（非 router/index.ts），支持 `VITE_SKIP_AUTH` 和外部 Token 模式（`VITE_EXTERNAL_TOKEN_LOGIN`，URL 参数 `token`/`refreshToken`，白名单 `externalAllowedPaths`）
  - 关键环境变量：`VITE_BASE_URL`、`VITE_API_URL`、`VITE_WS_URL`、`VITE_BACKEND_TYPE`、`VITE_SKIP_AUTH`、`VITE_EXTERNAL_TOKEN_LOGIN`

**1.5 `store-and-hooks.mdc` — 状态管理与 Composables**

- 适用范围：`src/store/`**, `src/hooks/`**
- 核心约定：
  - Pinia store 使用 `pinia-plugin-persistedstate` 持久化
  - **双入口模式**（重要）：每个 store 导出 `useXxxStore`（setup 内使用）和 `useXxxStoreWithOut`（路由守卫、Axios 拦截器等 setup 外使用，通过 `useXxxStore(store)` 传入 store 实例）
  - Store 按业务拆分：`user`、`permission`、`dict`、`externalUser`、`collaborationUser`、`docBuffer` 等
  - 通用 composables 在 `src/hooks/web/` 下：`useTable`（表格逻辑）、`useCache`（缓存）、`useI18n`（国际化）、`useValidator`（校验）、`useMessage`（消息提示）、`useLocale`（语言切换）等
  - `useI18n`、`useMessage`、`useTable`、`useCrudSchemas`、`required`、`DICT_TYPE` 通过 `unplugin-auto-import` 自动导入，无需手动 import
  - 新增 composable 时放入 `hooks/web/` 目录，优先复用已有 hooks，避免重复造轮子

**1.6 `type-conventions.mdc` — 类型命名规范**

- 适用范围：`src/types/`**, `src/**/\*.d.ts`
- 核心约定：
  - 业务实体类型用 `VO` 后缀：`TemplateVO`、`ExternalUserVO`、`TrainingPlanVO`
  - 分页参数用 `PageParam`，分页结果用 `PageResult<T>`
  - 枚举用 `enum XxxEnum` + 配套 `XxxTextMap: Record<string, string>` 做显示文案映射
  - 类型文件按业务域组织：`src/types/management.ts`、`performance.ts` 等
  - 全局类型扩展放 `src/types/*.d.ts`（如 Express Request 扩展）

### 2. collabedit-node-backend（后端）

需要 **3 个 Rule 文件**：

**2.1 `route-service.mdc` — 路由与服务层规范**

- 适用范围：`src/routes/`**, `src/services/`**
- 核心约定：
  - 路由用 `Router()` + `export default router`，路径写完整
  - 响应统一用 `ok(res, data)` / `fail(res, message, code)`（来自 `utils/response.ts`）
  - Service 用对象导出 `export const xxxService = { ... }`
  - 分页用 `parsePage(req)` + `pageResult(list, total)`（来自 `utils/pagination.ts`）
  - 树形数据用 `buildTree<T>()`（来自 `utils/tree.ts`），泛型约束 `{ id; parentId; children? }`
  - 错误在路由层 try-catch，service 层直接 throw
  - 权限用 `requirePermission('module:resource:action')`
  - 文件上传用 `multer.memoryStorage()` + `upload.single('file')`，存储由 `file.service.ts` 封装 MinIO 操作
  - MinIO 文件路径格式：`YYYY-MM-DD/{fileId}{ext}`
  - 中文文件名需用 `fixFilename()` 处理 Latin-1 -> UTF-8 编码

**2.2 `prisma-model.mdc` — Prisma 模型规范**

- 适用范围：`prisma/`
- 核心约定：
  - 模型 PascalCase，列 snake_case + `@map`
  - 必备字段：`id`（autoincrement 或 uuid）、`createdAt`、`updatedAt`
  - 软删除用 `delFlg Int @default(0)`
  - 状态用 `status Int @default(0)`（0=正常，1=禁用）
  - 外键命名 `{关联模型}Id` + `@map("{关联模型}_id")`
  - 迁移方式：使用 `prisma db push`（非 `prisma migrate`），无版本化迁移目录
  - Seed 数据在 `src/seed.ts`，按模块拆分函数（`seedDepts` -> `seedRoles` -> ...），使用 `upsert` 保证幂等

**2.3 `project-conventions.mdc` — 项目通用约定**

- 适用范围：全局
- 核心约定：
  - ES Modules（`"type": "module"`），导入带 `.js` 后缀
  - **无 path alias**（不用 `@/`，只用相对路径如 `../../utils/response.js`），这与前端不同
  - TypeScript strict 模式，`"module": "ES2022"`，`"moduleResolution": "Bundler"`
  - 路由在 `main.ts` 的 `apiRouter` 下注册，统一 `/api` 前缀
  - 认证链：`tenantGuard` -> `authGuard` -> 业务路由
  - 环境配置在 `src/config/env.ts`，使用 `dotenv.config()` + 导出 `env` 对象
  - `env.ts` 字段包括：`port`、`tenantEnable`、`skipAuth`、`externalTokenLogin`、JWT 配置（secret、expires）、MinIO 配置（endPoint、port、useSSL、accessKey、secretKey、bucket）
  - 布尔配置用 `toBool()` 转换
  - HTTP 日志用 `morgan('dev')`
  - 请求体限制：`express.json({ limit: '20mb' })`
  - 无全局错误处理中间件，错误在路由层 try-catch 处理
  - 无输入校验库，手动校验参数

### 3. collaborative-middleware（中间件）

需要 **1 个 Rule 文件**（项目较小，1 个即可覆盖）：

**3.1 `collaboration-gateway.mdc` — 协同网关规范**

- 适用范围：`src/`
- 核心约定：
  - 每个协同类型一个 NestJS Module + Gateway
  - Gateway 实现 `OnGatewayConnection`、`OnGatewayDisconnect`、`OnModuleDestroy`
  - 路径约定：`@WebSocketGateway({ path: '/xxx' })`
  - 使用自定义 `WsAdapter`（原生 `ws` 库，非 Socket.io），`noServer: true`，在 HTTP upgrade 事件中手动路由
  - Y.js 持久化用 LevelDB，路径 `./yjs-data/{模块名}`
  - 文档管理：`docs = new Map<string, Y.Doc>()`，空闲 2 分钟后 `flushDocument` 压缩并销毁
  - 消息类型：`MESSAGE_SYNC = 0`、`MESSAGE_AWARENESS = 1`
  - docId 从 URL path 解析，用户信息从 query 参数获取
  - **无 WebSocket 认证**：`userId`/`userName` 从 query 直接读取，无 token 校验，任意客户端可伪造身份（当前架构约束，修改时需注意）
  - 心跳：3 秒间隔 `ping/pong`，超时 `terminate()`
  - 日志：使用 NestJS `Logger`（`this.logger.log/warn/error`）
  - 两个 Gateway（collaboration、markdown-collaboration）逻辑高度相似，存在代码重复
  - 不支持多实例部署：`docs` 为进程内 Map，无 Redis 共享

---

## 二、Skills（按需触发的复杂工作流）

Skills 放在前端仓库的 `.cursor/skills/` 下（因为大部分复杂工作流以前端为主），跨仓库的流程在描述中说明涉及哪些仓库。

### Skill 1: `create-tiptap-extension` — 创建 Tiptap 扩展

- 触发场景：需要新增富文本编辑器功能时
- 涉及文件：
  - `extensions/{Name}.ts` — 扩展定义
  - `extensions/{Name}Component.vue` — Vue 节点视图（如需要）
  - `toolbar/*.vue` — 工具栏按钮注册
  - `TiptapEditor.vue` — 扩展注册
- 工作流步骤：定义 Options 接口 -> 创建扩展 -> 声明命令类型 -> 实现 parseHTML/renderHTML -> 可选创建 Vue 组件 -> 注册到编辑器 -> 添加工具栏入口

### Skill 2: `add-docmodel-node` — 新增 DocModel 节点类型

- 触发场景：需要支持新的文档元素类型（如脚注、水印等）
- 涉及文件（必须全部修改，缺一不可）：
  - `types.ts` — 新增 Block 接口 + 加入联合类型
  - `htmlParser.ts` — HTML -> DocModel 解析逻辑
  - `serializer.ts` — DocModel -> HTML 序列化逻辑
  - `docx4jsParser.ts` — DOCX -> DocModel 解析逻辑
  - `docModelToDocx.ts` — DocModel -> DOCX 导出逻辑
- 工作流步骤：定义类型 -> 实现 HTML 解析 -> 实现 HTML 序列化 -> 实现 DOCX 解析 -> 实现 DOCX 导出 -> 验证双向转换

### Skill 3: `create-crud-module` — 全栈 CRUD 模块

- 触发场景：需要新增一个完整的增删改查功能
- 涉及仓库：后端 + 前端
- 后端文件：
  - `prisma/schema.prisma` — 新增模型
  - `src/routes/{module}.ts` — CRUD 路由（含可选的 multer 文件上传）
  - `src/services/{module}.service.ts` — 业务逻辑（含可选的 MinIO 文件操作）
  - `src/main.ts` — 注册路由
  - `src/seed.ts` — 新增 seed 函数（如需初始数据）
- 前端文件：
  - `src/api/{module}/index.ts` — API 封装
  - `src/types/{module}.ts` — VO 类型定义（遵循 VO 后缀规范）
  - `src/views/{module}/index.vue` — 列表页
  - `src/views/{module}/components/` — 表单/弹窗组件
- 工作流步骤：后端建模 -> db push -> 写路由/服务 -> 注册路由 -> 可选写 seed -> 前端定义类型 -> 前端 API -> 页面 -> 联调
- 可选分支 — 带文件上传：路由加 `multer` 中间件 -> service 调 `file.service.ts` 的 MinIO 方法 -> 前端 API 用 `upload` 方法

### Skill 4: `add-collab-doc-type` — 新增协同文档类型

- 触发场景：需要新增一种支持协同编辑的文档类型
- 涉及仓库：中间件 + 前端
- 中间件文件：
  - `src/{type}-collaboration/{type}-collaboration.module.ts`
  - `src/{type}-collaboration/{type}-collaboration.gateway.ts`
  - `src/app.module.ts` — 注册新模块
- 前端文件：WebSocket 连接配置、编辑器组件
- 工作流步骤：中间件新建 Module + Gateway -> 复用 WsAdapter -> 注册到 AppModule -> 前端建立 WebSocket 连接 -> 集成 Y.js Provider
- 注意事项：新 Gateway 可从现有 `collaboration.gateway.ts` 复制（两个 Gateway 逻辑高度相似），修改 path 和 LevelDB 存储路径即可

---

## 三、实施优先级

| 优先级 | 内容                                                 | 预计工作量 |
| ------ | ---------------------------------------------------- | ---------- |
| P0     | 前端 7 个 Rules（含新增 editor-architecture.mdc）    | 约 45 分钟 |
| P1     | 后端 3 个 Rules                                      | 约 25 分钟 |
| P2     | 中间件 1 个 Rule                                     | 约 10 分钟 |
| P3     | Skill 1: create-tiptap-extension                     | 约 20 分钟 |
| P3     | Skill 2: add-docmodel-node                           | 约 20 分钟 |
| P4     | Skill 3: create-crud-module（含文件上传分支 + seed） | 约 25 分钟 |
| P4     | Skill 4: add-collab-doc-type                         | 约 15 分钟 |
| P5     | Plan 文件整理（归档 + 重命名 6 个不一致文件）        | 约 15 分钟 |

建议从 P0 开始，逐步推进。每个 Rule/Skill 创建后可立即在后续对话中验证效果。

---

## 四、评审确认：已排除不纳入的内容

以下领域经审查确认不纳入本方案（原因注明）：

- **测试规范**：三个仓库均无测试框架，无需为不存在的机制写 Rule
- **i18n 规范**：存在 vue-i18n 但属于框架层级配置，文档编辑业务基本不涉及，优先级低
- **UnoCSS 自定义规则**：`custom-hover`、`layout-border` 等存在但属于样式细节，非架构约定
- **Docker/部署规范**：中间件有 Dockerfile（多阶段构建 + PM2），属于运维配置
- **监控/限流/健康检查**：三个仓库均不存在这些机制
- **全局错误处理中间件**（后端）：当前不存在，已在 Rule 中标注"无全局错误处理"作为架构约束
- **输入校验库**（后端）：当前不存在，已在 Rule 中标注"手动校验"

---

## 五、前端 `.cursor/plans/` 审查结论

前端仓库有 **134 个 plan 文件**，经逐类审查后的结论：

### 已从 plan 中提取并纳入 Rules 的内容

- **双编辑器架构**（来源：GJB438C 总方案、P0-0 基础能力补齐）-> 新增 `editor-architecture.mdc`
- **DOCX 解析管道回退策略和 Mammoth 样式丢失警告**（来源：修复中间件重启样式丢失等多个 bug fix plan）-> 补充到 `docmodel.mdc`
- **共享扩展目录规划 `src/shared/extensions/`**（来源：P0-0）-> 纳入 `editor-architecture.mdc`

### 不需要纳入 Rules/Skills 的内容

- **GJB 438C 功能路线图**（P0-0 到 P2-5，共 18 个 plan）：这是**产品需求规划**，定义"要做什么功能"，不是编码约定。保留为独立 plan 文件供开发参考即可
- **已完成的 Bug 修复记录**（约 60+ 个 plan）：历史决策记录，修复已反映在代码中，经验教训已提取到 Rules 的警告项中
- **已完成的架构重构方案**（约 15 个 plan）：决策已体现在当前代码结构中
- **单次功能开发方案**（约 20+ 个 plan）：一次性工作，不会重复执行

### 执行项：Plan 文件整理

#### 5.1 归档已完成的 plan

134 个 plan 文件中大部分已完成，将已完成的归档到 `.cursor/plans/archive/` 子目录，保持活跃 plan 可见。

归档标准：

- frontmatter 中所有 todos 状态为 `completed` 的 plan -> 归档
- 无 todos 但明确是已完成的 bug 修复/功能开发 -> 归档
- GJB 438C 路线图 plan（P0-P2）-> **保留**（未来要执行的功能规划）
- 当前 Rules/Skills 规划 plan -> **保留**

#### 5.2 修正 6 个名称与内容不一致的 plan 文件

| 当前文件名                                 | 建议重命名为                            |
| ------------------------------------------ | --------------------------------------- |
| `P1-1-图片插入与处理.plan.md`              | `P1-1-图片拖拽调整与对齐修复.plan.md`   |
| `红头与排版增强_7a178057.plan.md`          | `演训编辑器纯JS合并_7a178057.plan.md`   |
| `修复踢人后残留awareness_4e10f836.plan.md` | `多连接共存方案_4e10f836.plan.md`       |
| `模板子类字典统一分析_ceff0adc.plan.md`    | `全量字典标准化改造_ceff0adc.plan.md`   |
| `参考素材接口分析_d0aa846a.plan.md`        | `参考素材接口重新设计_d0aa846a.plan.md` |
| `P1-3-交叉引用.plan.md`                    | `P1-3-自动编号与交叉引用.plan.md`       |
