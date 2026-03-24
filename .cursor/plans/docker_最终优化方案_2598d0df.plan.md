---
name: Docker 最终优化方案
overview: 三阶段构建优化镜像体积（544MB -> ~200MB），同步更新部署文档，删除过程中的废弃方案文件。
todos:
  - id: update-dockerignore
    content: .dockerignore 添加 *.tar，排除构建产物进入构建上下文
    status: completed
  - id: three-stage-dockerfile
    content: Dockerfile 改为三阶段构建（ts-builder + deps-builder + runtime）
    status: completed
  - id: update-deploy-doc
    content: 更新 node中间件.md 部署文档（buildx builder 创建 + 构建导出流程）
    status: completed
  - id: delete-old-plans
    content: 删除两个废弃的中间方案文件
    status: completed
isProject: false
---

# Docker 跨平台构建最终方案

## 问题回顾

在 Windows Docker Desktop 上使用 `--platform linux/arm64` 交叉构建时，遇到了以下 QEMU 模拟导致的问题链：

1. **npm/corepack 静默失灵** -- 通过系统 node 运行的 JS CLI 工具在 QEMU 下全部静默失败（exit 0 但无效果）
2. **nest build 静默失败** -- 同上，TypeScript 编译也通过系统 node 运行
3. **apk del 删除 musl** -- QEMU 下 apk 依赖解析异常，递归删除编译工具时把系统 C 库也删了
4. **docker save 校验和失败** -- QEMU 下 apk 操作导致 `etc/apk/world` 文件完整性异常

最终采用的解决策略：

- `FROM --platform=$BUILDPLATFORM` 让 TypeScript 编译在构建主机原生运行（绕过问题 1、2）
- `wget` 下载 pnpm 静态二进制（绕过问题 1）
- 三阶段构建让编译工具只存在于中间阶段（绕过问题 3，同时优化镜像体积）
- `docker buildx build --output` 直接导出 tar（绕过问题 4）

## 修改 1：.dockerignore 添加 .tar

在 [.dockerignore](e:\job-project\collaborative-middleware.dockerignore) 末尾添加 `*.tar`，防止已导出的 `collaborative-middleware.tar`（~184MB）被 `COPY . .` 复制进构建上下文。

## 修改 2：三阶段 Dockerfile

将 [Dockerfile](e:\job-project\collaborative-middleware\Dockerfile) 从两阶段改为三阶段，完整内容：

```dockerfile
# ==============================
# 阶段 1：TypeScript 编译
# 使用 $BUILDPLATFORM 在构建主机上原生运行，不经过 QEMU
# ==============================
FROM --platform=$BUILDPLATFORM node:20-alpine AS ts-builder

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN NODE_ENV=production pnpm exec nest build


# ==============================
# 阶段 2：安装生产依赖（目标平台 arm64）
# 编译 native 模块需要 python3/make/g++
# 此阶段会被丢弃，编译工具不会进入最终镜像
# ==============================
FROM node:20-alpine AS deps-builder

RUN apk add --no-cache python3 make g++

RUN wget -qO /bin/pnpm "https://github.com/pnpm/pnpm/releases/download/v9.15.8/pnpm-linuxstatic-arm64" \
    && chmod +x /bin/pnpm

WORKDIR /app

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --prod --frozen-lockfile


# ==============================
# 阶段 3：运行时镜像（目标平台 arm64，干净镜像）
# ==============================
FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN wget -qO /bin/pnpm "https://github.com/pnpm/pnpm/releases/download/v9.15.8/pnpm-linuxstatic-arm64" \
    && chmod +x /bin/pnpm \
    && pnpm add -g pm2 \
    && pnpm --version

WORKDIR /app

COPY --from=ts-builder /app/dist ./dist
COPY --from=deps-builder /app/node_modules ./node_modules
COPY --from=ts-builder /app/package.json ./

RUN mkdir -p /app/yjs-data/collaboration /app/yjs-data/markdown \
    && addgroup -g 1001 -S nestjs \
    && adduser -S nestjs -u 1001 -G nestjs \
    && chown -R nestjs:nestjs /app/yjs-data

USER nestjs

EXPOSE 3001

CMD ["pm2-runtime", "start", "dist/main.js", "--name", "nestjs-app"]
```

关键变化：

- 编译工具（python3/make/g++）只在 deps-builder 阶段，**不进入最终镜像**
- deps-builder 独立 COPY `pnpm-lock.yaml` 和 `package.json`（从构建上下文，不依赖 ts-builder）
- 不需要 `apk del`，因为 deps-builder 整个被丢弃
- 最终镜像从 ~544MB 降至 ~200-250MB

## 修改 3：更新部署文档

将 [node中间件.md](e:\job-project\collaborative-middleware\node中间件.md) 替换为：

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

````markdown
# 中间件部署

## 1 控制台配置代理（本地电脑需要科学上网时使用）

\

```sh
export HTTP_PROXY=http://127.0.0.1:7897
export HTTPS_PROXY=http://127.0.0.1:7897
\
```
````

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

```

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

````

## 2 打开 DockerDesktop，构建镜像

### 2.0 首次使用：创建 buildx builder（只需执行一次）

> 创建支持跨平台导出的 BuildKit 构建器。已创建过则跳过此步。

\

```sh
docker buildx create --name multiplatform --driver docker-container --use
\

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

`

````

### 2.1 构建并导出镜像

> 使用 buildx 构建 arm64 镜像并直接导出为 tar 文件（构建 + 导出一步完成）。首次构建或依赖变化时加 `--no-cache`。

\

```sh
# 使用缓存构建（日常使用）
docker buildx build --platform linux/arm64 -t collaborative-middleware:latest --output type=docker,dest=collaborative-middleware.tar .

# 无缓存构建（依赖变化或构建异常时使用）
docker buildx build --platform linux/arm64 --no-cache -t collaborative-middleware:latest --output type=docker,dest=collaborative-middleware.tar .
\

```

## 3 在服务器上部署

\

```sh
# 加载镜像
docker load -i /tmp/collaborative-middleware.tar

# 运行容器
# -d                后台运行
# -p 3001:3001      端口映射
# -v                挂载持久化目录，确保中间件重启后 Y.Doc 数据不丢失
# --name            是 Docker 容器名
# --restart         容器异常退出时自动重启
# collaborative-middleware 这里是镜像名 必须与 build 时的镜像名一致
docker run -d \
  -p 3001:3001 \
  -v /data/yjs-data:/app/yjs-data \
  --name app \
  --restart unless-stopped \
  collaborative-middleware
\

```

```

变化说明：
- 新增 2.0 节：buildx builder 创建命令（首次使用）
- 合并原 2.1/2.2/2.3 为新 2.1：`docker buildx build --output` 一步完成构建+导出
- 移除 `docker save`（QEMU 下有校验和问题）
- 服务器部署流程不变

## 修改 4：删除废弃方案文件

删除两个过程中的中间方案：

- `collabedit-fe/.cursor/plans/修复_docker_pnpm_问题_a72a3e79.plan.md`（第一版 corepack 方案，已废弃）
- `collabedit-fe/.cursor/plans/静态二进制修复_pnpm_ad66adbc.plan.md`（第三版静态二进制方案，已合入最终方案）

```
