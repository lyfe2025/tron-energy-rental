# TRON能量租赁系统 - Docker镜像构建文件
# 作者: 系统管理员
# 描述: 用于构建TRON能量租赁系统的Docker镜像

# ========================================
# 构建阶段
# ========================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# ========================================
# 生产阶段
# ========================================
FROM node:18-alpine AS production

# 设置环境变量
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# 安装系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    postgresql-client

# 设置时区
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm tsx

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/api ./api
COPY --from=builder --chown=appuser:nodejs /app/migrations ./migrations

# 创建必要的目录
RUN mkdir -p /app/logs /app/backups && \
    chown -R appuser:nodejs /app/logs /app/backups

# 复制启动脚本
COPY deployment/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 切换到应用用户
USER appuser

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/entrypoint.sh"]

# ========================================
# 开发阶段 (可选)
# ========================================
FROM node:18-alpine AS development

# 设置环境变量
ENV NODE_ENV=development
ENV TZ=Asia/Shanghai

# 安装系统依赖
RUN apk add --no-cache \
    git \
    curl \
    tzdata \
    postgresql-client

# 设置时区
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm tsx nodemon

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖 (包括开发依赖)
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p /app/logs /app/backups

# 暴露端口
EXPOSE 3001 3000

# 启动开发服务器
CMD ["pnpm", "run", "dev"]

# ========================================
# 镜像元数据
# ========================================
LABEL maintainer="TRON Energy Rental Team"
LABEL version="1.0.0"
LABEL description="TRON能量租赁系统Docker镜像"
LABEL org.opencontainers.image.title="TRON Energy Rental System"
LABEL org.opencontainers.image.description="基于TRON网络的能量租赁管理系统"
LABEL org.opencontainers.image.vendor="TRON Energy Rental Team"
LABEL org.opencontainers.image.licenses="MIT"
