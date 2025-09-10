# 端口进程管理功能总结

## 已实现的功能

### 1. 智能端口检测
- 使用 `lsof -i :$port` 命令检测指定端口的所有占用进程
- 支持同时检测多个端口：`lsof -i :3001 -i :5173`
- 自动获取进程PID和详细信息

### 2. 安全进程停止
- **优雅停止**: 首先尝试 `kill -TERM` 发送终止信号
- **等待机制**: 给进程5秒时间优雅退出
- **强制终止**: 如果进程仍在运行，使用 `kill -KILL` 强制杀死
- **多进程处理**: 支持同一端口多个进程的情况

### 3. 完整的停止流程

#### 停止单个服务
```bash
stop_service_on_port $BACKEND_PORT "后端服务"
```
- 查找端口 $BACKEND_PORT 的所有进程
- 逐个停止每个进程
- 等待进程完全退出
- 强制终止顽固进程

#### 停止所有服务
```bash
stop_all() {
    echo "检查并停止后端服务 (端口: $BACKEND_PORT)"
    stop_service_on_port $BACKEND_PORT "后端服务"
    
    echo "检查并停止前端服务 (端口: $FRONTEND_PORT)"
    stop_service_on_port $FRONTEND_PORT "前端服务"
}
```

#### 重启服务
```bash
restart_all() {
    echo "第一步: 停止所有服务"
    stop_all
    
    echo "第二步: 等待进程完全释放端口"
    sleep 2
    
    echo "第三步: 重新启动所有服务"
    start_all
}
```

### 4. 端口状态监控
- 实时检测服务运行状态
- 显示进程PID和端口占用情况
- 支持查看历史日志和实时日志

## 核心函数详解

### `stop_service_on_port(port, service_name)`
```bash
stop_service_on_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        local pids=$(lsof -ti :$port)
        echo "正在停止 $service_name (端口: $port)..."
        
        for pid in $pids; do
            echo "停止进程 PID: $pid"
            kill -TERM $pid 2>/dev/null
            
            # 等待进程结束 (最多5秒)
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                sleep 0.5
                count=$((count + 1))
            done
            
            # 强制杀死顽固进程
            if kill -0 $pid 2>/dev/null; then
                echo "强制停止进程 PID: $pid"
                kill -KILL $pid 2>/dev/null
            fi
        done
        
        echo "✓ $service_name 已停止"
    else
        echo "ℹ $service_name 未在运行"
    fi
}
```

## 使用场景

### 1. 开发环境
- 快速停止开发服务器
- 释放端口用于其他服务
- 重启服务以应用配置更改

### 2. 生产环境
- 优雅停止服务
- 确保端口完全释放
- 支持滚动更新

### 3. 故障排除
- 强制释放被占用的端口
- 清理僵尸进程
- 服务状态诊断

## 安全特性

1. **优雅停止优先**: 先尝试正常终止，再强制杀死
2. **超时保护**: 避免无限等待，最多等待5秒
3. **错误处理**: 忽略不存在的进程错误
4. **日志记录**: 记录所有停止操作

## 兼容性

- **macOS**: 使用 `ifconfig` 和 `lsof` 命令
- **Linux**: 支持 `ip` 和 `lsof` 命令
- **端口范围**: 支持任意端口号
- **进程类型**: 支持所有类型的网络进程

## 测试验证

脚本已经过测试验证：
1. ✅ 正确检测端口占用
2. ✅ 成功停止所有进程
3. ✅ 端口完全释放
4. ✅ 支持重启操作
5. ✅ 错误处理完善

## 总结

项目脚本 `project.sh` 已经完整实现了端口进程管理功能：

- **启动前**: 自动检测端口占用，避免冲突
- **停止时**: 智能查找并停止所有占用进程
- **重启时**: 先完全停止，再重新启动
- **监控时**: 实时显示服务状态和进程信息

所有操作都基于 `.env` 配置，无需硬编码，支持不同环境的灵活配置。
