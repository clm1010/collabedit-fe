# 协同编辑平台部署指南

## 部署文件说明

```
deploy/
├── nginx-same-server.conf       # 方案A: 同服务器 nginx 配置
├── nginx-cross-server.conf      # 方案B: 跨服务器 nginx 配置
├── docker-compose-same-server.yml    # 方案A: 同服务器 docker-compose
├── docker-compose-cross-server.yml   # 方案B: 跨服务器 docker-compose
├── start-middleware.sh          # 中间件启动脚本（方案B使用）
└── README.md                    # 本文件
```

---

## 方案 A：同一服务器部署

前端 + Nginx + 中间件都在 **192.168.20.174**

### 步骤

```bash
# 1. 本地打包前端（Windows）
cd e:/job-project/collabedit-fe
pnpm build:prod

# 2. 上传文件到服务器
scp -r dist-prod/* root@192.168.20.174:/data/jiuyuan/dist/
scp deploy/nginx-same-server.conf root@192.168.20.174:/data/jiuyuan/nginx.conf
scp deploy/docker-compose-same-server.yml root@192.168.20.174:/data/jiuyuan/docker-compose.yml
scp collaborative-middleware.tar root@192.168.20.174:/data/jiuyuan/

# 3. SSH 到服务器执行
ssh root@192.168.20.174
cd /data/jiuyuan
docker load -i collaborative-middleware.tar
docker-compose down
docker-compose up -d
docker-compose logs -f
```

---

## 方案 B：跨服务器部署

- 前端 + Nginx 在 **192.168.20.174**
- 中间件在 **192.168.20.179**

### 部署架构说明

```
192.168.20.174 (前端服务器)     192.168.20.179 (中间件服务器)
+-------------------------+    +-------------------------+
|  docker-compose.yml     |    |  不需要 docker-compose  |
|  └── nginx 容器         |    |  直接 docker run 启动   |
|                         |    |  └── middleware 容器    |
+-------------------------+    +-------------------------+
```

**为什么 192.168.20.179 不需要 docker-compose？**

- docker-compose 适合管理多个相互依赖的容器
- 192.168.20.179 只运行一个中间件容器，直接用 `docker run` 更简单
- 中间件镜像已打包为 tar 文件，只需 `docker load` 加载后运行

**192.168.20.179 需要上传的文件：**

- `collaborative-middleware.tar` - 中间件 Docker 镜像
- `start-middleware.sh` - 启动脚本（可选，也可以手动执行 docker run）

### 步骤 1：部署中间件（192.168.20.179）

```bash
# SSH 到中间件服务器
ssh root@192.168.20.179
cd /data/jiuyuan

# 方法1：使用脚本启动
chmod +x start-middleware.sh
./start-middleware.sh

# 方法2：手动启动
docker load -i collaborative-middleware.tar
docker stop app 2>/dev/null
docker rm app 2>/dev/null
docker run -d \
  --name app \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e COLLABORATIVE_MIDDLEWARE_PORT=3001 \
  collaborative-middleware:latest

# 验证
docker logs app
```

### 步骤 2：部署前端（192.168.20.174）

```bash
# 本地打包前端（Windows）
cd e:/job-project/collabedit-fe
pnpm build:prod

# 上传文件
scp -r dist-prod/* root@192.168.20.174:/data/jiuyuan/dist/
scp deploy/nginx-cross-server.conf root@192.168.20.174:/data/jiuyuan/nginx.conf
scp deploy/docker-compose-cross-server.yml root@192.168.20.174:/data/jiuyuan/docker-compose.yml

# SSH 到服务器执行
ssh root@192.168.20.174
cd /data/jiuyuan
docker-compose down
docker-compose up -d
docker-compose logs -f
```

---

## 验证测试

### 1. 检查中间件

```bash
docker logs app

# 应该看到：
# [Nest] LOG [Bootstrap] 环境: production
# [Nest] LOG [Bootstrap] 本地地址: http://localhost:3001
# [Nest] LOG [Bootstrap] WS /collaboration
# [Nest] LOG [Bootstrap] WS /markdown
```

### 2. 检查 nginx

```bash
curl http://192.168.20.174:8001/health
# 应该返回 OK
```

### 3. 测试 WebSocket

打开浏览器访问 `http://192.168.20.174:8001`，进入协同编辑页面，查看 Network 标签中 WebSocket 是否连接成功。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| WebSocket URL invalid | nginx.conf 未挂载 | 检查 docker-compose volumes 配置 |
| 502 Bad Gateway | 中间件未启动 | `docker ps` 检查容器状态 |
| WebSocket 连接超时 | 防火墙阻止 3001 端口 | 方案B需开放 179 服务器 3001 端口 |
| 页面刷新 404 | try_files 配置缺失 | 检查 nginx.conf location / |
| 方案B为什么179不需要docker-compose | 中间件只有一个容器，没有服务编排需求 | 直接用 `docker run` 启动更简单，参考"步骤 1" |
| 方案B的179服务器需要什么文件 | 只需镜像和启动脚本 | 上传 `collaborative-middleware.tar` 和 `start-middleware.sh`（可选） |

---

## 环境变量说明

### 前端 .env.prod

```bash
VITE_WS_URL=/ws                  # WebSocket 通过 nginx 代理
VITE_SKIP_AUTH=true              # 跳过登录验证
VITE_EXTERNAL_TOKEN_LOGIN=false  # 关闭外部 token 模式
```

### 中间件

| 变量 | 说明 | 默认值 |
|------|------|--------|
| NODE_ENV | 环境 | production |
| COLLABORATIVE_MIDDLEWARE_PORT | 服务端口 | 3001 |
