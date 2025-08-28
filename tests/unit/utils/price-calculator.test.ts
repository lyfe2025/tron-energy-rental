/**
 * Price Calculator 单元测试
 */
import type { CalculationInput, PriceCalculationResult } from '@api/utils/price-calculator'
import { PriceCalculator, PriceValidator } from '@api/utils/price-calculator'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock数据库查询
vi.mock('@api/config/database', () => ({
  query: vi.fn()
}))

describe('PriceCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculatePrice', () => {
    it('应该计算基础能量价格', async () => {
      const { query } = await import('@api/config/database')
      
      // Mock包信息查询
      vi.mocked(query).mockResolvedValueOnce([{
        type: 'energy',
        min_quantity: 1000
      }])
      
      // Mock基础价格查询
      vi.mocked(query).mockResolvedValueOnce([{
        base_price: 1.5
      }])
      
      // Mock计算历史保存
      vi.mocked(query).mockResolvedValueOnce({ insertId: 1 })

      const result = await PriceCalculator.calculatePrice('1', 1)

      expect(result).toBeDefined()
      expect(result.basePrice).toBeDefined()
      expect(result.finalPrice).toBeDefined()
    })

    it('应该处理不存在的包ID并使用默认价格', async () => {
      const { query } = await import('@api/config/database')
      
      // Mock空查询结果
      vi.mocked(query).mockResolvedValue([])

      const result = await PriceCalculator.calculatePrice('999')
      
      // 应该返回基于默认价格的计算结果
      expect(result).toBeDefined()
      expect(result.basePrice).toBeGreaterThan(0)
      expect(result.finalPrice).toBeGreaterThan(0)
    })
  })

  describe('calculatePriceAdvanced', () => {
    it('应该进行高级价格计算', async () => {
      const { query } = await import('@api/config/database')
      
      // Mock数据库查询
      vi.mocked(query).mockResolvedValue([])

      const input: CalculationInput = {
        type: 'energy',
        packageId: '1',
        quantity: 1,
        amount: 65000
      }

      const result = await PriceCalculator.calculatePriceAdvanced(input, {
        validateInput: false,
        includeHistory: false
      })

      expect(result).toBeDefined()
      expect(result.basePrice).toBeGreaterThan(0)
      expect(result.finalPrice).toBeGreaterThan(0)
    })

    it('应该验证输入参数', async () => {
      const input: CalculationInput = {
        type: 'energy',
        quantity: -1, // 无效数量
        amount: 65000
      }

      await expect(PriceCalculator.calculatePriceAdvanced(input)).rejects.toThrow('输入验证失败')
    })
  })

  describe('validateInput', () => {
    it('应该验证有效输入', async () => {
      const input: CalculationInput = {
        type: 'energy',
        quantity: 1,
        amount: 65000
      }

      const result = await PriceCalculator.validateInput(input)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测无效输入', async () => {
      const input: CalculationInput = {
        type: 'invalid' as 'energy' | 'bandwidth',
        quantity: -1,
        amount: -100
      }

      const result = await PriceCalculator.validateInput(input)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('savePriceHistory', () => {
    it('应该成功保存价格历史', async () => {
      const { query } = await import('@api/config/database')
      vi.mocked(query).mockResolvedValue({ insertId: 1 })

      await PriceCalculator.savePriceHistory(
        1.5,
        1.8,
        'package',
        '1',
        'market_adjustment',
        '1',
        { source: 'manual' }
      )

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO price_history'),
        [
          'package',
          '1',
          1.5,
          1.8,
          'market_adjustment',
          '1',
          '{"source":"manual"}'
        ]
      )
    })

    it('应该处理数据库错误', async () => {
      const { query } = await import('@api/config/database')
      vi.mocked(query).mockRejectedValue(new Error('Database error'))

      // 应该不抛出错误，而是静默处理
      await expect(PriceCalculator.savePriceHistory(
        1.5,
        1.8,
        'package',
        '1',
        'market_adjustment',
        '1'
      )).resolves.not.toThrow()
    })
  })

  describe('getPriceHistory', () => {
    it('应该返回价格历史记录', async () => {
      const { query } = await import('@api/config/database')
      const mockRows = [
        {
          id: 1,
          entity_type: 'package',
          entity_id: '1',
          old_price: '1.5',
          new_price: '1.8',
          change_reason: 'market_adjustment',
          changed_by: 1,
          changed_at: '2024-01-01T00:00:00.000Z',
          metadata: null
        }
      ]
      vi.mocked(query).mockResolvedValue(mockRows)

      const result = await PriceCalculator.getPriceHistory()

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      )
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 1,
        entityType: 'package',
        entityId: '1',
        oldPrice: 1.5,
        newPrice: 1.8,
        changeReason: 'market_adjustment',
        changedBy: 1,
        changedAt: new Date('2024-01-01T00:00:00.000Z'),
        metadata: undefined
      })
    })

    it('应该使用查询选项过滤结果', async () => {
      const { query } = await import('@api/config/database')
      vi.mocked(query).mockResolvedValue([])

      const options = {
        entityType: 'package',
        entityId: '1',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        limit: 10
      }

      await PriceCalculator.getPriceHistory(options)

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        ['package', '1', options.dateRange.start, options.dateRange.end, 10]
      )
    })

    it('应该在数据库错误时返回空数组', async () => {
      const { query } = await import('@api/config/database')
      vi.mocked(query).mockRejectedValue(new Error('Database error'))

      const result = await PriceCalculator.getPriceHistory()

      expect(result).toEqual([])
    })
  })

  describe('batchCalculate', () => {
    it('应该进行批量价格计算', async () => {
      const { query } = await import('@api/config/database')
      vi.mocked(query).mockResolvedValue([])

      const inputs: CalculationInput[] = [
        {
          type: 'energy',
          quantity: 1,
          amount: 65000
        },
        {
          type: 'bandwidth',
          quantity: 1,
          amount: 1024
        }
      ]

      const results = await PriceCalculator.batchCalculate(inputs, {
        validateInput: false
      })

      expect(results).toHaveLength(2)
      expect(results[0].basePrice).toBeGreaterThan(0)
      expect(results[1].basePrice).toBeGreaterThan(0)
    })

    it('应该处理批量计算中的错误', async () => {
      const inputs: CalculationInput[] = [
        {
          type: 'energy',
          quantity: -1, // 无效输入
          amount: 65000
        }
      ]

      const results = await PriceCalculator.batchCalculate(inputs)

      expect(results).toHaveLength(1)
      expect(results[0].appliedRules[0]).toContain('计算失败')
    })
  })
})

