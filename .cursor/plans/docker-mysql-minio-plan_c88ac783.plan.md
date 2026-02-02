---
name: docker-mysql-minio-plan
overview: 结合前端与 NodeJS 后端，提供在本机通过 Docker 启动 MySQL + MinIO 的完整落地方案，并对齐前后端配置与启动步骤。
todos: []
isProject: false
---

# Docker 启动 MySQL + MinIO 详细方案

## 目标

- 使用 Docker 一键启动 MySQL 与 MinIO
- 对齐前端 `collabedit-fe` 与后端 `collabedit-node-backend` 的环境配置
- 确保文件上传/下载、接口联调可用

## 前置检查

- 确认 Docker Desktop 正常运行（状态 Running）
- 确认本机 3306、9000、9001 端口未被占用

## 容器启动方案

- MySQL：创建数据库 `collabedit`，root 密码 `password`
- MinIO：控制台 `9001`，服务端口 `9000`，bucket `collabedit-files`

### 启动命令（PowerShell / CMD）

- MySQL
- 运行：`docker run --name collabedit-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=collabedit -d mysql:8`
- MinIO
- 运行：`docker run --name collabedit-minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin -d minio/minio server /data --console-address ":9001"`
- Bucket 初始化
- 打开 `http://127.0.0.1:9001` → 登录 → 新建 bucket `collabedit-files`

## 后端配置对齐

- 环境变量文件：`[e:/job-project/collabedit-node-backend/.env.example](e:/job-project/collabedit-node-backend/.env.example)`
- 需要的关键配置：
- `DATABASE_URL="mysql://root:password@localhost:3306/collabedit"`
- `MINIO_ENDPOINT=127.0.0.1`
- `MINIO_PORT=9000`
- `MINIO_USE_SSL=false`
- `MINIO_ACCESS_KEY=minioadmin`
- `MINIO_SECRET_KEY=minioadmin`
- `MINIO_BUCKET=collabedit-files`

## 后端启动步骤

- 进入后端目录：`[e:/job-project/collabedit-node-backend](e:/job-project/collabedit-node-backend)`
- 安装依赖、初始化 Prisma、启动服务
- 验证接口：
- `GET /dict/list?dictType=FILE_TYPE`
- `POST /getPlan/getPageList`

## 前端联调对齐

- 前端请求配置参考：`[e:/job-project/collabedit-fe/src/config/axios/service.ts](e:/job-project/collabedit-fe/src/config/axios/service.ts)`
- 确认前端 `baseURL` 指向后端服务地址
- 验证：列表接口、上传接口、下载接口

## 可选：Docker Compose 方案

- 提供 `docker-compose.yml` 统一管理 MySQL/MinIO（可选执行）

## 验证清单

- MySQL 可连接、数据库 `collabedit` 已创建
- MinIO 控制台可登录、bucket 已创建
- 后端能连接 MySQL、MinIO
- 前端接口请求返回 `{ code, data, msg }`

## Todos

- docker-up: 启动 MySQL 与 MinIO 容器
- env-align: 对齐后端 `.env` 与 MinIO bucket
- backend-up: Prisma 初始化与后端启动
- fe-align: 前端 baseURL 对齐与联调验证
