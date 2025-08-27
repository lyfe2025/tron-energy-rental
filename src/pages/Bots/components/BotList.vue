<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <!-- 桌面端表格 -->
    <div class="hidden md:block overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left">
              <input
                type="checkbox"
                :checked="selectedBots.length === paginatedBots.length && paginatedBots.length > 0"
                :indeterminate="selectedBots.length > 0 && selectedBots.length < paginatedBots.length"
                @change="toggleSelectAll"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              机器人信息
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              类型
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              余额
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              今日订单
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="bot in paginatedBots" :key="bot.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <input
                type="checkbox"
                :value="bot.id"
                v-model="selectedBots"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot class="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ bot.name }}</div>
                  <div class="text-sm text-gray-500">{{ formatAddress(bot.address) }}</div>
                  <div v-if="bot.description" class="text-xs text-gray-400 mt-1">{{ bot.description }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {{ formatType(bot.type) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span :class="getStatusColor(bot.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                {{ getStatusText(bot.status) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">{{ formatCurrency(bot.balance) }}</div>
              <div class="text-xs text-gray-500">能量: {{ bot.energy_balance }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              {{ bot.today_orders || 0 }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center space-x-2">
                <button
                  @click="$emit('view', bot)"
                  class="text-blue-600 hover:text-blue-900 text-sm"
                >
                  查看
                </button>
                <button
                  @click="$emit('edit', bot)"
                  class="text-green-600 hover:text-green-900 text-sm"
                >
                  编辑
                </button>
                <button
                  @click="$emit('toggle-status', bot)"
                  :class="bot.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'"
                  class="text-sm"
                >
                  {{ bot.status === 'active' ? '停用' : '启用' }}
                </button>
                <div class="relative bot-menu">
                  <button
                    @click="toggleBotMenu(bot.id)"
                    class="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical class="w-4 h-4" />
                  </button>
                  <div
                    v-if="props.showBotMenu === bot.id"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                  >
                    <div class="py-1">
                      <button
                        @click="$emit('test-connection', bot); $emit('close-menu')"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Wifi class="w-4 h-4 mr-2 inline" />
                        测试连接
                      </button>
                      <button
                        @click="$emit('recharge', bot); $emit('close-menu')"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <CreditCard class="w-4 h-4 mr-2 inline" />
                        充值余额
                      </button>
                      <button
                        @click="$emit('view-logs', bot); $emit('close-menu')"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileText class="w-4 h-4 mr-2 inline" />
                        查看日志
                      </button>
                      <button
                        @click="$emit('reset', bot); $emit('close-menu')"
                        class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <RotateCcw class="w-4 h-4 mr-2 inline" />
                        重置机器人
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 移动端卡片 -->
    <div class="md:hidden">
      <div v-for="bot in paginatedBots" :key="bot.id" class="border-b border-gray-200 p-4">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-3">
            <input
              type="checkbox"
              :value="bot.id"
              v-model="selectedBots"
              class="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div class="flex-shrink-0">
              <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot class="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-900 truncate">{{ bot.name }}</h3>
                <span :class="getStatusColor(bot.status)" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
                  {{ getStatusText(bot.status) }}
                </span>
              </div>
              <p class="text-sm text-gray-500 truncate">{{ formatAddress(bot.address) }}</p>
              <div class="mt-2 flex items-center justify-between text-sm">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ formatType(bot.type) }}
                </span>
                <span class="text-gray-900 font-medium">{{ formatCurrency(bot.balance) }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>能量: {{ bot.energy_balance }}</span>
                <span>今日订单: {{ bot.today_orders || 0 }}</span>
              </div>
              <div v-if="bot.last_activity" class="mt-1 text-xs text-gray-400">
                最后活动: {{ formatDateTime(bot.last_activity) }}
              </div>
            </div>
          </div>
          <div class="relative bot-menu">
            <button
              @click="toggleBotMenu(bot.id)"
              class="text-gray-400 hover:text-gray-600"
            >
              <MoreVertical class="w-5 h-5" />
            </button>
            <div
              v-if="props.showBotMenu === bot.id"
              class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
            >
              <div class="py-1">
                <button
                  @click="$emit('view', bot); $emit('close-menu')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Eye class="w-4 h-4 mr-2 inline" />
                  查看详情
                </button>
                <button
                  @click="$emit('edit', bot); $emit('close-menu')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit class="w-4 h-4 mr-2 inline" />
                  编辑
                </button>
                <button
                  @click="$emit('toggle-status', bot); $emit('close-menu')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Power class="w-4 h-4 mr-2 inline" />
                  {{ bot.status === 'active' ? '停用' : '启用' }}
                </button>
                <button
                  @click="$emit('test-connection', bot); $emit('close-menu')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Wifi class="w-4 h-4 mr-2 inline" />
                  测试连接
                </button>
                <button
                  @click="$emit('recharge', bot); $emit('close-menu')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <CreditCard class="w-4 h-4 mr-2 inline" />
                  充值余额
                </button>
                <button
                  @click="$emit('view-logs', bot); $emit('close-menu')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText class="w-4 h-4 mr-2 inline" />
                  查看日志
                </button>
                <button
                  @click="$emit('reset', bot); $emit('close-menu')"
                  class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <RotateCcw class="w-4 h-4 mr-2 inline" />
                  重置机器人
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700">
          显示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredBots.length) }} 条，
          共 {{ filteredBots.length }} 条记录
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="$emit('page-change', currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span class="text-sm text-gray-700">
            第 {{ currentPage }} / {{ totalPages }} 页
          </span>
          <button
            @click="$emit('page-change', currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 无数据状态 -->
    <div v-if="paginatedBots.length === 0" class="text-center py-12">
      <Bot class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">暂无机器人</h3>
      <p class="mt-1 text-sm text-gray-500">开始添加您的第一个机器人</p>
      <div class="mt-6">
        <button
          @click="$emit('create')"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus class="-ml-1 mr-2 h-5 w-5" />
          添加机器人
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    Bot,
    CreditCard,
    Edit,
    Eye,
    FileText,
    MoreVertical,
    Plus,
    Power,
    RotateCcw,
    Wifi
} from 'lucide-vue-next';
import { computed } from 'vue';
import type { Bot as BotType } from '../types/bot.types';

