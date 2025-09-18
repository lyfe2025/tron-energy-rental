-- 安全迁移：将"区块链配置"菜单更新为"资源消耗配置"
-- 执行前请备份数据库：scripts/database/backup-database.sh

-- 1. 检查当前旧菜单项
SELECT 
    id,
    name,
    path,
    component,
    permission,
    parent_id
FROM menus 
WHERE name = '区块链配置' 
   OR path = '/config/blockchain';

-- 2. 更新旧的区块链配置菜单项为资源消耗配置
UPDATE menus 
SET 
    name = '资源消耗配置',
    path = '/config/resource-consumption',
    component = 'ResourceConsumption',
    permission = 'config:resource-consumption:view',
    updated_at = NOW()
WHERE name = '区块链配置' 
  AND path = '/config/blockchain';

-- 3. 验证更新结果
SELECT 
    m.id,
    m.name,
    m.path,
    m.component,
    m.permission,
    p.name as parent_menu
FROM menus m
LEFT JOIN menus p ON m.parent_id = p.id
WHERE m.name = '资源消耗配置'
ORDER BY m.id DESC;

-- 4. 检查是否还有其他blockchain相关的菜单项
SELECT 
    id,
    name,
    path,
    component
FROM menus 
WHERE LOWER(name) LIKE '%blockchain%' 
   OR LOWER(path) LIKE '%blockchain%'
   OR LOWER(component) LIKE '%blockchain%';