describe('PriceValidator', () => {
  let validator: PriceValidator

  beforeEach(() => {
    vi.clearAllMocks()
    validator = new PriceValidator()
  })

  describe('validateInput', () => {
    it('应该验证有效的输入', async () => {
      const input: CalculationInput = {
        type: 'energy',
        quantity: 1,
        amount: 65000
      }

      const result = await validator.validateInput(input)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测无效的资源类型', async () => {
      const input: CalculationInput = {
        type: 'invalid' as 'energy' | 'bandwidth',
        quantity: 1,
        amount: 65000
      }

      const result = await validator.validateInput(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('资源类型必须是 energy 或 bandwidth')
    })

    it('应该检测无效的数量', async () => {
      const input: CalculationInput = {
        type: 'energy',
        quantity: -1,
        amount: 65000
      }

      const result = await validator.validateInput(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('数量必须大于 0')
    })

    it('应该检测无效的金额', async () => {
      const input: CalculationInput = {
        type: 'energy',
        quantity: 1,
        amount: -1000
      }

      const result = await validator.validateInput(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('金额必须大于 0')
    })

    it('应该检测非整数数量', async () => {
      const input: CalculationInput = {
        type: 'energy',
        quantity: 1.5,
        amount: 65000
      }

      const result = await validator.validateInput(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('数量必须是整数')
    })
  })

  describe('validateResult', () => {
    it('应该验证有效的计算结果', async () => {
      const result: PriceCalculationResult = {
        basePrice: 1.5,
        finalPrice: 1.35,
        discount: 0.15,
        discountType: 'percentage',
        appliedRules: ['volume_discount'],
        calculationDetails: {
          breakdown: {
            baseAmount: 1.5,
            quantity: 1,
            subtotal: 1.5,
            discountAmount: 0.15,
            feeAmount: 0,
            taxAmount: 0,
            total: 1.35
          }
        }
      }

      const input: CalculationInput = {
        type: 'energy',
        quantity: 1,
        amount: 65000
      }

      const validation = await validator.validateResult(result, input)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('应该检测价格过低的错误', async () => {
      const result: PriceCalculationResult = {
        basePrice: 1.5,
        finalPrice: 0.000000001, // 过低
        discount: 0,
        discountType: 'fixed',
        appliedRules: [],
        calculationDetails: {
          breakdown: {
            baseAmount: 1.5,
            quantity: 1,
            subtotal: 1.5,
            discountAmount: 0,
            feeAmount: 0,
            taxAmount: 0,
            total: 0.000000001
          }
        }
      }

      const input: CalculationInput = {
        type: 'energy',
        quantity: 1,
        amount: 65000
      }

      const validation = await validator.validateResult(result, input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('计算出的价格过低，请检查输入参数')
    })

    it('应该检测计算逻辑错误', async () => {
      const result: PriceCalculationResult = {
        basePrice: 1.5,
        finalPrice: 1.35,
        discount: 0.15,
        discountType: 'percentage',
        appliedRules: [],
        calculationDetails: {
          breakdown: {
            baseAmount: 1.5,
            quantity: 1,
            subtotal: 1.5,
            discountAmount: 0.15,
            feeAmount: 0,
            taxAmount: 0,
            total: 2.0 // 计算错误
          }
        }
      }

      const input: CalculationInput = {
        type: 'energy',
        quantity: 1,
        amount: 65000
      }

      const validation = await validator.validateResult(result, input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('总价计算不正确')
    })
  })
})
