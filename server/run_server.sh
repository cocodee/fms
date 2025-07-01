#!/bin/bash

# 构建Docker镜像
docker build -t fms-server .

# 停止并删除现有容器（如果存在）
docker stop fms-server-container >/dev/null 2>&1
docker rm fms-server-container >/dev/null 2>&1

# 启动新容器
 docker run -d -p 8088:8088 --name fms-server-container fms-server

# 显示运行状态
 echo "Server container started successfully!"
 echo "Container ID: $(docker inspect -f '{{.Id}}' fms-server-container)"
 echo "Access server at http://localhost:8088"