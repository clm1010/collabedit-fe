# 协同编辑平台 — 打包部署环境说明（精简单机 · Java 后端）

本文档说明 **collabedit-fe**、**collaborative-middleware**、**Java 业务后端**（及同机 **MySQL / MinIO**）部署所需的基本环境（硬件、浏览器、服务器软件、端口等）。**推荐采用 1 台虚拟机单机部署**。

---

## 一、客户端（浏览器）

- 前端基于 **Vite 5**，默认产物面向**现代浏览器**；仓库虽安装 `@vitejs/plugin-legacy`，但当前构建链**未启用** legacy，**无 IE 兼容**。
- 协同编辑依赖 **WebSocket**；若使用 **Yjs / SharedArrayBuffer** 相关能力，需满足浏览器安全上下文（HTTPS 或 `localhost`）。

| 浏览器        | 最低版本 | 说明           |
| ------------- | -------- | -------------- |
| Chrome / Edge | 88+      | 推荐，完整支持 |
| Firefox       | 78+      | 支持           |
| Safari        | 14+      | 支持           |
| IE            | —        | 不支持         |

生产环境若使用 HTTP 非本机访问，需确认 WebSocket 未被代理或浏览器策略阻断；**推荐 HTTPS + `wss://`**。

---

## 二、系统架构与组件

```
┌─────────────────────┬─────────────────────┬──────────────────────┐
│ 前端静态资源 (Nginx) │  协同中间件          │  业务后端 (Java)      │
│   collabedit-fe     │  collaborative-      │  Spring Boot 等       │
│                     │  middleware          │                       │
└─────────────────────┴─────────────────────┴──────────────────────┘
```

| 组件       | 技术栈概要                                      |
| ---------- | ----------------------------------------------- |
| 前端       | Vue 3、Vite 5、TypeScript，构建产物为静态文件   |
| 协同中间件 | NestJS 10、WebSocket（`ws`）、Yjs、LevelDB 持久化 |
| 业务后端   | **Java（Spring Boot）**、MySQL、MinIO           |

---

## 三、服务器软件环境

### 操作系统

- **Linux** 推荐：**Ubuntu 22.04 LTS**（单机方案建议 **x86_64**）。
- **注意**：`collaborative-middleware` 的 `Dockerfile` 中生产阶段下载的 pnpm 可能为 **`linuxstatic-arm64`**。若部署在 **x86_64** 服务器，需将 Dockerfile 中的 pnpm 下载链接改为对应 **x64** 版本，或使用多阶段/多平台构建策略。

### Node.js 与包管理（仅前端构建 + 中间件运行）

| 用途           | 项目                     | 声明 / 实践                    | 建议           |
| -------------- | ------------------------ | ------------------------------ | -------------- |
| 前端构建       | collabedit-fe            | `engines.node >= 16`           | **Node 20 LTS** |
| 协同中间件运行 | collaborative-middleware | Dockerfile：`node:20-alpine`   | **Node 20**    |

- 前端要求 **pnpm >= 8.6.0**（见 `package.json` 的 `engines`）。

### Java 运行时（业务后端）

- 使用 **JDK 17 或 JDK 21**（LTS）与项目实际 `pom.xml` / `build.gradle` 中声明的版本一致。
- 以 **JAR 部署** 或 **容器镜像** 运行均可；单机同机时需与 MySQL、MinIO 网络互通（本机 `127.0.0.1` 或 Docker 网络）。

### 数据库与存储

| 组件    | 说明 |
| ------- | ---- |
| MySQL   | **Java 后端**业务数据源；建议 **MySQL 8.0+**。 |
| MinIO   | 对象存储；默认 API 端口 **9000**；访问地址、AccessKey 等以 **Java 应用配置**为准。 |
| LevelDB | 随中间件 `y-leveldb` 使用，**无需单独安装**；数据目录见中间件 Docker 说明。 |

### Web 与进程

- **Nginx**：托管前端静态资源，并反向代理 `/api` → Java、`/ws` → 中间件（参见仓库内 `nginx.conf`、`docker-compose.yml`）。
- **PM2**：中间件 Docker 镜像内使用 `pm2-runtime` 启动 `dist/main.js`。

---

## 四、端口规划

| 端口     | 服务           | 说明 |
| -------- | -------------- | ---- |
| 80 / 443 | Nginx          | HTTP(S)、前端 SPA |
| 3001     | 协同中间件     | WebSocket：`/collaboration/{docId}`、`/markdown/{docId}` 等 |
| 8080     | Java 后端      | REST API（端口以实际 `application.yml` / 启动参数为准） |
| 9000     | MinIO          | 对象存储 API |
| 3306     | MySQL          | 数据库 |

典型 Nginx 配置思路（与仓库示例一致）：

- `/api/` → Java 后端 HTTP
- `/ws/` → 中间件（需 `Upgrade`、`Connection` 等 WebSocket 头；长超时如 3600s）

---

## 五、推荐部署拓扑（单机 · 1 台虚拟机）

**单台虚拟机**上部署全部对外与依赖服务（精简方案）。

