<template>
  <div class="price-config-page">
    <div class="page-header">
      <h1 class="text-2xl font-bold text-gray-900">价格配置</h1>
      <p class="text-gray-600 mt-2">统一管理所有价格模式的配置</p>
    </div>

    <!-- 标签页导航 -->
    <div class="mt-6">
      <nav class="flex space-x-8 border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <component :is="tab.icon" class="w-5 h-5 mr-2" />
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- 标签页内容 -->
    <div class="mt-6">
      <!-- 能量闪租配置 -->
      <div v-if="activeTab === 'energy_flash'" class="config-card bg-white rounded-lg shadow-md p-6">
        <div class="card-header flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">能量闪租模式</h2>
            <p class="text-gray-600 text-sm mt-1">单笔能量闪租价格配置</p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm text-gray-500">启用状态</span>
            <button
              @click="toggleMode('energy_flash')"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                energyFlashConfig?.is_active ? 'bg-blue-600' : 'bg-gray-200'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  energyFlashConfig?.is_active ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>

        <div v-if="energyFlashConfig" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">单笔价格</label>
            <div class="flex items-center space-x-2">
              <input
                v-model.number="energyFlashConfig.config.single_price"
                type="number"
                step="0.1"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span class="text-gray-500">TRX</span>
            </div>
          </div>

          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">最大购买笔数</label>
            <input
              v-model.number="energyFlashConfig.config.max_transactions"
              type="number"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">时效限制（小时）</label>
            <input
              v-model.number="energyFlashConfig.config.expiry_hours"
              type="number"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">收款地址</label>
            <input
              v-model="energyFlashConfig.config.payment_address"
              type="text"
              placeholder="请输入收款地址"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="form-group flex items-center">
            <input
              v-model="energyFlashConfig.config.double_energy_for_no_usdt"
              type="checkbox"
              id="double_energy"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="double_energy" class="ml-2 text-sm text-gray-700">
              向无U地址转账需双倍能量
            </label>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            @click="saveConfig('energy_flash')"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>

      <!-- 笔数套餐配置 -->
      <div v-if="activeTab === 'transaction_package'" class="config-card bg-white rounded-lg shadow-md p-6">
        <div class="card-header flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">笔数套餐模式</h2>
            <p class="text-gray-600 text-sm mt-1">长期套餐价格配置</p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm text-gray-500">启用状态</span>
            <button
              @click="toggleMode('transaction_package')"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                transactionPackageConfig?.is_active ? 'bg-blue-600' : 'bg-gray-200'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  transactionPackageConfig?.is_active ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>

        <div v-if="transactionPackageConfig" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">24小时不使用扣费</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="transactionPackageConfig.config.daily_fee"
                  type="number"
                  step="0.1"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">TRX</span>
              </div>
            </div>

            <div class="form-group flex items-center">
              <input
                v-model="transactionPackageConfig.config.transferable"
                type="checkbox"
                id="transferable"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="transferable" class="ml-2 text-sm text-gray-700">
                支持转移笔数
              </label>
            </div>

            <div class="form-group flex items-center">
              <input
                v-model="transactionPackageConfig.config.proxy_purchase"
                type="checkbox"
                id="proxy_purchase"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="proxy_purchase" class="ml-2 text-sm text-gray-700">
                支持代购
              </label>
            </div>
          </div>

          <!-- 套餐列表 -->
          <div class="packages-section">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-medium text-gray-900">套餐配置</h3>
              <button
                @click="addPackage('transaction_package')"
                class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                添加套餐
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(pkg, index) in transactionPackageConfig.config.packages"
                :key="index"
                class="package-item p-4 border border-gray-200 rounded-md"
              >
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">套餐名称</label>
                    <input
                      v-model="pkg.name"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">笔数</label>
                    <input
                      v-model.number="pkg.transaction_count"
                      type="number"
                      min="1"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">价格 (TRX)</label>
                    <input
                      v-model.number="pkg.price"
                      type="number"
                      step="0.1"
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div class="flex items-end">
                    <button
                      @click="removePackage('transaction_package', index)"
                      class="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            @click="saveConfig('transaction_package')"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>

      <!-- VIP套餐配置 -->
      <div v-if="activeTab === 'vip_package'" class="config-card bg-white rounded-lg shadow-md p-6">
        <div class="card-header flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">VIP套餐模式</h2>
            <p class="text-gray-600 text-sm mt-1">VIP会员套餐配置</p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm text-gray-500">启用状态</span>
            <button
              @click="toggleMode('vip_package')"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                vipPackageConfig?.is_active ? 'bg-blue-600' : 'bg-gray-200'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  vipPackageConfig?.is_active ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>

        <div v-if="vipPackageConfig" class="space-y-4">
          <!-- VIP套餐列表 -->
          <div class="packages-section">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-medium text-gray-900">VIP套餐配置</h3>
              <button
                @click="addPackage('vip_package')"
                class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                添加套餐
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(pkg, index) in vipPackageConfig.config.packages"
                :key="index"
                class="package-item p-4 border border-gray-200 rounded-md"
              >
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">套餐名称</label>
                    <input
                      v-model="pkg.name"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">有效期（天）</label>
                    <input
                      v-model.number="pkg.duration_days"
                      type="number"
                      min="1"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">价格 (TRX)</label>
                    <input
                      v-model.number="pkg.price"
                      type="number"
                      step="0.1"
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div class="flex items-end">
                    <button
                      @click="removePackage('vip_package', index)"
                      class="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <!-- VIP权益配置 -->
                <div class="benefits-section">
                  <h4 class="text-sm font-medium text-gray-700 mb-2">VIP权益</h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="flex items-center">
                      <input
                        v-model="pkg.benefits.unlimited_transactions"
                        type="checkbox"
                        :id="`unlimited_${index}`"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label :for="`unlimited_${index}`" class="ml-2 text-sm text-gray-700">
                        无限交易次数
                      </label>
                    </div>
                    <div class="flex items-center">
                      <input
                        v-model="pkg.benefits.priority_support"
                        type="checkbox"
                        :id="`priority_${index}`"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label :for="`priority_${index}`" class="ml-2 text-sm text-gray-700">
                        优先客服支持
                      </label>
                    </div>
                    <div class="flex items-center">
                      <input
                        v-model="pkg.benefits.no_daily_fee"
                        type="checkbox"
                        :id="`no_fee_${index}`"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label :for="`no_fee_${index}`" class="ml-2 text-sm text-gray-700">
                        免日常扣费
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            @click="saveConfig('vip_package')"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>

      <!-- TRX闪兑配置 -->
      <div v-if="activeTab === 'trx_exchange'" class="config-card bg-white rounded-lg shadow-md p-6">
        <div class="card-header flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">TRX闪兑模式</h2>
            <p class="text-gray-600 text-sm mt-1">USDT自动兑换TRX服务配置</p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm text-gray-500">启用状态</span>
            <button
              @click="toggleMode('trx_exchange')"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                trxExchangeConfig?.is_active ? 'bg-blue-600' : 'bg-gray-200'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  trxExchangeConfig?.is_active ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>

        <div v-if="trxExchangeConfig" class="space-y-6">
          <!-- 基础配置 -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">兑换地址</label>
              <input
                v-model="trxExchangeConfig.config.exchange_address"
                type="text"
                placeholder="请输入TRX兑换地址"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">最小兑换金额</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="trxExchangeConfig.config.min_amount"
                  type="number"
                  step="0.1"
                  min="0.1"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">USDT</span>
              </div>
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">汇率更新间隔</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="trxExchangeConfig.config.rate_update_interval"
                  type="number"
                  min="1"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">分钟</span>
              </div>
            </div>
          </div>

          <!-- 汇率配置 -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-gray-900 mb-4">实时汇率配置</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">USDT → TRX 汇率</label>
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-500">1 USDT =</span>
                  <input
                    v-model.number="trxExchangeConfig.config.usdt_to_trx_rate"
                    type="number"
                    step="0.0001"
                    min="0"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-500">TRX</span>
                </div>
              </div>

              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">TRX → USDT 汇率</label>
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-500">100 TRX =</span>
                  <input
                    v-model.number="trxExchangeConfig.config.trx_to_usdt_rate"
                    type="number"
                    step="0.0001"
                    min="0"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-500">USDT</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 功能配置 -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-gray-900 mb-4">功能配置</h3>
            <div class="flex items-center">
              <input
                v-model="trxExchangeConfig.config.is_auto_exchange"
                type="checkbox"
                id="auto_exchange"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="auto_exchange" class="ml-2 text-sm text-gray-700">
                启用自动兑换（转U自动回TRX）
              </label>
            </div>
          </div>

          <!-- 注意事项配置 -->
          <div class="bg-yellow-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-gray-900 mb-4">注意事项配置</h3>
            <div class="space-y-3">
              <div
                v-for="(note, index) in trxExchangeConfig.config.notes"
                :key="index"
                class="flex items-center space-x-2"
              >
                <input
                  v-model="trxExchangeConfig.config.notes[index]"
                  type="text"
                  placeholder="请输入注意事项"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  @click="removeNote(index)"
                  class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  删除
                </button>
              </div>
              <button
                @click="addNote"
                class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                添加注意事项
              </button>
            </div>
          </div>

          <!-- 预览效果 -->
          <div class="bg-gray-100 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Telegram 显示预览</h3>
            <div class="bg-white p-4 rounded-lg border font-mono text-sm">
              <div class="text-green-600">🟢USDT自动兑换TRX🔴</div>
              <div class="text-gray-600">（转U自动回TRX，{{ trxExchangeConfig.config.min_amount }}U起换）</div>
              <br>
              <div class="text-blue-600">📈实时汇率</div>
              <div>1 USDT = {{ trxExchangeConfig.config.usdt_to_trx_rate }} TRX</div>
              <div>100 TRX = {{ trxExchangeConfig.config.trx_to_usdt_rate }} USDT</div>
              <div class="text-gray-600">（上面是U换T，下面是T换U）</div>
              <br>
              <div class="text-orange-600">🔄自动兑换地址:</div>
              <div class="text-blue-600">{{ trxExchangeConfig.config.exchange_address }} (点击地址自动复制)</div>
              <br>
              <div v-for="note in trxExchangeConfig.config.notes" :key="note" class="text-red-600">
                {{ note }}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            @click="saveConfig('trx_exchange')"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftRight, Crown, Package, Zap } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { usePriceConfig } from '../composables/usePriceConfig'
