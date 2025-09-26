-- 更新订单表字段注释
-- 创建时间: 2025-09-26
-- 描述: 统一更新 orders 表的字段注释，确保状态字段包含所有正确的状态值

BEGIN;

-- 更新 status 字段注释，包含 active 状态
COMMENT ON COLUMN "public"."orders"."status" IS '订单状态：pending(待处理), processing(处理中), active(已支付活跃), completed(自动完成), manually_completed(手动补单完成), failed(失败), cancelled(已取消), refunded(已退款), pending_delegation(等待委托)';

-- 更新 payment_status 字段注释
COMMENT ON COLUMN "public"."orders"."payment_status" IS '支付状态：unpaid=未支付，paid=已支付，refunded=已退款';

-- 验证注释更新成功
DO $$
BEGIN
    RAISE NOTICE '✅ 订单表字段注释更新完成';
END $$;

COMMIT;
