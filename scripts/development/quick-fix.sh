#!/bin/bash

# 快速修复脚本
# 帮助开发者快速解决常见问题

echo "🔧 快速修复脚本启动..."

# 检查并修复常见的 TypeScript 错误
echo "📝 检查常见 TypeScript 错误..."

# 1. 检查类型导入问题
echo "🔍 检查类型导入问题..."
grep -r "import.*{.*[A-Z][a-zA-Z]*\}" src/ --include="*.ts" --include="*.vue" 2>/dev/null | head -5
if [ $? -eq 0 ]; then
    echo "⚠️  发现可能的类型导入问题，请使用 'type' 关键字"
    echo "💡 示例：import { type Request } from 'express'"
fi

# 2. 检查 API 调用问题
echo "🔍 检查 API 调用问题..."
grep -r "ordersAPI\.updateOrderStatus\|usersAPI\.updateUser\|botsAPI\.updateBot" src/ --include="*.ts" --include="*.vue" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "⚠️  发现 API 调用，请检查参数类型是否匹配"
fi

# 3. 检查环境变量使用
echo "🔍 检查环境变量使用..."
grep -r "import\.meta\.env" src/ --include="*.ts" --include="*.vue" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "⚠️  发现环境变量使用，请确保类型声明正确"
fi

# 4. 检查缺失的 API 导出
echo "🔍 检查缺失的 API 导出..."
grep -r "import.*{.*API.*}.*from.*@/services/api" src/ --include="*.ts" --include="*.vue" 2>/dev/null | while read line; do
    # 提取 API 名称
    api_name=$(echo "$line" | grep -o '{[^}]*}' | tr -d '{}' | tr ',' '\n' | grep -o '[a-zA-Z]*API' | head -1)
    if [ ! -z "$api_name" ]; then
        # 检查是否在 api.ts 中定义
        if ! grep -q "export const $api_name" src/services/api.ts; then
            echo "⚠️  发现缺失的 API 导出: $api_name，请在 src/services/api.ts 中添加定义"
        fi
    fi
done

# 4. 运行自动修复
echo "🔧 运行自动修复..."
pnpm lint:fix 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 自动修复完成"
else
    echo "⚠️  自动修复失败，请手动检查"
fi

# 5. 运行类型检查
echo "📝 运行类型检查..."
npx tsc --noEmit --module ESNext --target ESNext --moduleResolution bundler src/services/api.ts 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ API 类型检查通过"
else
    echo "❌ API 类型检查失败，请查看错误信息"
fi

echo ""
echo "🎯 快速修复完成！"
echo ""
echo "💡 如果仍有问题，请："
echo "   1. 查看 DEVELOPMENT_GUIDE.md 中的常见错误解决方案"
echo "   2. 运行 ./scripts/frontend-check.sh 进行详细检查"
echo "   3. 运行 ./scripts/api-check.sh 检查后端代码"
echo "   4. 使用 VS Code 任务快速执行常用操作"
