#!/bin/bash

# 开发检查脚本
# 在提交代码前运行此脚本，确保代码质量

echo "🔍 开始代码质量检查..."

# 检查 TypeScript 类型
echo "📝 检查 TypeScript 类型..."
pnpm type-check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript 类型检查失败，请修复错误后重试"
    exit 1
fi
echo "✅ TypeScript 类型检查通过"

# 检查 ESLint 规则
echo "🔧 检查 ESLint 规则..."
pnpm lint
if [ $? -ne 0 ]; then
    echo "❌ ESLint 检查失败，请修复错误后重试"
    echo "💡 可以运行 'pnpm lint:fix' 自动修复部分问题"
    exit 1
fi
echo "✅ ESLint 检查通过"

# 检查 API 特定类型
echo "🌐 检查 API 类型..."
pnpm type-check:api
if [ $? -ne 0 ]; then
    echo "❌ API 类型检查失败，请修复错误后重试"
    exit 1
fi
echo "✅ API 类型检查通过"

echo "🎉 所有检查通过！代码质量良好，可以提交了！"
echo ""
echo "💡 提示："
echo "   - 使用 'pnpm lint:fix' 自动修复代码格式问题"
echo "   - 使用 'pnpm type-check' 随时检查类型"
echo "   - 参考 DEVELOPMENT_GUIDE.md 了解开发规范"
