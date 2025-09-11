<!--
 * 手动同步对话框
 * 职责：提供手动同步Telegram机器人设置的界面
-->
<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          手动同步到Telegram
        </h3>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6">
        <div v-if="!syncing && !syncResult" class="space-y-6">
          <!-- 说明文字 -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <Info class="w-5 h-5 text-blue-600 mt-0.5" />
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">同步说明</p>
                <p>选择要同步到Telegram的设置项。只有勾选的项目会被同步，未选择的项目保持当前状态。</p>
                <p class="mt-1 text-blue-700">⚠️ 同步操作需要有效的Bot Token，请确保Token正确。</p>
              </div>
            </div>
          </div>

          <!-- 同步选项 -->
          <div class="space-y-4">
            <h4 class="font-medium text-gray-900 flex items-center gap-2">
              <Settings class="w-5 h-5" />
              选择要同步的设置
            </h4>
            
            <!-- 基础信息同步 -->
            <div class="border rounded-lg p-4 space-y-4">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="font-medium text-gray-900">基础信息</span>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="syncOptions.name" 
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <div class="flex-1">
                    <div class="font-medium text-sm">机器人名称</div>
                    <div class="text-xs text-gray-500">当前值: {{ currentFormData?.name || '未设置' }}</div>
                  </div>
                </label>

                <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="syncOptions.description" 
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <div class="flex-1">
                    <div class="font-medium text-sm">机器人描述</div>
                    <div class="text-xs text-gray-500">{{ getDescriptionPreview(currentFormData?.description) }}</div>
                  </div>
                </label>

                <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="syncOptions.shortDescription" 
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <div class="flex-1">
                    <div class="font-medium text-sm">短描述</div>
                    <div class="text-xs text-gray-500">{{ getDescriptionPreview(currentFormData?.short_description) }}</div>
                  </div>
                </label>

                <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="syncOptions.commands" 
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <div class="flex-1">
                    <div class="font-medium text-sm">命令列表</div>
                    <div class="text-xs text-gray-500">{{ getCommandsPreview() }}</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 高级设置同步 -->
            <div class="border rounded-lg p-4 space-y-4">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span class="font-medium text-gray-900">高级设置</span>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="syncOptions.workMode" 
                    class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  >
                  <div class="flex-1">
                    <div class="font-medium text-sm">工作模式</div>
                    <div class="text-xs text-gray-500">当前: {{ currentFormData?.work_mode === 'webhook' ? 'Webhook' : 'Polling' }}</div>
                  </div>
                </label>

                <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="syncOptions.menuButton" 
                    :disabled="!currentFormData?.menu_button_enabled"
                    class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
                  >
                  <div class="flex-1">
                    <div class="font-medium text-sm">菜单按钮</div>
                    <div class="text-xs text-gray-500">
                      {{ currentFormData?.menu_button_enabled ? 
                          `已启用: ${currentFormData.menu_button_text || '菜单'}` : 
                          '未启用' }}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 价格配置验证 -->
            <div class="border rounded-lg p-4 space-y-4">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="font-medium text-gray-900">配置验证</span>
              </div>
              
              <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="syncOptions.priceConfig" 
                  class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                >
                <div class="flex-1">
                  <div class="font-medium text-sm">价格配置验证</div>
                  <div class="text-xs text-gray-500">验证键盘配置中的价格配置依赖项是否有效</div>
                </div>
              </label>
            </div>
          </div>

          <!-- 全选/全不选 -->
          <div class="flex items-center justify-between pt-4 border-t">
            <div class="flex items-center gap-4">
              <button 
                @click="selectAll" 
                class="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                全选
              </button>
              <button 
                @click="selectNone" 
                class="text-sm text-gray-600 hover:text-gray-700 transition-colors"
              >
                全不选
              </button>
            </div>
            <div class="text-sm text-gray-500">
              已选择 {{ selectedCount }} 项
            </div>
          </div>
        </div>

        <!-- 同步进行中 -->
        <div v-else-if="syncing" class="space-y-6">
          <div class="text-center py-8">
            <Loader2 class="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h4 class="text-lg font-medium text-gray-900 mb-2">正在同步到Telegram...</h4>
            <p class="text-gray-600">请稍候，这可能需要几秒钟</p>
          </div>
          
          <!-- 实时日志显示 -->
          <div v-if="syncLogs.length > 0" class="bg-gray-50 border rounded-lg p-4">
            <h5 class="font-medium text-gray-900 mb-3">同步进度</h5>
            <div class="space-y-1 max-h-40 overflow-y-auto">
              <div 
                v-for="(log, index) in syncLogs" 
                :key="index"
                class="text-xs font-mono"
                :class="{
                  'text-green-600': log.includes('✅'),
                  'text-red-600': log.includes('❌'),
                  'text-yellow-600': log.includes('⚠️'),
                  'text-blue-600': log.includes('🎯'),
                  'text-gray-600': !log.includes('✅') && !log.includes('❌') && !log.includes('⚠️') && !log.includes('🎯')
                }"
              >
                {{ log }}
              </div>
            </div>
          </div>
        </div>

        <!-- 同步结果 -->
        <div v-else-if="syncResult" class="space-y-6">
          <!-- 结果总览 -->
          <div class="text-center py-6">
            <div class="mb-4">
              <CheckCircle v-if="syncResult.success" class="w-12 h-12 text-green-600 mx-auto" />
              <AlertCircle v-else-if="syncResult.hasPartialSuccess" class="w-12 h-12 text-yellow-600 mx-auto" />
              <XCircle v-else class="w-12 h-12 text-red-600 mx-auto" />
            </div>
            <h4 class="text-lg font-medium text-gray-900 mb-2">
              {{ syncResult.success ? '同步完成！' : 
                 syncResult.hasPartialSuccess ? '部分同步成功' : '同步失败' }}
            </h4>
            <p class="text-gray-600">
              {{ getSyncResultDescription() }}
            </p>
          </div>

          <!-- 详细结果 -->
          <div class="border rounded-lg p-4">
            <h5 class="font-medium text-gray-900 mb-4">同步详情</h5>
            <div class="space-y-3">
              <div 
                v-for="(result, key) in syncResult.results" 
                :key="key"
                class="flex items-center gap-3 p-2 rounded"
                :class="{
                  'bg-green-50': result === true,
                  'bg-red-50': result === false,
                  'bg-gray-50': result === null
                }"
              >
                <CheckCircle v-if="result === true" class="w-4 h-4 text-green-600" />
                <XCircle v-else-if="result === false" class="w-4 h-4 text-red-600" />
                <Minus v-else class="w-4 h-4 text-gray-400" />
                <span class="text-sm">{{ getSyncItemName(String(key)) }}</span>
                <span 
                  v-if="result === true" 
                  class="text-xs text-green-600 ml-auto"
                >
                  成功
                </span>
                <span 
                  v-else-if="result === false" 
                  class="text-xs text-red-600 ml-auto"
                >
                  失败
                </span>
                <span 
                  v-else 
                  class="text-xs text-gray-400 ml-auto"
                >
                  跳过
                </span>
              </div>
            </div>
          </div>

          <!-- 错误信息显示 -->
          <div v-if="syncResult.errors && syncResult.errors.length > 0" class="border border-red-200 rounded-lg p-4 bg-red-50">
            <h5 class="font-medium text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle class="w-4 h-4" />
              错误详情
            </h5>
            <div class="space-y-2">
              <div 
                v-for="(error, index) in syncResult.errors" 
                :key="index"
                class="text-sm text-red-800 bg-red-100 border border-red-200 rounded p-2"
              >
                {{ error }}
              </div>
            </div>
          </div>

          <!-- 完整日志 -->
          <div v-if="syncLogs.length > 0" class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h5 class="font-medium text-gray-900">完整日志</h5>
              <button 
                @click="showFullLogs = !showFullLogs"
                class="text-xs text-gray-600 hover:text-gray-700 transition-colors"
              >
                {{ showFullLogs ? '收起' : '展开' }}
              </button>
            </div>
            <div v-if="showFullLogs" class="space-y-1 max-h-60 overflow-y-auto bg-gray-50 border rounded p-3">
              <div 
                v-for="(log, index) in syncLogs" 
                :key="index"
                class="text-xs font-mono"
                :class="{
                  'text-green-600': log.includes('✅'),
                  'text-red-600': log.includes('❌'),
                  'text-yellow-600': log.includes('⚠️'),
                  'text-blue-600': log.includes('🎯'),
                  'text-gray-600': !log.includes('✅') && !log.includes('❌') && !log.includes('⚠️') && !log.includes('🎯')
                }"
              >
                {{ log }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end items-center px-6 py-4 border-t bg-gray-50">
        <div class="flex gap-3">
          <button
            v-if="!syncing && !syncResult"
            type="button"
            @click="handleClose"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            v-if="!syncing && !syncResult"
            type="button"
            @click="handleStartSync"
            :disabled="selectedCount === 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Activity class="w-4 h-4" />
            开始同步
          </button>
          <button
            v-if="syncResult && !syncResult.success"
            type="button"
            @click="handleRetry"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RotateCcw class="w-4 h-4" />
            重试
          </button>
          <button
            v-if="syncResult"
            type="button"
            @click="handleClose"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Minus,
  RotateCcw,
  Settings,
  X,
  XCircle
} from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'

