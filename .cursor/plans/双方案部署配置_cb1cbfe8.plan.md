---
name: 双方案部署配置
overview: 提供两种部署方案：方案A（同一服务器部署）和方案B（跨服务器部署），包含完整的 docker-compose.yml、nginx.conf 和环境变量配置。
todos:
  - id: update-env-prod
    content: 修改 .env.prod 添加 VITE_WS_URL=/ws 和 VITE_SKIP_AUTH=true
    status: completed
  - id: build-frontend
    content: 执行 pnpm build:prod 打包前端
    status: completed
  - id: create-nginx-conf
    content: 根据部署方案创建 nginx.conf 文件
    status: completed
  - id: create-docker-compose
    content: 根据部署方案创建 docker-compose.yml
    status: completed
  - id: deploy-middleware
    content: 启动中间件容器并验证日志
    status: completed
  - id: deploy-nginx
    content: 启动 nginx 容器并验证 WebSocket 连接
    status: completed
isProject: false
---

# 协同编辑平台部署配置（双方案）

## 问题根因

从截图分析，WebSocket 错误 `The URL '/ws/collaboration/...' is invalid` 的原因是：

1. **nginx.conf 未挂载** - nginx 容器使用默认配置，没有 WebSocket 代理
2. **中间件未启动** - docker-compose.yml 中没有中间件服务
3. **跨服务器时 nginx 未配置正确的中间件地址**

---

## 方案 A：同一服务器部署（推荐）

前端 + Nginx + 中间件都在 **192.168.20.174**

### A1. docker-compose.yml（完整版）

```yaml
version: '3.8'

services:
  # Nginx 前端服务
  nginx:
    image: nginx:alpine
    container_name: collabedit-nginx
    ports:
      - "8001:80"
    volumes:
      # 前端构建产物
      - /data/jiuyuan/dist:/usr/share/nginx/html:ro
      # Nginx 配置文件（必须挂载！）
      - /data/jiuyuan/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - middleware
    restart: unless-stopped
    networks:
      - webnet

  # WebSocket 协同中间件
  middleware:
    image: collaborative-middleware:latest
    container_name: collabedit-middleware
    environment:
      - NODE_ENV=production
      - COLLABORATIVE_MIDDLEWARE_PORT=3001
    expose:
      - "3001"
    restart: unless-stopped
    networks:
      - webnet

networks:
  webnet:
    driver: bridge
```

### A2. nginx.conf（同服务器版）

```nginx
# 后端服务地址
upstream java_backend {
    server 192.168.2.140:8080;  # Java 后端地址
    keepalive 32;
}

# 中间件地址（Docker 内部网络，使用容器名）
upstream ws_middleware {
    server middleware:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Java API 代理
    location /api/ {
        proxy_pass http://java_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 100m;
    }

    # WebSocket 协同编辑代理
    location /ws/collaboration {
        proxy_pass http://ws_middleware/collaboration;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # WebSocket Markdown 协同代理
    location /ws/markdown {
        proxy_pass http://ws_middleware/markdown;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

### A3. 前端 .env.prod 配置

```bash
# WebSocket 使用 nginx 代理
VITE_WS_URL=/ws

