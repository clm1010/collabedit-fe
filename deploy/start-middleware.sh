#!/bin/bash
# ==========================================
# 中间件启动脚本 (192.168.20.179 服务器使用)
# ==========================================

echo "=== 协同编辑中间件启动脚本 ==="

# 加载镜像（如果还没加载）
if ! docker images | grep -q "collaborative-middleware"; then
    echo "正在加载镜像..."
    docker load -i /data/jiuyuan/collaborative-middleware.tar
fi

# 停止并删除旧容器（如果存在）
echo "停止旧容器..."
docker stop app 2>/dev/null
docker rm app 2>/dev/null

# 启动新容器
echo "启动中间件容器..."
docker run -d \
  --name app \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e COLLABORATIVE_MIDDLEWARE_PORT=3001 \
  collaborative-middleware:latest

# 检查启动状态
echo ""
echo "=== 容器状态 ==="
docker ps | grep app

echo ""
echo "=== 容器日志 ==="
docker logs app

echo ""
echo "中间件启动完成！"
echo "WebSocket 地址: ws://$(hostname -I | awk '{print $1}'):3001/collaboration"