// Props
interface Props {
  modelValue: boolean
  botData?: any | null
  currentFormData?: any | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'sync-success': [result?: any]
}>()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const syncing = ref(false)
const syncLogs = ref<string[]>([])
const syncResult = ref<any>(null)
const showFullLogs = ref(false)

// 同步选项
const syncOptions = reactive({
  name: false,
  description: false,
  shortDescription: false,
  commands: false,
  workMode: false,
  menuButton: false,
  priceConfig: false
})

// 计算属性
const selectedCount = computed(() => {
  return Object.values(syncOptions).filter(Boolean).length
})

// 工具函数
const getDescriptionPreview = (text?: string) => {
  if (!text) return '未设置'
  return text.length > 20 ? text.substring(0, 20) + '...' : text
}

const getCommandsPreview = () => {
  const menuCommands = props.currentFormData?.menu_commands?.length || 0
  const customCommands = props.currentFormData?.custom_commands?.length || 0
  return `菜单命令: ${menuCommands}, 自定义命令: ${customCommands}`
}

const getSyncItemName = (key: string) => {
  const names: Record<string, string> = {
    name: '机器人名称',
    description: '机器人描述',
    shortDescription: '短描述',
    commands: '命令列表',
    workMode: '工作模式',
    menuButton: '菜单按钮',
    priceConfig: '价格配置验证'
  }
  return names[key] || key
}