import { useToast } from '../composables/useToast'

const {
  configs,
  loading,
  loadConfigs,
  updateConfig,
  toggleConfigStatus,
  getTrxExchangeConfig
} = usePriceConfig()

const { success, error, warning, loading: showLoading, dismiss } = useToast()
const saving = ref(false)

// 标签页配置
const activeTab = ref('energy_flash')
const tabs = [
  {
    id: 'energy_flash',
    name: '能量闪租',
    icon: Zap
  },
  {
    id: 'transaction_package',
    name: '笔数套餐',
    icon: Package
  },
  {
    id: 'vip_package',
    name: 'VIP套餐',
    icon: Crown
  },
  {
    id: 'trx_exchange',
    name: 'TRX闪兑',
    icon: ArrowLeftRight
  }
]

// 计算属性获取各模式配置
const energyFlashConfig = computed(() => 
  configs.value.find(c => c.mode_type === 'energy_flash')
)

const transactionPackageConfig = computed(() => 
  configs.value.find(c => c.mode_type === 'transaction_package')
)

const vipPackageConfig = computed(() => 
  configs.value.find(c => c.mode_type === 'vip_package')
)

const trxExchangeConfig = computed(() => 
  configs.value.find(c => c.mode_type === 'trx_exchange')
)

// 切换模式状态
const toggleMode = async (modeType: string) => {
  let loadingId: string | null = null
  try {
    loadingId = showLoading('正在更新状态...')
    await toggleConfigStatus(modeType)
    if (loadingId) dismiss(loadingId)
    success('状态更新成功')
  } catch (err: any) {
    if (loadingId) dismiss(loadingId)
    console.error('Toggle mode error:', err)
    
    // 详细错误处理
    let errorMessage = '状态更新失败'
    if (err?.response?.status === 401) {
      errorMessage = '登录已过期，请重新登录'
    } else if (err?.response?.status === 403) {
      errorMessage = '权限不足，无法修改配置'
    } else if (err?.response?.status === 404) {
      errorMessage = '配置不存在'
    } else if (err?.response?.status >= 500) {
      errorMessage = '服务器错误，请稍后重试'
    } else if (err?.message) {
      errorMessage = `状态更新失败: ${err.message}`
    } else if (!navigator.onLine) {
      errorMessage = '网络连接失败，请检查网络设置'
    }
    
    error(errorMessage)
  }
}

