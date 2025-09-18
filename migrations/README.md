# 数据库迁移文件说明

## 迁移记录

### 2025-09-18
- **update_blockchain_to_resource_consumption_menu.sql**: 将"区块链配置"菜单更新为"资源消耗配置"
  - 更新菜单名称: `区块链配置` → `资源消耗配置`
  - 更新路径: `/config/blockchain` → `/config/resource-consumption`
  - 更新组件: `BlockchainConfig` → `ResourceConsumption`
  - 更新权限: `config:blockchain:view` → `config:resource-consumption:view`

### 已归档文件
- **archived_add_blockchain_config_menu.sql.bak**: 原始的区块链配置菜单添加脚本（已备份）

## 执行说明

1. 执行迁移前务必备份数据库：
   ```bash
   scripts/database/backup-database.sh
   ```

2. 执行迁移脚本：
   ```bash
   psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -f migrations/update_blockchain_to_resource_consumption_menu.sql
   ```

3. 验证迁移结果：
   ```sql
   SELECT id, name, path, permission FROM menus WHERE path = '/config/resource-consumption';
   ```