const getSyncResultDescription = () => {
  if (!syncResult.value) return ''
  
  const total = Object.keys(syncResult.value.results).length
  const success = Object.values(syncResult.value.results).filter((r: any) => r === true).length
  const failed = Object.values(syncResult.value.results).filter((r: any) => r === false).length
  
  if (syncResult.value.success) {
    return `所有 ${total} 项设置都已成功同步到Telegram`
  } else if (syncResult.value.hasPartialSuccess) {
    return `${success} 项成功，${failed} 项失败，共 ${total} 项`
  } else {
    return `${failed} 项同步失败，请查看详细信息`
  }
}

const resetState = () => {
  syncing.value = false
  syncLogs.value = []
  syncResult.value = null
  showFullLogs.value = false
  Object.keys(syncOptions).forEach(key => {
    syncOptions[key as keyof typeof syncOptions] = false
  })
}

const selectAll = () => {
  Object.keys(syncOptions).forEach(key => {
    // 菜单按钮只在启用时才能选择
    if (key === 'menuButton' && !props.currentFormData?.menu_button_enabled) {
      return
    }
    syncOptions[key as keyof typeof syncOptions] = true
  })
}

const selectNone = () => {
  Object.keys(syncOptions).forEach(key => {
    syncOptions[key as keyof typeof syncOptions] = false
  })
}

const handleStartSync = async () => {
  if (selectedCount.value === 0 || !props.botData) return
  
  try {
    syncing.value = true
    syncLogs.value = []
    syncResult.value = null
    
    // 开始同步过程
    syncLogs.value.push('🎯 开始同步到Telegram...')
    syncLogs.value.push(`📋 已选择 ${selectedCount.value} 项设置进行同步`)
    
    // 构建同步数据
    const syncData = {
      options: { ...syncOptions },
      formData: props.currentFormData
    }
    
    syncLogs.value.push('📡 正在发送同步请求...')
    
    // 调用同步API
    const response = await fetch(`/api/bots/${props.botData.id}/manual-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify(syncData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      syncResult.value = result.data
      
      // 显示详细的同步日志
      if (result.data.logs && result.data.logs.length > 0) {
        // 先添加分隔线
        syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        syncLogs.value.push('📝 详细同步日志:')
        syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        // 添加所有详细日志
        result.data.logs.forEach((log: string) => {
          syncLogs.value.push(log)
        })
        
        // 添加结束分隔线
        syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
      
      // 不自动关闭，等待用户手动确认
    } else {
      syncResult.value = {
        success: false,
        hasPartialSuccess: false,
        results: {},
        errors: [result.message || '同步失败']
      }
      
      // 显示错误情况下的日志
      if (result.data && result.data.logs && result.data.logs.length > 0) {
        syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        syncLogs.value.push('📝 详细同步日志:')
        syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        result.data.logs.forEach((log: string) => {
          syncLogs.value.push(log)
        })
        
        syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      } else {
        syncLogs.value.push(`❌ 同步失败: ${result.message || '未知错误'}`)
      }
    }
    
  } catch (error: any) {
    console.error('同步失败:', error)
    
    // 添加网络错误日志
    syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    syncLogs.value.push('❌ 网络错误或请求失败:')
    syncLogs.value.push(`📄 错误详情: ${error.message || '未知网络错误'}`)
    if (error.stack) {
      syncLogs.value.push('🔍 技术详情: 请检查网络连接或联系技术支持')
    }
    syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    syncResult.value = {
      success: false,
      hasPartialSuccess: false,
      results: {},
      errors: [error.message || '网络错误，请稍后重试']
    }
  } finally {
    syncing.value = false
  }
}

const handleRetry = () => {
  syncResult.value = null
  handleStartSync()
}

// 关闭对话框
const handleClose = () => {
  emit('update:modelValue', false)
  emit('sync-success', syncResult.value)
  
  // 延迟重置状态，确保用户能看到最终结果
  setTimeout(() => {
    resetState()
  }, 100)
}

// 监听对话框打开，重置状态
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetState()
  }
})
</script>

<style scoped>
/* 样式保持简洁，依赖Tailwind CSS */
</style>
