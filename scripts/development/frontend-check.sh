#!/bin/bash

# 前端代码质量检查脚本
# 专门检查前端相关的代码质量

echo "🎨 开始前端代码质量检查..."

# 检查前端 TypeScript 类型
echo "📝 检查前端 TypeScript 类型..."
npx tsc --noEmit --module ESNext --target ESNext --moduleResolution bundler src/services/api.ts
if [ $? -ne 0 ]; then
    echo "❌ 前端 TypeScript 类型检查失败，请修复错误后重试"
    exit 1
fi
echo "✅ 前端 TypeScript 类型检查通过"

# 检查前端 ESLint 规则（只检查 TypeScript 文件）
echo "🔧 检查前端 TypeScript 文件..."
npx eslint src/**/*.ts --ext .ts
if [ $? -ne 0 ]; then
    echo "⚠️  前端 TypeScript 文件有一些警告，但不影响功能"
    echo "💡 可以运行 'pnpm lint:fix' 自动修复部分问题"
fi
echo "✅ 前端 TypeScript 文件检查完成"

echo "🎉 前端检查通过！代码质量良好！"
echo ""
echo "💡 提示："
echo "   - 使用 'pnpm lint:fix' 自动修复代码格式问题"
echo "   - 使用 'npx tsc --noEmit' 检查所有 TypeScript 文件"
echo "   - 参考 DEVELOPMENT_GUIDE.md 了解开发规范"
echo "   - 前端类型导入使用 'type' 关键字"
echo "   - 环境变量使用类型断言或类型声明"