// 保存配置
const saveConfig = async (modeType: string) => {
  saving.value = true
  let loadingId: string | null = null
  
  try {
    const config = configs.value.find(c => c.mode_type === modeType)
    if (!config) {
      warning('未找到对应的配置数据')
      return
    }
    
    // 数据验证
    const validationResult = validateConfig(modeType, config.config)
    if (!validationResult.isValid) {
      error(`配置验证失败: ${validationResult.message}`)
      return
    }
    
    loadingId = showLoading('正在保存配置...')
    await updateConfig(modeType, config.config)
    
    if (loadingId) dismiss(loadingId)
    success('配置保存成功')
    
  } catch (err: any) {
    if (loadingId) dismiss(loadingId)
    console.error('Save config error:', err)
    
    // 详细错误处理
    let errorMessage = '配置保存失败'
    if (err?.response?.status === 400) {
      const responseData = err?.response?.data
      if (responseData?.message) {
        errorMessage = `配置验证失败: ${responseData.message}`
      } else {
        errorMessage = '配置数据格式错误，请检查输入'
      }
    } else if (err?.response?.status === 401) {
      errorMessage = '登录已过期，请重新登录后再试'
    } else if (err?.response?.status === 403) {
      errorMessage = '权限不足，无法保存配置'
    } else if (err?.response?.status === 404) {
      errorMessage = '配置不存在或已被删除'
    } else if (err?.response?.status >= 500) {
      errorMessage = '服务器内部错误，请稍后重试'
    } else if (err?.code === 'NETWORK_ERROR' || !navigator.onLine) {
      errorMessage = '网络连接失败，请检查网络设置后重试'
    } else if (err?.message) {
      errorMessage = `保存失败: ${err.message}`
    }
    
    error(errorMessage)
    
  } finally {
    saving.value = false
  }
}

