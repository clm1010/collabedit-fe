---
name: Docker 最终优化方案
overview: 三阶段构建优化镜像体积（544MB -> ~85MB tar），同步更新部署文档，删除过程中的废弃方案文件。
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

## 修改 1：.dockerignore 添加 .tar（已完成）

在 `collaborative-middleware/.dockerignore` 末尾添加 `*.tar`，防止已导出的 tar 文件被 `COPY . .` 复制进构建上下文。

## 修改 2：三阶段 Dockerfile（已完成）

将 `collaborative-middleware/Dockerfile` 从两阶段改为三阶段：

**阶段 1：ts-builder（构建主机原生运行，不经过 QEMU）**

- `FROM --platform=$BUILDPLATFORM node:20-alpine AS ts-builder`
- `npm install -g pnpm`（原生运行，无需静态二进制）
- `pnpm install --frozen-lockfile --ignore-scripts`（只安装类型定义，跳过 native 模块编译）
- `NODE_ENV=production pnpm exec nest build`（原生运行 TypeScript 编译）

**阶段 2：deps-builder（目标平台 arm64，编译 native 模块）**

- `FROM node:20-alpine AS deps-builder`
- `apk add python3 make g++`（编译工具，此阶段会被丢弃）
- `wget` 下载 pnpm 静态二进制 v9.15.8
- 独立 `COPY pnpm-lock.yaml package.json ./`（从构建上下文）
- `pnpm install --prod --frozen-lockfile`（编译 native 模块如 classic-level）

**阶段 3：runtime（目标平台 arm64，干净镜像）**

- `FROM node:20-alpine`
- `wget` 下载 pnpm 静态二进制 + `pnpm add -g pm2`
- `COPY --from=ts-builder /app/dist`（编译产物）
- `COPY --from=deps-builder /app/node_modules`（生产依赖）
- `COPY --from=ts-builder /app/package.json`
- 创建 nestjs 用户 + yjs-data 目录
- `CMD ["pm2-runtime", "start", "dist/main.js"]`

关键变化：

- 编译工具（python3/make/g++）只在 deps-builder 阶段，不进入最终镜像
- 不需要 `apk del`，因为 deps-builder 整个被丢弃
- 最终镜像从 ~544MB 降至 ~85MB tar

## 修改 3：更新部署文档（已完成）

将 `collaborative-middleware/node中间件.md` 更新为：

- **新增 2.0 节**：首次使用时创建 buildx builder
  - `docker buildx create --name multiplatform --driver docker-container --use`
- **合并原 2.1/2.2/2.3 为新 2.1**：构建+导出一步完成
  - `docker buildx build --platform linux/arm64 -t collaborative-middleware:latest --output type=docker,dest=collaborative-middleware.tar .`
  - 加 `--no-cache` 用于依赖变化或构建异常时
- **移除 `docker save`**：QEMU 下有校验和问题
- **服务器部署流程不变**：`docker load` + `docker run`

## 修改 4：删除废弃方案文件（已完成）

已删除两个过程中的中间方案：

- `collabedit-fe/.cursor/plans/修复_docker_pnpm_问题_a72a3e79.plan.md`（第一版 corepack 方案）
- `collabedit-fe/.cursor/plans/静态二进制修复_pnpm_ad66adbc.plan.md`（第三版静态二进制方案）