# 跳过登录验证
VITE_SKIP_AUTH=true
VITE_EXTERNAL_TOKEN_LOGIN=false
```

### A4. 部署步骤

```bash
# 1. 上传文件到服务器 192.168.20.174
scp dist-prod/* root@192.168.20.174:/data/jiuyuan/dist/
scp nginx.conf root@192.168.20.174:/data/jiuyuan/nginx.conf
scp docker-compose.yml root@192.168.20.174:/data/jiuyuan/docker-compose.yml
scp collaborative-middleware.tar root@192.168.20.174:/data/jiuyuan/

# 2. SSH 到服务器
ssh root@192.168.20.174
cd /data/jiuyuan

# 3. 加载中间件镜像
docker load -i collaborative-middleware.tar

# 4. 启动服务
docker-compose down
docker-compose up -d

# 5. 检查服务状态
docker-compose ps
docker-compose logs -f
```

---

## 方案 B：跨服务器部署

- 前端 + Nginx 在 **192.168.20.174**
- 中间件在 **192.168.20.179**

### B1. 192.168.20.179 服务器（中间件）

#### 启动中间件容器

```bash
# SSH 到 192.168.20.179
ssh root@192.168.20.179
cd /data/jiuyuan

# 加载镜像
docker load -i collaborative-middleware.tar

# 检查镜像是否加载成功
docker images | grep collaborative-middleware

# 停止旧容器（如果有）
docker stop collabedit-middleware 2>/dev/null
docker rm collabedit-middleware 2>/dev/null

# 启动中间件（开放 3001 端口）
docker run -d \
  --name collabedit-middleware \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e COLLABORATIVE_MIDDLEWARE_PORT=3001 \
  collaborative-middleware:latest

# 检查是否启动成功
docker ps | grep collabedit-middleware
docker logs collabedit-middleware
```

### B2. 192.168.20.174 服务器（前端 + Nginx）

#### docker-compose.yml（只有 nginx）

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: collabedit-nginx
    ports:
      - "8001:80"
    volumes:
      - /data/jiuyuan/dist:/usr/share/nginx/html:ro
      - /data/jiuyuan/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
    networks:
      - webnet

networks:
  webnet:
    driver: bridge
```

#### nginx.conf（跨服务器版）

```nginx
# 后端服务地址
upstream java_backend {
    server 192.168.2.140:8080;
    keepalive 32;
}

# 中间件地址（跨服务器，使用 IP 地址）
upstream ws_middleware {
    server 192.168.20.179:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    location / {
        try_files $uri $uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    location /api/ {
        proxy_pass http://java_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 100m;
    }

    location /ws/collaboration {
        proxy_pass http://ws_middleware/collaboration;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /ws/markdown {
        proxy_pass http://ws_middleware/markdown;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

### B3. 前端 .env.prod 配置（与方案A相同）

```bash
VITE_WS_URL=/ws
VITE_SKIP_AUTH=true
VITE_EXTERNAL_TOKEN_LOGIN=false
```

### B4. 部署步骤

```bash
# === 192.168.20.179 服务器（中间件）===
# 按照 B1 步骤启动中间件

# === 192.168.20.174 服务器（前端）===
# 1. 上传文件
scp dist-prod/* root@192.168.20.174:/data/jiuyuan/dist/
scp nginx.conf root@192.168.20.174:/data/jiuyuan/nginx.conf
scp docker-compose.yml root@192.168.20.174:/data/jiuyuan/docker-compose.yml

# 2. SSH 到服务器
ssh root@192.168.20.174
cd /data/jiuyuan

# 3. 启动 nginx
docker-compose down
docker-compose up -d

# 4. 检查状态
docker-compose ps
```

---

## 前端打包命令

```bash
# 在本地 Windows 执行
cd e:/job-project/collabedit-fe

# 确保 .env.prod 配置正确后打包
pnpm build:prod

# 打包产物在 dist-prod 目录
```

---

## 验证测试

### 1. 检查中间件是否正常

```bash
# 在 192.168.20.179（方案B）或 192.168.20.174（方案A）
docker logs collabedit-middleware

# 应该看到类似输出：
# [Nest] LOG [Bootstrap] 环境: production
# [Nest] LOG [Bootstrap] 本地地址: http://localhost:3001
# [Nest] LOG [Bootstrap] WebSocket 协同编辑服务:
# [Nest] LOG [Bootstrap] WS /collaboration
# [Nest] LOG [Bootstrap] WS /markdown
```

### 2. 检查 nginx 代理

```bash
# 访问健康检查端点
curl http://192.168.20.174:8001/health
# 应该返回 OK
```

### 3. 测试 WebSocket 连接

打开浏览器访问 `http://192.168.20.174:8001`，打开开发者工具 Network 标签，查看 WebSocket 连接是否成功。

---

## 常见问题排查

| 问题 | 可能原因 | 解决方案 |

|------|----------|----------|

| WebSocket URL invalid | nginx.conf 未挂载 | 检查 docker-compose volumes |

| 502 Bad Gateway | 中间件未启动 | `docker ps` 检查容器状态 |

| WebSocket 连接超时 | 防火墙阻止 3001 端口 | 方案B需开放 179 服务器 3001 端口 |

| 页面刷新 404 | try_files 配置缺失 | 检查 nginx.conf location / |