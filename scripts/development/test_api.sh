#!/bin/bash

# TRON能量租赁系统API测试脚本
echo "=== TRON能量租赁系统API测试 ==="
echo "服务器地址: http://localhost:3001"
echo ""

# 1. 测试数据库连接
echo "1. 测试数据库连接"
echo "GET /api/test/db"
response=$(curl -s http://localhost:3001/api/test/db)
echo "响应: $response"
echo ""

# 2. 测试管理员登录
echo "2. 测试管理员登录"
echo "POST /api/auth/login"
login_response=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')
echo "响应: $login_response"
echo ""

# 3. 测试用户管理API（无认证）
echo "3. 测试用户管理API（无认证）"
echo "GET /api/users"
users_response=$(curl -s http://localhost:3001/api/users)
echo "响应: $users_response"
echo ""

# 4. 测试订单管理API（无认证）
echo "4. 测试订单管理API（无认证）"
echo "GET /api/orders"
orders_response=$(curl -s http://localhost:3001/api/orders)
echo "响应: $orders_response"
echo ""

# 5. 测试价格配置API
echo "5. 测试价格配置API"
echo "GET /api/price-configs"
price_response=$(curl -s http://localhost:3001/api/price-configs)
echo "响应: $price_response"
echo ""

# 6. 测试机器人管理API（无认证）
echo "6. 测试机器人管理API（无认证）"
echo "GET /api/bots"
bots_response=$(curl -s http://localhost:3001/api/bots)
echo "响应: $bots_response"
echo ""

# 7. 测试能量包管理API
echo "7. 测试能量包管理API"
echo "GET /api/energy-packages"
energy_response=$(curl -s http://localhost:3001/api/energy-packages)
echo "响应: $energy_response"
echo ""

# 8. 测试统计分析API（无认证）
echo "8. 测试统计分析API（无认证）"
echo "GET /api/statistics/overview"
stats_response=$(curl -s http://localhost:3001/api/statistics/overview)
echo "响应: $stats_response"
echo ""

# 9. 测试系统配置API（无认证）
echo "9. 测试系统配置API（无认证）"
echo "GET /api/system-configs"
config_response=$(curl -s http://localhost:3001/api/system-configs)
echo "响应: $config_response"
echo ""

echo "=== API测试完成 ==="