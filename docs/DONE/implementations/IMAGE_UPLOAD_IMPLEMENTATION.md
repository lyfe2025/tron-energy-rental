# 图片在线上传功能实现报告

## 功能概述

在原有图片配置功能基础上，新增了在线图片上传功能，支持用户直接上传图片到项目本地服务器，无需手动输入图片URL。

## 实现详情

### 1. 后端实现

#### 1.1 依赖安装
```bash
pnpm add multer @types/multer
```

#### 1.2 上传目录创建
- 创建了 `public/uploads/price-configs/` 目录用于存储上传的图片
- 配置了静态文件服务，通过 `/uploads/` 路径访问

#### 1.3 文件上传API (`api/routes/uploads.ts`)

**核心功能**:
- `POST /api/uploads/image` - 上传图片
- `GET /api/uploads/images` - 获取图片列表  
- `DELETE /api/uploads/image/:filename` - 删除图片

**安全特性**:
- 文件类型限制：仅支持 JPEG, JPG, PNG, GIF, WEBP
- 文件大小限制：最大 5MB
- 认证鉴权：需要管理员权限
- 唯一文件名：时间戳+随机数避免冲突

**文件命名规则**:
```
price-config-{timestamp}-{randomNumber}.{extension}
例如: price-config-1694234567890-123.jpg
```

#### 1.4 静态文件服务配置 (`api/app.ts`)
```typescript
// 静态文件服务 - 用于提供上传的图片
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
```

#### 1.5 机器人图片处理优化
更新了 `KeyboardBuilder.ts` 中的图片处理逻辑，使用webhook回调域名而非本地域名：
```typescript
// 构建完整的图片URL
let fullImageUrl = imageUrl;
if (imageUrl.startsWith('/uploads/')) {
  // 如果是相对路径，从当前机器人的webhook URL获取域名
  const baseUrl = await this.getWebhookBaseUrl();
  fullImageUrl = `${baseUrl}${imageUrl}`;
}
```

**重要优化**：新增 `getWebhookBaseUrl()` 方法，从数据库获取当前机器人的 webhook_url 并提取其中的域名部分，确保图片URL使用外部可访问的域名（如 `https://ed1cfac836d2.ngrok-free.app`）而不是本地域名（`http://localhost:3001`）。

### 2. 前端实现

#### 2.1 图片上传组件 (`src/components/ImageUpload.vue`)

**功能特性**:
- 拖拽上传支持
- 图片预览
- 上传进度显示
- 错误处理
- 支持删除已上传图片

**使用方式**:
```vue
<ImageUpload
  v-model="config.image_url"
  :image-alt="config.image_alt"
  @upload-success="handleImageUploadSuccess"
  @upload-error="handleImageUploadError"
/>
```

#### 2.2 价格配置页面集成
更新了 `EnergyFlashConfig.vue`：
- 替换原有的URL输入框为图片上传组件
- 添加上传成功和错误处理方法
- 保持原有的图片预览功能

### 3. API接口文档

#### 3.1 上传图片
```http
POST /api/uploads/image
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body: FormData with 'image' field

Response:
{
  "success": true,
  "message": "图片上传成功",
  "data": {
    "filename": "price-config-1694234567890-123.jpg",
    "originalname": "example.jpg",
    "size": 102400,
    "url": "/uploads/price-configs/price-config-1694234567890-123.jpg",
    "fullUrl": "http://localhost:3001/uploads/price-configs/price-config-1694234567890-123.jpg"
  }
}
```

#### 3.2 获取图片列表
```http
GET /api/uploads/images
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "filename": "price-config-1694234567890-123.jpg",
      "url": "/uploads/price-configs/price-config-1694234567890-123.jpg",
      "fullUrl": "http://localhost:3001/uploads/price-configs/price-config-1694234567890-123.jpg",
      "size": 102400,
      "uploadTime": "2023-09-09T10:30:00.000Z"
    }
  ]
}
```

#### 3.3 删除图片
```http
DELETE /api/uploads/image/{filename}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "图片删除成功"
}
```

### 4. 目录结构

```
project/
├── public/
│   └── uploads/
│       └── price-configs/          # 价格配置图片存储目录
│           ├── price-config-*.jpg
│           ├── price-config-*.png
│           └── ...
├── api/
│   └── routes/
│       └── uploads.ts              # 上传API路由
└── src/
    └── components/
        └── ImageUpload.vue         # 图片上传组件
```

### 5. 环境变量配置

可以通过环境变量配置基础URL（用于Telegram机器人发送图片）:
```env
APP_BASE_URL=http://localhost:3001
```

### 6. 测试功能

提供了测试页面 `test-upload-feature.html`：
- 认证测试
- 图片上传测试
- 图片列表获取测试
- 图片删除测试

### 7. 使用流程

#### 管理员操作流程：
1. 进入价格配置页面
2. 选择对应模式（能量闪租/笔数套餐/TRX闪兑）
3. 启用图片显示开关
4. 通过拖拽或点击上传图片
5. 填写图片描述（可选）
6. 保存配置

#### 用户体验：
- 在Telegram中触发机器人回复时，会收到带图片的消息
- 图片加载失败时自动降级为纯文本显示

### 8. 安全考虑

1. **权限控制**: 仅管理员可以上传/删除图片
2. **文件类型验证**: 严格限制图片格式
3. **文件大小限制**: 防止大文件攻击
4. **唯一文件名**: 防止文件名冲突和路径遍历
5. **错误处理**: 完善的错误信息返回

### 9. 性能优化

1. **静态文件服务**: 通过Express静态服务提供图片
2. **文件大小限制**: 避免服务器存储压力
3. **错误恢复**: 图片加载失败时的优雅降级

### 10. 维护说明

- 定期清理未使用的图片文件
- 监控上传目录的磁盘空间使用
- 可以考虑添加图片压缩功能

## 技术栈

- **后端**: Node.js + Express + Multer + TypeScript
- **前端**: Vue 3 + TypeScript + 拖拽API
- **存储**: 本地文件系统
- **认证**: JWT Token

## 完成状态

✅ 文件上传API开发完成
✅ 图片上传组件开发完成
✅ 价格配置页面集成完成
✅ 机器人发送逻辑更新完成
✅ 静态文件服务配置完成
✅ 测试页面和文档完成
✅ TypeScript类型检查通过

所有功能已实现并可正常使用，支持在线图片上传并保存到项目本地！🎉
