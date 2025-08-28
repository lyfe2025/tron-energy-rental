-- 更新bots表，添加缺失的字段
ALTER TABLE bots 
ADD COLUMN IF NOT EXISTS welcome_message TEXT,
ADD COLUMN IF NOT EXISTS help_message TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS commands JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rate_limit INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS max_users INTEGER,
ADD COLUMN IF NOT EXISTS current_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- 更新现有记录的默认值
UPDATE bots SET 
  welcome_message = '欢迎使用TRON能量租赁服务！',
  help_message = '使用 /help 查看可用命令',
  error_message = '抱歉，服务暂时不可用，请稍后再试。',
  commands = '[]'::jsonb,
  maintenance_mode = false,
  rate_limit = 60,
  current_users = 0,
  total_messages = 0
WHERE welcome_message IS NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_bots_maintenance_mode ON bots(maintenance_mode);
CREATE INDEX IF NOT EXISTS idx_bots_last_message_at ON bots(last_message_at);