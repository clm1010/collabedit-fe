# 生产环境部署方案

## 服务器架构

- **前端服务器**: 192.168.20.174 (运行 Nginx + 前端静态文件)
- **中间件服务器**: 192.168.20.179 (运行 Docker 容器)
- **后端服务器**: 192.168.2.140:8080 (Java 后端)

## 部署步骤总结

### 一、前端部署 (192.168.20.174)

1. **构建前端应用**

   ```bash
   pnpm install
   pnpm build:prod
   ```

2. **上传文件到服务器**

   ```bash
   # 上传构建产物到服务器
   scp -r dist root@192.168.20.174:/data/jiuyuan/

   # 上传 Nginx 配置
   scp nginx.conf root@192.168.20.174:/usr/local/nginx/conf.d/nginx.conf

   将nginx.conf 手动配置 服务器中的nginx.conf 对比复制即可
   ```

3. **配置 Nginx**

   ```bash
   # SSH 登录到前端服务器
   ssh root@192.168.20.174

   # 测试 Nginx 配置
   nginx -t

   # 重载 Nginx
   nginx -s reload
   ```

### 二、中间件部署 (192.168.20.179)

1. **上传 Docker 镜像**

   ```bash
   # 将镜像文件上传到服务器
   scp collaborative-middleware.tar root@192.168.20.179:/data/jiuyuan/ 目录中
   ```

2. **加载 Docker 镜像**

   ```bash
   # SSH 登录到中间件服务器
   ssh root@192.168.20.179

   # 加载镜像
   docker load -i /tmp/collaborative-middleware.tar

   # 查看加载的镜像
   docker images
   ```

3. **停止并删除旧容器**

   ```bash
   # 停止名为 "app" 的容器
   docker stop app

   # 删除名为 "app" 的容器
   docker rm app
   ```

4. **运行新容器**

   ```bash
   # 运行名为 "app" 的中间件容器
   docker run -d \
     --name app \
     --restart=always \
     -p 3001:3001 \
     collaborative-middleware:latest

   # 查看容器状态
   docker ps -a | grep app

   # 查看容器日志
   docker logs -f app
   ```

## 中间件容器管理命令

### 停止容器

```bash
docker stop app
```

### 启动已停止的容器

```bash
docker start app
```

### 重启容器

```bash
docker restart app
```

### 删除容器

```bash
docker stop app
docker rm app
```

### 查看容器日志

```bash
# 实时查看日志
docker logs -f app

# 查看最近100行日志
docker logs --tail 100 app
```

### 进入容器内部

```bash
docker exec -it app /bin/sh
```

## 验证部署

1. **验证前端访问**

   ```
   浏览器访问: http://192.168.20.174
   ```

2. **验证中间件连接**

   ```bash
   # 测试 WebSocket 连接
   curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: test" \
     http://192.168.20.179:3001/collaboration
   ```

3. **验证完整流程**
   - 登录系统
   - 打开协同编辑功能
   - 测试多人协同编辑

## 快速部署脚本

### 前端服务器 (192.168.20.174)

```bash
#!/bin/bash
# deploy-frontend.sh

# 构建前端
pnpm build:prod

# 上传到服务器
scp -r dist root@192.168.20.174:/data/jiuyuan/
scp nginx-bs.conf root@192.168.20.174:/etc/nginx/conf.d/collabedit.conf

# 重载 Nginx
ssh root@192.168.20.174 "nginx -t && nginx -s reload"

echo "前端部署完成！"
```

### 中间件服务器 (192.168.20.179)

```bash
#!/bin/bash
# deploy-middleware.sh

# 上传镜像
scp collaborative-middleware.tar root@192.168.20.179:/tmp/

# 部署容器
ssh root@192.168.20.179 << 'EOF'
  # 加载镜像
  docker load -i /tmp/collaborative-middleware.tar

  # 停止并删除旧容器
  docker stop app 2>/dev/null || true
  docker rm app 2>/dev/null || true

  # 运行新容器
  docker run -d \
    --name app \
    --restart=always \
    -p 3001:3001 \
    collaborative-middleware:latest

  # 查看状态
  docker ps | grep app
EOF

echo "中间件部署完成！"
```

## 注意事项

1. **网络配置**: 确保 192.168.20.174 可以访问 192.168.20.179:3001
2. **防火墙**: 开放必要的端口 (80, 3001)
3. **Docker 权限**: 确保有执行 Docker 命令的权限
4. **磁盘空间**: 确保服务器有足够的磁盘空间
5. **备份**: 部署前备份当前运行的容器和数据
