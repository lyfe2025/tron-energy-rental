-- 添加TRX闪兑配置数据
INSERT INTO price_configs (mode_type, name, description, config, is_active, created_at, updated_at) VALUES (
  'trx_exchange',
  'TRX闪兑服务',
  'USDT自动兑换TRX服务，转U自动回TRX，1U起换',
  '{
    "exchange_address": "TM263fmPZfpjjnN2ec9uVEoNgg23456789",
    "min_amount": 1.0,
    "usdt_to_trx_rate": 2.6502,
    "trx_to_usdt_rate": 29.8900,
    "rate_update_interval": 5,
    "notes": [
      "🔸回其他地址联系客服",
      "🚫请不要使用交易所转账，丢失自负"
    ],
    "is_auto_exchange": true
  }',
  false,
  NOW(),
  NOW()
);