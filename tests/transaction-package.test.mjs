/**
 * 笔数套餐功能单元测试
 * 测试核心业务逻辑和API接口
 */
import request from 'supertest';
import { expect } from 'chai';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../api/app.ts';
import { DatabaseService } from '../api/database/DatabaseService.ts';
import { TransactionPackageOrderService } from '../api/services/order/TransactionPackageOrderService.ts';
import { BatchDelegationService } from '../api/services/BatchDelegationService.ts';
import { EnergyUsageMonitorService } from '../api/services/EnergyUsageMonitorService.ts';
import { DailyFeeService } from '../api/services/DailyFeeService.ts';

describe('Transaction Package Tests', () => {
  let testUserId;
  let testPriceConfigId;
  let testOrderId;
  let authToken;

  beforeAll(async () => {
    // 设置测试环境
    console.log('Setting up test environment...');
    
    // 创建测试用户
    const userResult = await DatabaseService.getInstance().query(
      'INSERT INTO users (username, email, password_hash, login_type) VALUES ($1, $2, $3, $4) RETURNING id',
      ['test_user_tp', 'test_tp@example.com', 'test_hash', 'admin']
    );
    testUserId = userResult.rows[0].id;

    // 创建测试价格配置
    const priceConfigResult = await DatabaseService.getInstance().query(`
      INSERT INTO price_configs (
        mode_type, config_name, config_data, is_active
      ) VALUES (
        'transaction_package', 'Test Transaction Package',
        '{
          "base_price": 100,
          "price_per_transaction": 5,
          "daily_fee": 10,
          "single_transaction_energy": 65000,
          "energy_check_interval": 30000,
          "daily_fee_check_time": "00:00"
        }',
        true
      ) RETURNING id
    `);
    testPriceConfigId = priceConfigResult.rows[0].id;

    // 模拟认证token
    authToken = 'test_auth_token';
  });

  afterAll(async () => {
    // 清理测试数据
    console.log('Cleaning up test data...');
    
    if (testOrderId) {
      await DatabaseService.getInstance().query('DELETE FROM orders WHERE id = $1', [testOrderId]);
    }
    if (testPriceConfigId) {
      await DatabaseService.getInstance().query('DELETE FROM price_configs WHERE id = $1', [testPriceConfigId]);
    }
    if (testUserId) {
      await DatabaseService.getInstance().query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('TransactionPackageOrderService', () => {
    let service;

    beforeEach(() => {
      service = new TransactionPackageOrderService();
    });

    it('should create transaction package order successfully', async () => {
      const request = {
        userId: testUserId,
        priceConfigId: testPriceConfigId,
        recipientAddress: 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy',
        transactionCount: 10,
        networkId: 'mainnet'
      };

      const order = await service.createTransactionPackageOrder(request);
      testOrderId = order.id;

      expect(order).to.have.property('id');
      expect(order.order_type).to.equal('transaction_package');
      expect(order.transaction_count).to.equal(10);
      expect(order.remaining_transactions).to.equal(10);
      expect(order.used_transactions).to.equal(0);
      expect(order.status).to.equal('pending');
      expect(order.energy_amount).to.equal(650000); // 10 * 65000
    });

    it('should calculate total price correctly', async () => {
      const request = {
        userId: testUserId,
        priceConfigId: testPriceConfigId,
        recipientAddress: 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy',
        transactionCount: 5,
        networkId: 'mainnet'
      };

      const order = await service.createTransactionPackageOrder(request);
      
      // base_price(100) + price_per_transaction(5) * count(5) + daily_fee(10) = 135
      expect(order.price_trx).to.equal(135);
      
      // 清理
      await DatabaseService.getInstance().query('DELETE FROM orders WHERE id = $1', [order.id]);
    });

    it('should reject invalid TRON address', async () => {
      const request = {
        userId: testUserId,
        priceConfigId: testPriceConfigId,
        recipientAddress: 'invalid_address',
        transactionCount: 10,
        networkId: 'mainnet'
      };

      try {
        await service.createTransactionPackageOrder(request);
        expect.fail('Should have thrown error for invalid address');
      } catch (error) {
        expect(error.message).to.include('Invalid TRON address format');
      }
    });

    it('should activate order successfully', async () => {
      // 先创建订单
      const request = {
        userId: testUserId,
        priceConfigId: testPriceConfigId,
        recipientAddress: 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy',
        transactionCount: 3,
        networkId: 'mainnet'
      };

      const order = await service.createTransactionPackageOrder(request);
      
      // 激活订单
      await service.activateTransactionPackageOrder(order.id);
      
      // 验证订单状态
      const updatedOrder = await DatabaseService.getInstance().query(
        'SELECT * FROM orders WHERE id = $1',
        [order.id]
      );
      
      expect(updatedOrder.rows[0].status).to.equal('active');
      expect(updatedOrder.rows[0].payment_status).to.equal('completed');
      
      // 清理
      await DatabaseService.getInstance().query('DELETE FROM orders WHERE id = $1', [order.id]);
    });
  });

  describe('BatchDelegationService', () => {
    let service;

    beforeEach(() => {
      service = new BatchDelegationService();
    });

    it('should validate TRON address correctly', () => {
      const validAddresses = [
        'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy',
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax'
      ];

      const invalidAddresses = [
        'invalid_address',
        'TLsV52sRDL79HXGGm9yzwKibb6BeruhU', // too short
        'ALsV52sRDL79HXGGm9yzwKibb6BeruhUzy', // wrong prefix
        ''
      ];

      validAddresses.forEach(address => {
        expect(service.isValidTronAddress(address)).to.be.true;
      });

      invalidAddresses.forEach(address => {
        expect(service.isValidTronAddress(address)).to.be.false;
      });
    });
  });

  describe('API Endpoints', () => {
    it('should create transaction package order via API', async () => {
      const response = await request(app)
        .post('/api/transaction-package/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priceConfigId: testPriceConfigId,
          recipientAddress: 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy',
          transactionCount: 5,
          networkId: 'mainnet'
        });

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id');
      expect(response.body.data.order_type).to.equal('transaction_package');
      
      // 保存订单ID用于后续测试
      if (!testOrderId) {
        testOrderId = response.body.data.id;
      }
    });

    it('should get order details via API', async () => {
      if (!testOrderId) {
        // 如果没有测试订单，先创建一个
        const createResponse = await request(app)
          .post('/api/transaction-package/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            priceConfigId: testPriceConfigId,
            recipientAddress: 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy',
            transactionCount: 3,
            networkId: 'mainnet'
          });
        testOrderId = createResponse.body.data.id;
      }

      const response = await request(app)
        .get(`/api/transaction-package/orders/${testOrderId}/details`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id');
      expect(response.body.data).to.have.property('energyUsageLogs');
      expect(response.body.data).to.have.property('dailyFeeLogs');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/transaction-package/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必需字段
          priceConfigId: testPriceConfigId
        });

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.errors).to.be.an('array');
    });

    it('should validate transaction count range', async () => {
      const response = await request(app)
        .post('/api/transaction-package/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priceConfigId: testPriceConfigId,
          recipientAddress: 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy',
          transactionCount: 0, // 无效的交易数量
          networkId: 'mainnet'
        });

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });
  });

  describe('Service Integration', () => {
    it('should start and stop energy usage monitor service', async () => {
      const response1 = await request(app)
        .post('/api/transaction-package/energy-monitor/start')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).to.equal(200);
      expect(response1.body.success).to.be.true;

      const response2 = await request(app)
        .post('/api/transaction-package/energy-monitor/stop')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).to.equal(200);
      expect(response2.body.success).to.be.true;
    });

    it('should start and stop daily fee service', async () => {
      const response1 = await request(app)
        .post('/api/transaction-package/daily-fee/start')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).to.equal(200);
      expect(response1.body.success).to.be.true;

      const response2 = await request(app)
        .post('/api/transaction-package/daily-fee/stop')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).to.equal(200);
      expect(response2.body.success).to.be.true;
    });

    it('should get service status', async () => {
      const response1 = await request(app)
        .get('/api/transaction-package/energy-monitor/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).to.equal(200);
      expect(response1.body.success).to.be.true;
      expect(response1.body.data).to.have.property('isRunning');

      const response2 = await request(app)
        .get('/api/transaction-package/daily-fee/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).to.equal(200);
      expect(response2.body.success).to.be.true;
      expect(response2.body.data).to.have.property('isRunning');
    });
  });
});

// 辅助函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 模拟认证中间件（仅用于测试）
if (process.env.NODE_ENV === 'test') {
  const express = require('express');
  const mockAuth = (req, res, next) => {
    req.user = { id: testUserId };
    next();
  };
  
  // 在测试环境中替换认证中间件
  app.use('/api/transaction-package', mockAuth);
}

module.exports = {
  delay
};