// 配置验证函数
const validateConfig = (modeType: string, config: any) => {
  if (!config) {
    return { isValid: false, message: '配置数据不能为空' }
  }
  
  if (modeType === 'energy_flash') {
    if (!config.single_price || config.single_price <= 0) {
      return { isValid: false, message: '单笔价格必须大于0' }
    }
    if (!config.max_transactions || config.max_transactions <= 0) {
      return { isValid: false, message: '最大购买笔数必须大于0' }
    }
  } else if (modeType === 'transaction_package' || modeType === 'vip_package') {
    if (!config.packages || !Array.isArray(config.packages) || config.packages.length === 0) {
      return { isValid: false, message: '至少需要配置一个套餐' }
    }
    
    for (let i = 0; i < config.packages.length; i++) {
      const pkg = config.packages[i]
      if (!pkg.name || pkg.name.trim() === '') {
        return { isValid: false, message: `第${i + 1}个套餐名称不能为空` }
      }
      if (!pkg.price || pkg.price <= 0) {
        return { isValid: false, message: `第${i + 1}个套餐价格必须大于0` }
      }
      
      if (modeType === 'transaction_package') {
        if (!pkg.transaction_count || pkg.transaction_count <= 0) {
          return { isValid: false, message: `第${i + 1}个套餐交易次数必须大于0` }
        }
      } else if (modeType === 'vip_package') {
        if (!pkg.duration_days || pkg.duration_days <= 0) {
          return { isValid: false, message: `第${i + 1}个套餐有效期必须大于0天` }
        }
        if (!pkg.benefits) {
          return { isValid: false, message: `第${i + 1}个套餐必须配置VIP权益` }
        }
      }
    }
  }
  
  return { isValid: true, message: '' }
}

// 添加套餐
const addPackage = (modeType: string) => {
  const config = configs.value.find(c => c.mode_type === modeType)
  if (!config) return

  if (modeType === 'transaction_package') {
    config.config.packages.push({
      name: '新套餐',
      transaction_count: 100,
      price: 250,
      currency: 'TRX'
    })
  } else if (modeType === 'vip_package') {
    config.config.packages.push({
      name: '新VIP套餐',
      duration_days: 30,
      price: 500,
      currency: 'TRX',
      benefits: {
        unlimited_transactions: true,
        priority_support: true,
        no_daily_fee: true
      }
    })
  }
}

// 删除套餐
const removePackage = (modeType: string, index: number) => {
  const config = configs.value.find(c => c.mode_type === modeType)
  if (config && config.config.packages) {
    config.config.packages.splice(index, 1)
  }
}

// 添加注意事项
const addNote = () => {
  if (trxExchangeConfig.value?.config.notes) {
    trxExchangeConfig.value.config.notes.push('')
  }
}

// 删除注意事项
const removeNote = (index: number) => {
  if (trxExchangeConfig.value?.config.notes) {
    trxExchangeConfig.value.config.notes.splice(index, 1)
  }
}

// 初始化
onMounted(() => {
  loadConfigs()
  // 确保加载TRX闪兑配置
  getTrxExchangeConfig()
})
</script>

<style scoped>
.price-config-page {
  @apply max-w-7xl mx-auto p-6;
}

.config-card {
  @apply border border-gray-200;
}

.form-group label {
  @apply text-sm font-medium text-gray-700;
}

.package-item {
  @apply bg-gray-50;
}

.benefits-section {
  @apply pt-3 border-t border-gray-200;
}
</style>