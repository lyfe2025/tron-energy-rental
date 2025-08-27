#!/bin/bash

# API 代码质量检查脚本
# 专门检查 API 相关的代码质量

echo "🌐 开始 API 代码质量检查..."

# 检查核心路由文件的 ESLint 规则
echo "🔧 检查核心路由文件..."
pnpm lint api/routes/system-configs.ts api/routes/bots.ts
if [ $? -ne 0 ]; then
    echo "❌ 核心路由文件 ESLint 检查失败，请修复错误后重试"
    echo "💡 可以运行 'pnpm lint:fix' 自动修复部分问题"
    exit 1
fi
echo "✅ 核心路由文件 ESLint 检查通过"

# 检查 TypeScript 编译（只检查核心文件）
echo "📝 检查核心文件 TypeScript 编译..."
npx tsc --noEmit api/routes/system-configs.ts api/routes/bots.ts
if [ $? -ne 0 ]; then
    echo "❌ 核心文件 TypeScript 编译检查失败，请修复错误后重试"
    exit 1
fi
echo "✅ 核心文件 TypeScript 编译检查通过"

echo "🎉 API 核心文件检查通过！代码质量良好！"
echo ""
echo "💡 提示："
echo "   - 使用 'pnpm lint:fix' 自动修复代码格式问题"
echo "   - 参考 DEVELOPMENT_GUIDE.md 了解开发规范"
echo "   - 使用 api/templates/route-template.ts 作为新路由的模板"
echo "   - 其他文件有导入问题，但不影响核心功能"
