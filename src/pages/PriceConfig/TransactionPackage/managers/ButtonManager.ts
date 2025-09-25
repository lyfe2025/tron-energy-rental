/**
 * 按钮管理器
 * 负责按钮的增删改查和模板应用
 */
import { computed, ref } from 'vue'
import { BUTTON_TEMPLATES } from '../core/defaults'
import type { Button } from '../types/transaction-package.types'
import { PriceCalculator } from '../utils/PriceCalculator'

export class ButtonManager {
  private buttons = ref<Button[]>([])
  private selectedButton = ref<Button | null>(null)

  constructor(private usdtToTrxRate: number = 3.02) {}

  // 计算属性
  get regularButtons() {
    return computed(() => this.buttons.value.filter(b => !b.isSpecial))
  }

  get specialButton() {
    return computed(() => this.buttons.value.find(b => b.isSpecial))
  }

  get specialButtons() {
    return computed(() => this.buttons.value.filter(b => b.isSpecial))
  }

  get currentUnitPrice() {
    return computed(() => {
      if (this.selectedButton.value) {
        return this.selectedButton.value.unitPrice
      }
      return this.buttons.value.length > 0 ? this.buttons.value[0].unitPrice : 0
    })
  }

  get currentTransactionCount() {
    return computed(() => {
      if (this.selectedButton.value) {
        return this.selectedButton.value.count
      }
      return this.buttons.value.length > 0 ? this.buttons.value[0].count : 0
    })
  }

  get currentTotalAmount() {
    return computed(() => {
      if (this.selectedButton.value) {
        return this.selectedButton.value.count * this.selectedButton.value.unitPrice
      }
      return this.buttons.value.length > 0 ? this.buttons.value[0].price : 0
    })
  }

  // 方法
  getButtons() {
    return this.buttons
  }

  setButtons(buttons: Button[]) {
    this.buttons.value = buttons
  }

  getSelectedButton() {
    return this.selectedButton
  }

  setSelectedButton(button: Button | null) {
    this.selectedButton.value = button
  }

  /**
   * 从包配置加载按钮
   */
  loadButtonsFromPackages(packages: any[]) {
    if (!packages || !Array.isArray(packages)) {
      this.loadDefaultButtons()
      return
    }

    this.buttons.value = packages.map((pkg: any, index: number) => {
      const transactionCount = Number(pkg.transaction_count) || 10
      const savedUnitPrice = Number(pkg.unit_price)
      const savedPrice = Number(pkg.price)
      
      // 计算单价：优先使用保存的单价，否则从总价计算，最后使用默认值
      let unitPrice = 1.1500 // 默认值
      if (!isNaN(savedUnitPrice) && savedUnitPrice > 0) {
        unitPrice = savedUnitPrice
      } else if (!isNaN(savedPrice) && savedPrice > 0 && transactionCount > 0) {
        unitPrice = savedPrice / transactionCount
      }
      
      // 计算总价：优先使用计算值确保一致性
      const price = transactionCount * unitPrice
      
      const button = {
        id: (index + 1).toString(),
        count: transactionCount,
        unitPrice: unitPrice,
        price: price,
        isSpecial: index === packages.length - 1
      }
      
      return PriceCalculator.addTrxPrices(button, this.usdtToTrxRate)
    })
  }

  /**
   * 加载默认按钮
   */
  loadDefaultButtons() {
    const defaultPackages = BUTTON_TEMPLATES.popular
    this.buttons.value = defaultPackages.map(pkg => 
      PriceCalculator.addTrxPrices(pkg, this.usdtToTrxRate)
    )
  }

  /**
   * 添加新按钮
   */
  addButton() {
    const newId = Date.now().toString()
    const defaultCount = 10
    const defaultUnitPrice = 1.15
    
    const newButton = {
      id: newId,
      count: defaultCount,
      unitPrice: defaultUnitPrice,
      price: defaultCount * defaultUnitPrice,
      isSpecial: false
    }
    
    this.buttons.value.push(PriceCalculator.addTrxPrices(newButton, this.usdtToTrxRate))
  }

  /**
   * 删除按钮
   */
  removeButton(index: number) {
    this.buttons.value.splice(index, 1)
  }

  /**
   * 应用模板
   */
  applyTemplate(templateType: keyof typeof BUTTON_TEMPLATES) {
    const template = BUTTON_TEMPLATES[templateType]
    if (template) {
      this.buttons.value = template.map(button => 
        PriceCalculator.addTrxPrices({ ...button }, this.usdtToTrxRate)
      )
    }
  }

  /**
   * 更新汇率并重新计算所有按钮的TRX价格
   */
  updateExchangeRate(newRate: number) {
    this.usdtToTrxRate = newRate
    this.updateAllButtonsTrxPrices()
  }

  /**
   * 更新所有按钮的TRX价格
   */
  updateAllButtonsTrxPrices() {
    this.buttons.value = this.buttons.value.map(button => 
      PriceCalculator.addTrxPrices(button, this.usdtToTrxRate)
    )
  }

  /**
   * 导出按钮配置用于保存
   */
  exportButtonsConfig() {
    return this.buttons.value.map(button => ({
      name: `${button.count}笔套餐`,
      transaction_count: button.count,
      price: button.price, // USDT总价
      unit_price: button.unitPrice, // USDT单价
      trx_price: button.trxPrice, // TRX总价
      trx_unit_price: button.trxUnitPrice, // TRX单价
      currency: 'USDT' // 主货币为USDT
    }))
  }

  /**
   * 导出内嵌键盘按钮配置
   */
  exportInlineKeyboardButtons() {
    return this.buttons.value.map(button => ({
      id: button.id,
      text: `${button.count}笔`,
      callback_data: `transaction_package_${button.count}`,
      transaction_count: button.count,
      price: button.price,
      description: `${button.count}笔套餐`
    }))
  }
}
