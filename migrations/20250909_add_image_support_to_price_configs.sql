-- 为价格配置表添加图片支持
-- 执行日期: 2025-09-09
-- 作者: AI Assistant
-- 说明: 支持价格配置中的图片上传和显示

-- 添加图片相关字段到 price_configs 表
ALTER TABLE price_configs 
ADD COLUMN image_url TEXT DEFAULT NULL,
ADD COLUMN image_alt TEXT DEFAULT NULL,
ADD COLUMN enable_image BOOLEAN DEFAULT FALSE;

-- 添加索引
CREATE INDEX idx_price_configs_enable_image ON price_configs(enable_image);

-- 添加字段注释
COMMENT ON COLUMN price_configs.image_url IS '价格配置关联的图片URL地址';
COMMENT ON COLUMN price_configs.image_alt IS '图片的替代文本描述';
COMMENT ON COLUMN price_configs.enable_image IS '是否启用图片显示';

-- 添加约束：如果启用图片，图片URL不能为空
ALTER TABLE price_configs 
ADD CONSTRAINT check_image_url_required 
CHECK (
  (enable_image = FALSE) OR 
  (enable_image = TRUE AND image_url IS NOT NULL AND LENGTH(TRIM(image_url)) > 0)
);

-- 更新 updated_at 触发器（如果存在的话）
-- 触发器应该已经存在，这里不需要重新创建

-- 插入一些示例数据（可选）
-- 这里我们不插入示例数据，等待实际配置
