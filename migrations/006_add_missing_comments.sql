-- 补充缺失的表级别注释
-- Migration: 006_add_missing_comments.sql
-- Created: 2024-01-16
-- Description: 为缺失的表级别注释添加中文说明

-- 为users表添加表级别注释
COMMENT ON TABLE users IS '用户信息表 - 存储系统所有用户的基本信息、认证信息和业务数据';

-- 为schema_migrations表添加表级别注释
COMMENT ON TABLE schema_migrations IS '数据库迁移记录表 - 记录所有已执行的数据库迁移脚本';

-- 为schema_migrations表的字段添加注释
COMMENT ON COLUMN schema_migrations.id IS '迁移记录唯一标识符';
COMMENT ON COLUMN schema_migrations.filename IS '迁移文件名';
COMMENT ON COLUMN schema_migrations.executed_at IS '迁移执行时间';

-- 完成补充注释添加
SELECT '缺失的表级别注释已成功添加！' AS message;