```
┌──────────────────────── VM（单机）────────────────────────┐
│  Nginx                    :80 / :443   前端 SPA + 反向代理 │
│  collaborative-middleware :3001        WebSocket 协同      │
│  Java 后端                :8080        REST API            │
│  MySQL                    :3306        业务数据库          │
│  MinIO                    :9000        对象存储            │
└────────────────────────────────────────────────────────────┘
```

| 服务                     | 用途 | 端口 |
| ------------------------ | ---- | ---- |
| Nginx                    | 前端静态资源、`/api` → Java、`/ws` → 中间件 | 80 / 443 |
| collaborative-middleware | Yjs WebSocket 协同，LevelDB 持久化（容器内常见 **`/app/yjs-data`**） | 3001 |
| Java 后端                | 业务 REST API，连接 MySQL / MinIO | 8080 |
| MySQL                    | 关系型业务数据 | 3306 |
| MinIO                    | 文件对象存储（可选控制台 **9001**） | 9000 |

**建议虚拟机规格：**

| 项     | 最低    | 推荐 |
| ------ | ------- | ---- |
| CPU    | 4 vCPU  | 8 vCPU |
| 内存   | 8 GB    | 16 GB（Java 堆 + MySQL buffer pool） |
| 系统盘 | 40 GB   | 60 GB |
| 数据盘 | —       | **100 GB+**（MySQL 数据 + MinIO 对象） |
| OS     | Linux x86_64 | Ubuntu 22.04 LTS |

---

## 六、服务器硬件补充（构建机 / 开发机）

若 **不在** 该虚拟机上执行前端生产构建，可单独使用构建机或 CI：

| 项目 | 最低     | 推荐 |
| ---- | -------- | ---- |
| CPU  | 2 核     | 4 核及以上 |
| 内存 | 2 GB     | **4 GB 及以上**（前端 `build:prod` 使用 `--max_old_space_size=4096`，建议堆可用 ≥ 4 GB） |
| 磁盘 | 20 GB    | 50 GB+ |

---

## 七、构建机（CI / 本地）要求

| 工具           | 版本建议 |
| -------------- | -------- |
| Node.js        | 20 LTS   |
| pnpm           | >= 8.6.0 |
| Docker         | 20.10+（若中间件用容器） |
| Docker Compose | v2+（若使用 `docker-compose.yml`） |
| JDK            | 与 Java 后端一致（构建后端产物时） |

### 常用构建命令

```bash
# 前端（collabedit-fe）
pnpm install
pnpm build:prod   # 或 build:dev / build:test 等，对应不同 --mode

# 中间件（collaborative-middleware，Docker）
docker build -t collaborative-middleware .

# Java 后端：按项目使用 Maven / Gradle 打包，例如
# mvn -DskipTests package
# 或 ./gradlew bootJar
```

前端 `docker-compose.yml` 注释中若写 `pnpm build`，请以实际脚本为准（例如 **`pnpm build:prod`**）。部署前需先产出 **`dist`**，并核对 Nginx `root` 与挂载路径一致（容器内常见为 `/usr/share/nginx/html`）。

---

## 八、环境变量要点（部署时需核对）

- **前端**：`VITE_API_URL`、`VITE_WS_URL`、`VITE_BASE_PATH`、**`VITE_BACKEND_TYPE=java`** 等，按环境选择对应 `.env.*`；勿将含密钥的 `.env` 提交到公开仓库。
- **中间件**：`COLLABORATIVE_MIDDLEWARE_PORT`、`CORS_ORIGIN`、`NODE_ENV`；生产建议限制 `CORS_ORIGIN` 为实际访问域名。
- **Java 后端**（示例项，以项目实际配置为准）：数据源 URL / 用户名密码、MinIO endpoint 与密钥、JWT 或会话密钥、`spring.profiles.active`、业务相关开关等；**生产务必关闭调试鉴权绕过**（若有）。

---

## 九、关键注意事项

1. **Dockerfile CPU 架构**：中间件镜像内 pnpm 为 **arm64** 静态包时，在 **amd64** 主机上可能无法运行，需按目标平台调整下载地址或使用 `FROM --platform`。
2. **中间件多实例**：当前设计以内存 + 本地 LevelDB 为主，**不适合无共享层的多副本水平扩展**；单机仅部署 **1 个**中间件实例。
3. **LevelDB 数据持久化**：容器部署请挂载中间件数据目录（如 **`/app/yjs-data`**），避免重启丢协同持久化数据。
4. **WebSocket 与超时**：Nginx 需正确配置 `proxy_read_timeout` 等；中间件有心跳逻辑，断线策略以实际代码为准。
5. **HTTPS**：生产建议使用 TLS，前端 WebSocket 使用 **`wss://`**，与 Nginx 443、`ssl` 证书卷配置一致。

---

## 十、相关仓库内文件索引

| 仓库 | 文件 |
| ---- | ---- |
| collabedit-fe | `package.json`、`vite.config.ts`、`docker-compose.yml`、`nginx.conf`、各 `.env.*` |
| collaborative-middleware | `Dockerfile`、`package.json`、`.env` / `.env.prod`、`README.md` |
| collabedit-node-backend | 历史 / 可选 **Node** 参考实现；**生产以 Java 后端为准**，本部署文档不再以其为运行依赖。 |

---

*文档随仓库演进可能过时，部署前请以各仓库与 Java 项目最新配置为准。*