const props = defineProps<{
  bots: BotType[]
  loading: boolean
  selectedBots: string[]
  showBotMenu: string | null
  currentPage: number
  pageSize: number
  filteredBots: BotType[]
  paginatedBots: BotType[]
  getStatusText: (status: string) => string
  getStatusColor: (status: string) => string
  formatDateTime: (dateString: string | undefined) => string
  formatCurrency: (amount: number) => string
  formatAddress: (address: string) => string
  formatType: (type: string) => string
  pagination: {
    currentPage: number
    pageSize: number
    totalPages: number
  }
}>()

const emit = defineEmits<{
  (e: 'update:selectedBots', bots: string[]): void
  (e: 'view', bot: BotType): void
  (e: 'edit', bot: BotType): void
  (e: 'create'): void
  (e: 'toggle-status', bot: BotType): void
  (e: 'test-connection', bot: BotType): void
  (e: 'recharge', bot: BotType): void
  (e: 'view-logs', bot: BotType): void
  (e: 'reset', bot: BotType): void
  (e: 'page-change', page: number): void
  (e: 'toggle-menu', botId: string): void
  (e: 'close-menu'): void
}>()

const selectedBots = computed({
  get: () => props.selectedBots,
  set: (value) => emit('update:selectedBots', value)
})

const currentPage = computed(() => props.pagination.currentPage)
const totalPages = computed(() => props.pagination.totalPages)

const toggleSelectAll = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    emit('update:selectedBots', props.paginatedBots.map(bot => bot.id))
  } else {
    emit('update:selectedBots', [])
  }
}

const toggleBotMenu = (botId: string) => {
  emit('toggle-menu', botId)
}
</script>