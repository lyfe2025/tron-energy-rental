#!/bin/bash

# TRON能量租赁系统API测试脚本 - 更新版
# 使用正确的管理员邮箱进行测试

echo "=== TRON能量租赁系统API测试报告 ==="
echo "测试时间: $(date)"
echo "服务器地址: http://localhost:3001"
echo ""

# 1. 测试数据库连接
echo "1. 测试数据库连接 - GET /api/test/db"
response=$(curl -s http://localhost:3001/api/test/db)
echo "响应: $response"
echo ""

# 2. 测试管理员登录 - 使用正确的邮箱
echo "2. 测试管理员登录 - POST /api/auth/login"
echo "使用邮箱: admin@tronrental.com, 密码: admin123"
login_response=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tronrental.com","password":"admin123"}')
echo "登录响应: $login_response"

# 尝试提取token（如果登录成功）
token=$(echo $login_response | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$token" ]; then
    echo "登录成功，获取到token: ${token:0:20}..."
    auth_header="Authorization: Bearer $token"
else
    echo "登录失败，后续需要认证的API将返回401"
    auth_header=""
fi
echo ""

# 3. 测试用户管理API
echo "3. 测试用户管理API - GET /api/users"
if [ ! -z "$auth_header" ]; then
    users_response=$(curl -s -H "$auth_header" http://localhost:3001/api/users)
else
    users_response=$(curl -s http://localhost:3001/api/users)
fi
echo "用户列表响应: $users_response"
echo ""

# 4. 测试订单管理API
echo "4. 测试订单管理API - GET /api/orders"
if [ ! -z "$auth_header" ]; then
    orders_response=$(curl -s -H "$auth_header" http://localhost:3001/api/orders)
else
    orders_response=$(curl -s http://localhost:3001/api/orders)
fi
echo "订单列表响应: $orders_response"
echo ""

# 5. 测试价格配置API
echo "5. 测试价格配置API - GET /api/price-configs"
if [ ! -z "$auth_header" ]; then
    price_response=$(curl -s -H "$auth_header" http://localhost:3001/api/price-configs)
else
    price_response=$(curl -s http://localhost:3001/api/price-configs)
fi
echo "价格配置响应: $price_response"
echo ""

# 6. 测试机器人管理API
echo "6. 测试机器人管理API - GET /api/bots"
if [ ! -z "$auth_header" ]; then
    bots_response=$(curl -s -H "$auth_header" http://localhost:3001/api/bots)
else
    bots_response=$(curl -s http://localhost:3001/api/bots)
fi
echo "机器人列表响应: $bots_response"
echo ""

# 7. 测试能量包管理API
echo "7. 测试能量包管理API - GET /api/energy-packages"
energy_response=$(curl -s http://localhost:3001/api/energy-packages)
echo "能量包列表响应: $energy_response"
echo ""

# 8. 测试统计分析API
echo "8. 测试统计分析API - GET /api/statistics/overview"
if [ ! -z "$auth_header" ]; then
    stats_response=$(curl -s -H "$auth_header" http://localhost:3001/api/statistics/overview)
else
    stats_response=$(curl -s http://localhost:3001/api/statistics/overview)
fi
echo "统计概览响应: $stats_response"
echo ""

# 9. 测试系统配置API
echo "9. 测试系统配置API - GET /api/system-configs"
if [ ! -z "$auth_header" ]; then
    config_response=$(curl -s -H "$auth_header" http://localhost:3001/api/system-configs)
else
    config_response=$(curl -s http://localhost:3001/api/system-configs)
fi
echo "系统配置响应: $config_response"
echo ""

echo "=== API测试完成 ==="
echo "注意：如果某些API返回401错误，这是正常的权限验证机制"
echo "如果某些API返回404错误，可能需要检查路由配置"