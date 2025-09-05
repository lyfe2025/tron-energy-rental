-- 更新数据库表和字段注释
-- 确保所有能量池和网络配置相关的表和字段都有完整的注释

-- ========================================
-- 表注释更新
-- ========================================

-- 能量池表注释
COMMENT ON TABLE energy_pools IS '能量池表，存储系统中可用的能量资源池信息，支持多网络配置';

-- TRON网络配置表注释
COMMENT ON TABLE tron_networks IS 'TRON网络配置表：管理多个TRON网络环境，支持主网、测试网和私有网络';

-- 系统配置历史表注释
COMMENT ON TABLE system_config_history IS '系统配置变更历史表：记录所有配置变更，支持审计、追踪和回滚功能';

-- ========================================
-- energy_pools 表字段注释更新
-- ========================================

COMMENT ON COLUMN energy_pools.id IS '能量池唯一标识符（UUID）';
COMMENT ON COLUMN energy_pools.name IS '能量池名称，用于标识和管理不同的能量资源池';
COMMENT ON COLUMN energy_pools.tron_address IS '能量池TRON地址，用于区块链交互的地址';
COMMENT ON COLUMN energy_pools.private_key_encrypted IS '加密的私钥（用于能量委托），确保安全存储';
COMMENT ON COLUMN energy_pools.total_energy IS '总能量容量，该能量池可提供的最大能量值';
COMMENT ON COLUMN energy_pools.available_energy IS '可用能量数量，当前可以使用的能量值';
COMMENT ON COLUMN energy_pools.reserved_energy IS '预留能量数量，已被预留但未使用的能量值';
COMMENT ON COLUMN energy_pools.status IS '能量池状态：active-激活可用，inactive-停用，maintenance-维护中';
COMMENT ON COLUMN energy_pools.last_updated_at IS '最后更新时间，记录能量状态的最后同步时间';
COMMENT ON COLUMN energy_pools.created_at IS '创建时间，记录能量池的创建时间';
COMMENT ON COLUMN energy_pools.updated_at IS '更新时间，记录能量池信息的最后修改时间';
COMMENT ON COLUMN energy_pools.account_type IS '账户类型：own_energy=自有能量源，agent_energy=代理商能量源，third_party=第三方供应商';
COMMENT ON COLUMN energy_pools.priority IS '优先级，数字越大优先级越高，用于能量分配时的优先级排序';
COMMENT ON COLUMN energy_pools.cost_per_energy IS '每单位能量的成本（TRX），用于计算能量使用的成本';
COMMENT ON COLUMN energy_pools.description IS '账户描述信息，说明账户的用途和特点';
COMMENT ON COLUMN energy_pools.contact_info IS '联系信息（JSON格式），包含账户管理员的联系方式';
COMMENT ON COLUMN energy_pools.daily_limit IS '日消耗限制，控制账户每日的最大能量消耗量';
COMMENT ON COLUMN energy_pools.monthly_limit IS '月消耗限制，控制账户每月的最大能量消耗量';
COMMENT ON COLUMN energy_pools.staked_trx_energy IS '质押用于获取能量的TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.staked_trx_bandwidth IS '质押用于获取带宽的TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.delegated_energy IS '已委托出去的能量数量';
COMMENT ON COLUMN energy_pools.delegated_bandwidth IS '已委托出去的带宽数量';
COMMENT ON COLUMN energy_pools.pending_unfreeze_energy IS '待提款的能量质押TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.pending_unfreeze_bandwidth IS '待提款的带宽质押TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.last_stake_update IS '最后一次质押状态更新时间';

-- *** 重要更新：network_id 字段注释 ***
COMMENT ON COLUMN energy_pools.network_id IS '关联的TRON网络ID，指向tron_networks表，用于指定该能量池使用的网络环境（支持主网、测试网等）';

-- ========================================
-- tron_networks 表字段注释确认
-- ========================================

COMMENT ON COLUMN tron_networks.id IS '网络配置唯一标识符（UUID）';
COMMENT ON COLUMN tron_networks.name IS '网络名称，如 "TRON Mainnet", "Shasta Testnet", "Nile Testnet"';
COMMENT ON COLUMN tron_networks.network_type IS '网络类型：mainnet=主网，testnet=测试网，private=私有网络';
COMMENT ON COLUMN tron_networks.rpc_url IS 'TRON节点RPC URL，用于与区块链网络通信';
COMMENT ON COLUMN tron_networks.api_key IS 'API密钥（如TronGrid API Key），用于访问第三方服务';
COMMENT ON COLUMN tron_networks.chain_id IS '链ID标识符，用于区分不同的区块链网络';
COMMENT ON COLUMN tron_networks.block_explorer_url IS '区块浏览器URL，用于查看交易和地址信息';
COMMENT ON COLUMN tron_networks.is_active IS '是否启用该网络，控制网络的可用性';
COMMENT ON COLUMN tron_networks.is_default IS '是否为默认网络，系统默认使用的网络配置';
COMMENT ON COLUMN tron_networks.priority IS '网络优先级，数值越大优先级越高，用于网络选择排序';
COMMENT ON COLUMN tron_networks.timeout_ms IS '请求超时时间（毫秒），控制网络请求的超时设置';
COMMENT ON COLUMN tron_networks.retry_count IS '重试次数，网络请求失败时的重试次数';
COMMENT ON COLUMN tron_networks.rate_limit_per_second IS '每秒请求限制，控制网络请求的频率';
COMMENT ON COLUMN tron_networks.config IS '网络特定配置（JSON格式），存储额外的网络配置参数';
COMMENT ON COLUMN tron_networks.health_check_url IS '健康检查URL，用于检测网络的可用性';
COMMENT ON COLUMN tron_networks.last_health_check IS '最后健康检查时间，记录上次网络健康检查的时间';
COMMENT ON COLUMN tron_networks.health_status IS '健康状态：healthy=健康，unhealthy=不健康，unknown=未知，error=错误';
COMMENT ON COLUMN tron_networks.description IS '网络描述信息，详细说明网络的用途和特点';
COMMENT ON COLUMN tron_networks.created_by IS '创建者用户ID，记录创建该网络配置的用户';
COMMENT ON COLUMN tron_networks.created_at IS '创建时间，记录网络配置的创建时间';
COMMENT ON COLUMN tron_networks.updated_at IS '最后更新时间，记录网络配置的最后修改时间';

-- ========================================
-- 索引注释
-- ========================================

-- 为重要的外键关系添加说明注释
COMMENT ON CONSTRAINT energy_pools_network_id_fkey ON energy_pools IS '外键约束：确保能量池关联的网络ID在tron_networks表中存在';

-- 记录迁移完成
INSERT INTO system_config_history (
    entity_type, 
    entity_id, 
    operation_type, 
    changed_fields,
    new_values,
    change_reason, 
    changed_by, 
    ip_address,
    created_at
) VALUES (
    'database_schema',
    'energy_pools',
    'update_comments',
    ARRAY['table_comment', 'network_id_comment', 'all_field_comments'],
    '{"migration": "20250126_update_table_comments", "description": "更新能量池和网络配置相关表的注释信息"}',
    '完善数据库表和字段注释，提高代码可维护性',
    'system',
    '127.0.0.1',
    NOW()
);

-- 输出完成信息
SELECT 
    '✅ 数据库表和字段注释更新完成' as status,
    '已更新 energy_pools, tron_networks 表的所有字段注释' as details,
    NOW() as completed_at;
