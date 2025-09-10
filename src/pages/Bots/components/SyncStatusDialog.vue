<template>
  <el-dialog
    v-model="visible"
    title="Telegram同步状态"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="sync-status-container">
      <!-- 总体状态 -->
      <div class="status-header">
        <div class="flex items-center gap-3">
          <el-icon v-if="isLoading" class="is-loading text-blue-500" size="20">
            <Loading />
          </el-icon>
          <el-icon v-else-if="isSuccess" class="text-green-500" size="20">
            <SuccessFilled />
          </el-icon>
          <el-icon v-else-if="isPartialSuccess" class="text-yellow-500" size="20">
            <WarningFilled />
          </el-icon>
          <el-icon v-else class="text-red-500" size="20">
            <CircleCloseFilled />
          </el-icon>
          
          <div>
            <h3 class="text-lg font-semibold">{{ statusTitle }}</h3>
            <p class="text-sm text-gray-600">{{ statusDescription }}</p>
          </div>
        </div>
      </div>

      <!-- 同步详情（步骤状态 + 详细日志） -->
      <div class="sync-details">
        <div class="details-header mb-4">
          <div class="flex items-center justify-between">
            <h4 class="font-medium text-gray-900">同步详情</h4>
            <div class="flex items-center gap-2">
              <!-- 状态总览 -->
              <span v-if="logs.length > 0" class="text-xs px-2 py-1 rounded-full"
                :class="hasErrors ? 'bg-red-100 text-red-600' : 
                        hasWarnings ? 'bg-yellow-100 text-yellow-600' : 
                        'bg-green-100 text-green-600'">
                {{ logs.length }} 条日志
              </span>
              <!-- 展开/收起按钮 -->
              <button
                @click="toggleExpandedView"
                class="text-xs text-gray-600 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <svg v-if="!isExpandedView" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
                {{ isExpandedView ? '简洁视图' : '详细视图' }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 简洁视图：只显示步骤状态 -->
        <div v-if="!isExpandedView" class="compact-view space-y-3">
          <!-- 数据库保存步骤 -->
          <div class="step-item compact">
            <div class="flex items-center gap-3">
              <el-icon class="text-green-500" size="16">
                <SuccessFilled />
              </el-icon>
              <span class="text-sm">✅ 机器人数据库保存成功</span>
            </div>
          </div>

          <!-- Telegram同步步骤 -->
          <div 
            v-for="(step, index) in syncSteps" 
            :key="index"
            class="step-item compact"
          >
            <div class="flex items-center gap-3">
              <el-icon 
                v-if="step.status === 'loading'" 
                class="is-loading text-blue-500" 
                size="16"
              >
                <Loading />
              </el-icon>
              <el-icon 
                v-else-if="step.status === 'success'" 
                class="text-green-500" 
                size="16"
              >
                <SuccessFilled />
              </el-icon>
              <el-icon 
                v-else-if="step.status === 'skipped'" 
                class="text-gray-400" 
                size="16"
              >
                <Remove />
              </el-icon>
              <el-icon 
                v-else 
                class="text-red-500" 
                size="16"
              >
                <CircleCloseFilled />
              </el-icon>
              
              <div class="flex-1">
                <div class="text-sm">{{ step.title }}</div>
                <div v-if="step.error" class="text-xs text-red-500 mt-1">
                  错误: {{ step.error }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 详细视图：步骤状态 + 对应的详细日志 -->
        <div v-else class="detailed-view space-y-4">
          <!-- 数据库保存步骤 -->
          <div class="step-section">
            <div class="step-header">
              <div class="flex items-center gap-3 mb-2">
                <el-icon class="text-green-500" size="16">
                  <SuccessFilled />
                </el-icon>
                <span class="text-sm font-medium">✅ 机器人数据库保存成功</span>
              </div>
            </div>
          </div>

          <!-- Telegram同步步骤 -->
          <div 
            v-for="(step, index) in syncSteps" 
            :key="index"
            class="step-section"
          >
            <div class="step-header">
              <div class="flex items-center gap-3 mb-2">
                <el-icon 
                  v-if="step.status === 'loading'" 
                  class="is-loading text-blue-500" 
                  size="16"
                >
                  <Loading />
                </el-icon>
                <el-icon 
                  v-else-if="step.status === 'success'" 
                  class="text-green-500" 
                  size="16"
                >
                  <SuccessFilled />
                </el-icon>
                <el-icon 
                  v-else-if="step.status === 'skipped'" 
                  class="text-gray-400" 
                  size="16"
                >
                  <Remove />
                </el-icon>
                <el-icon 
                  v-else 
                  class="text-red-500" 
                  size="16"
                >
                  <CircleCloseFilled />
                </el-icon>
                
                <div class="flex-1">
                  <div class="text-sm font-medium">{{ step.title }}</div>
                  <div v-if="step.description" class="text-xs text-gray-500 mt-1">
                    {{ step.description }}
                  </div>
                  <div v-if="step.error" class="text-xs text-red-500 mt-1">
                    错误: {{ step.error }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 该步骤相关的详细日志 -->
            <div v-if="getStepLogs(step, index).length > 0" class="step-logs">
              <div class="bg-gray-50 border border-gray-200 rounded p-3 mt-2">
                <div class="text-xs text-gray-600 mb-2 font-medium">详细日志:</div>
                <div class="space-y-1">
                  <div 
                    v-for="(log, logIndex) in getStepLogs(step, index)" 
                    :key="logIndex"
                    class="text-xs font-mono"
                    :class="{
                      'text-green-600': log.includes('✅'),
                      'text-red-600': log.includes('❌'),
                      'text-yellow-600': log.includes('⏭️'),
                      'text-blue-600': log.includes('🎯'),
                      'text-gray-600': !log.includes('✅') && !log.includes('❌') && !log.includes('⏭️') && !log.includes('🎯')
                    }"
                  >
                    {{ log }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 其他未分类的日志 -->
          <div v-if="getOtherLogs().length > 0" class="step-section">
            <div class="step-header">
              <div class="flex items-center gap-3 mb-2">
                <el-icon class="text-blue-500" size="16">
                  <Loading />
                </el-icon>
                <span class="text-sm font-medium">📋 其他同步信息</span>
              </div>
            </div>
            <div class="step-logs">
              <div class="bg-gray-50 border border-gray-200 rounded p-3">
                <div class="space-y-1">
                  <div 
                    v-for="(log, logIndex) in getOtherLogs()" 
                    :key="logIndex"
                    class="text-xs font-mono"
                    :class="{
                      'text-green-600': log.includes('✅'),
                      'text-red-600': log.includes('❌'),
                      'text-yellow-600': log.includes('⏭️'),
                      'text-blue-600': log.includes('🎯'),
                      'text-gray-600': !log.includes('✅') && !log.includes('❌') && !log.includes('⏭️') && !log.includes('🎯')
                    }"
                  >
                    {{ log }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 完成率统计 -->
      <div v-if="!isLoading" class="completion-stats">
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">同步完成率</span>
            <span class="text-lg font-bold" :class="{
              'text-green-600': completionRate === 100,
              'text-yellow-600': completionRate > 0 && completionRate < 100,
              'text-red-600': completionRate === 0
            }">
              {{ completionRate }}%
            </span>
          </div>
          <div class="mt-2">
            <el-progress 
              :percentage="completionRate" 
              :color="progressColor"
              :show-text="false"
            />
          </div>
          <div class="text-xs text-gray-600 mt-2">
            成功: {{ successCount }} / 总计: {{ totalCount }}
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="!isLoading" @click="handleClose">
          {{ isSuccess ? '完成' : '关闭' }}
        </el-button>
        <el-button v-if="!isLoading && !isSuccess" type="primary" @click="handleRetry">
          重试同步
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  CircleCloseFilled,
  Loading,
  Remove,
  SuccessFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import { ErrorMessageParser, type ParsedError } from '../../../utils/errorMessageParser'

interface SyncStep {
  title: string
  description?: string
  status: 'loading' | 'success' | 'error' | 'skipped'
  error?: string
}

interface Props {
  modelValue: boolean
  syncStatus?: Record<string, boolean | null>
  logs?: string[]
  isLoading?: boolean
  syncResult?: {
    success: boolean
    results: Record<string, boolean>
    errors: string[]
    summary: string
  }
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'retry'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  syncStatus: () => ({}),
  logs: () => [],
  isLoading: false,
  syncResult: undefined
})

const emit = defineEmits<Emits>()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isExpandedView = ref(false)

// 解析后的错误信息
const parsedErrors = computed((): ParsedError[] => {
  if (!props.syncResult?.errors || props.syncResult.errors.length === 0) {
    return []
  }
  return ErrorMessageParser.parseErrors(props.syncResult.errors)
})

// 错误分析结果
const errorAnalysis = computed(() => {
  return ErrorMessageParser.analyzeErrorSeverity(parsedErrors.value)
})

// 获取步骤的真实错误信息
const getStepError = (stepKey: string): string | undefined => {
  if (!props.syncResult?.errors || props.syncResult.errors.length === 0) {
    return undefined
  }
  
  // 查找与该步骤相关的错误
  const stepKeywords: Record<string, string[]> = {
    'name': ['name', 'setMyName', '名称', '机器人名称'],
    'description': ['description', 'setMyDescription', '描述', '机器人描述'],
    'shortDescription': ['shortDescription', 'setMyShortDescription', '短描述'], 
    'commands': ['commands', 'setMyCommands', '命令'],
    'menuButton': ['menuButton', 'setChatMenuButton', '菜单'],
    'priceConfig': ['priceConfig', 'price', 'config', '价格配置']
  }
  
  const keywords = stepKeywords[stepKey] || []
  if (keywords.length === 0) return undefined
  
  // 查找相关错误
  const relatedError = props.syncResult.errors.find(error => 
    keywords.some(keyword => 
      error.toLowerCase().includes(keyword.toLowerCase())
    )
  )
  
  if (relatedError) {
    const parsedError = ErrorMessageParser.parseError(relatedError)
    return `${parsedError.title}: ${parsedError.description}`
  }
  
  // 如果没有找到具体的错误，但有错误列表，返回第一个错误的解析结果
  if (props.syncResult.errors.length > 0) {
    const firstError = props.syncResult.errors[0]
    const parsedError = ErrorMessageParser.parseError(firstError)
    return `${parsedError.title}: ${parsedError.description}`
  }
  
  return undefined
}

// 同步步骤
const syncSteps = computed((): SyncStep[] => {
  const status = props.syncStatus || {}
  
  return [
    {
      title: '1️⃣ 机器人名称同步',
      description: '设置机器人在Telegram中显示的名称',
      status: props.isLoading ? 'loading' : 
             (status.nameSync === true || status.name === true) ? 'success' : 
             (status.nameSync === false || status.name === false) ? 'error' : 
             !props.isLoading ? 'success' : 'loading',
      error: (status.nameSync === false || status.name === false) ? getStepError('name') || '同步失败' : undefined
    },
    {
      title: '2️⃣ 机器人描述同步',
      description: '设置机器人的详细描述信息',
      status: props.isLoading ? 'loading' : 
             (status.descriptionSync === true || status.description === true) ? 'success' : 
             (status.descriptionSync === false || status.description === false) ? 'error' : 
             !props.isLoading ? 'success' : 'loading',
      error: (status.descriptionSync === false || status.description === false) ? getStepError('description') || '同步失败' : undefined
    },
    {
      title: '3️⃣ 命令列表同步',
      description: '同步基础命令、菜单命令和自定义命令',
      status: props.isLoading ? 'loading' : 
             (status.commandsSync === true || status.commands === true) ? 'success' : 
             (status.commandsSync === false || status.commands === false) ? 'error' : 
             !props.isLoading ? 'success' : 'loading',
      error: (status.commandsSync === false || status.commands === false) ? getStepError('commands') || '同步失败' : undefined
    },
    {
      title: '4️⃣ 短描述同步',
      description: '设置机器人在聊天列表中的简短描述',
      status: props.isLoading ? 'loading' : 
             (status.shortDescriptionSync === true || status.shortDescription === true) ? 'success' : 
             (status.shortDescriptionSync === false || status.shortDescription === false) ? 'error' : 
             !props.isLoading ? 'success' : 'loading',
      error: (status.shortDescriptionSync === false || status.shortDescription === false) ? getStepError('shortDescription') || '同步失败' : undefined
    },
    {
      title: '5️⃣ 菜单按钮同步',
      description: '配置Telegram菜单按钮（如果启用）',
      status: props.isLoading ? 'loading' : 
             (status.menuButtonSync === null || status.menuButton === null) ? 'skipped' :
             (status.menuButtonSync === true || status.menuButton === true) ? 'success' : 
             (status.menuButtonSync === false || status.menuButton === false) ? 'error' : 
             !props.isLoading ? 'success' : 'loading',
      error: (status.menuButtonSync === false || status.menuButton === false) ? getStepError('menuButton') || '同步失败' : undefined
    },
    {
      title: '6️⃣ 价格配置同步',
      description: '验证价格配置和内嵌键盘（能量闪租、笔数套餐、TRX闪兑）',
      status: props.isLoading ? 'loading' : 
             (status.priceConfigSync === null || status.priceConfig === null) ? 'skipped' :
             (status.priceConfigSync === true || status.priceConfig === true) ? 'success' : 
             (status.priceConfigSync === false || status.priceConfig === false) ? 'error' : 
             !props.isLoading ? 'success' : 'loading',
      error: (status.priceConfigSync === false || status.priceConfig === false) ? getStepError('priceConfig') || '同步失败' : undefined
    }
  ]
})

// 计算状态 - 只计算我们关心的6个步骤
const successCount = computed(() => {
  const status = props.syncStatus || {}
  const stepKeys = [
    'nameSync', 'name',
    'descriptionSync', 'description', 
    'shortDescriptionSync', 'shortDescription',
    'commandsSync', 'commands',
    'menuButtonSync', 'menuButton',
    'priceConfigSync', 'priceConfig'
  ]
  
  // 计算成功的步骤数（避免重复计算）
  let count = 0
  const pairs = [
    [status.nameSync, status.name],
    [status.descriptionSync, status.description],
    [status.shortDescriptionSync, status.shortDescription],
    [status.commandsSync, status.commands],
    [status.menuButtonSync, status.menuButton],
    [status.priceConfigSync, status.priceConfig]
  ]
  
  pairs.forEach(([syncKey, rawKey]) => {
    if (syncKey === true || rawKey === true) {
      count++
    }
  })
  
  return count
})

const totalCount = computed(() => {
  const status = props.syncStatus || {}
  
  // 计算非null的步骤数（避免重复计算）
  let count = 0
  const pairs = [
    [status.nameSync, status.name],
    [status.descriptionSync, status.description],
    [status.shortDescriptionSync, status.shortDescription],
    [status.commandsSync, status.commands],
    [status.menuButtonSync, status.menuButton],
    [status.priceConfigSync, status.priceConfig]
  ]
  
  pairs.forEach(([syncKey, rawKey]) => {
    if ((syncKey !== undefined && syncKey !== null) || (rawKey !== undefined && rawKey !== null)) {
      count++
    }
  })
  
  return count || 6 // 默认6个步骤
})

const completionRate = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((successCount.value / totalCount.value) * 100)
})

const isSuccess = computed(() => {
  return !props.isLoading && completionRate.value === 100
})

const isPartialSuccess = computed(() => {
  return !props.isLoading && completionRate.value > 0 && completionRate.value < 100
})

const progressColor = computed(() => {
  if (completionRate.value === 100) return '#67c23a'
  if (completionRate.value > 0) return '#e6a23c'
  return '#f56c6c'
})

const statusTitle = computed(() => {
  if (props.isLoading) return '正在同步配置到Telegram...'
  if (isSuccess.value) return '同步完成！'
  if (isPartialSuccess.value) return '部分同步成功'
  return '同步失败'
})

const statusDescription = computed(() => {
  if (props.isLoading) return '请稍等，正在将机器人配置同步到Telegram服务器'
  if (isSuccess.value) return '所有配置已成功同步到Telegram，机器人可以正常使用'
  
  // 如果有解析后的错误信息，使用智能分析结果
  if (parsedErrors.value.length > 0) {
    const analysis = errorAnalysis.value
    switch (analysis.severity) {
      case 'critical':
        return `${analysis.primaryError?.title || '严重错误'}，${analysis.suggestedAction}`
      case 'high':
        return `${analysis.primaryError?.title || '权限问题'}，${analysis.suggestedAction}`
      case 'medium':
        return `${analysis.primaryError?.title || '配置问题'}，${analysis.suggestedAction}`
      case 'low':
        if (analysis.retryable) {
          return `${analysis.primaryError?.title || '网络问题'}，${analysis.suggestedAction}`
        }
        break
    }
  }
  
  // 默认描述
  if (isPartialSuccess.value) return '部分配置同步失败，请检查错误详情'
  return '配置同步失败，请检查错误详情或稍后重试'
})

// 检查日志中是否有错误
const hasErrors = computed(() => {
  return props.logs.some(log => log.includes('❌') || log.includes('ERROR') || log.includes('错误'))
})

// 检查日志中是否有警告
const hasWarnings = computed(() => {
  return props.logs.some(log => log.includes('⚠️') || log.includes('WARNING') || log.includes('警告') || log.includes('⏭️'))
})

// 事件处理
const handleClose = () => {
  visible.value = false
}

const handleRetry = () => {
  emit('retry')
}

// 切换详细视图
const toggleExpandedView = () => {
  isExpandedView.value = !isExpandedView.value
}

// 获取特定步骤的相关日志
const getStepLogs = (step: SyncStep, stepIndex: number) => {
  const stepKeywords = [
    ['名称', 'name', 'setMyName'],
    ['描述', 'description', 'setMyDescription'], 
    ['命令', 'command', 'setMyCommands'],
    ['短描述', 'shortDescription', 'setMyShortDescription'],
    ['菜单', 'menu', 'setChatMenuButton'],
    ['价格配置', 'priceConfig', 'price', 'config', 'transaction_package', 'energy_flash', 'trx_exchange', '笔数套餐', '能量闪租', 'TRX闪兑']
  ]
  
  const keywords = stepKeywords[stepIndex] || []
  if (keywords.length === 0) return []
  
  return props.logs.filter(log => 
    keywords.some(keyword => 
      log.toLowerCase().includes(keyword.toLowerCase())
    )
  )
}

// 获取未分类的其他日志
const getOtherLogs = () => {
  const stepKeywords = [
    'name', 'setMyName', '名称',
    'description', 'setMyDescription', '描述',
    'command', 'setMyCommands', '命令',
    'shortDescription', 'setMyShortDescription', '短描述',
    'menu', 'setChatMenuButton', '菜单',
    'priceConfig', 'price', 'config', 'transaction_package', 'energy_flash', 'trx_exchange', '价格配置', '笔数套餐', '能量闪租', 'TRX闪兑'
  ]
  
  return props.logs.filter(log => 
    !stepKeywords.some(keyword => 
      log.toLowerCase().includes(keyword.toLowerCase())
    ) && 
    !log.includes('机器人数据库保存') &&
    !log.includes('开始创建机器人') &&
    !log.includes('开始更新机器人')
  )
}

// 监听props变化，自动展开详细视图
watch(() => props.logs, (newLogs) => {
  if (newLogs.length > 0 && !props.isLoading) {
    // 延迟自动展开详细视图
    setTimeout(() => {
      // 如果有错误或者不是完全成功，自动展开详细视图
      if (hasErrors.value || (!isSuccess.value && newLogs.length > 0)) {
        isExpandedView.value = true
      }
    }, 1000)
  }
}, { immediate: true })
</script>

<style scoped>
.sync-status-container {
  max-height: 600px;
  overflow-y: auto;
}

.status-header {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;
}

.sync-details {
  padding: 0 16px 16px;
}

.details-header {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 12px;
}

.compact-view .step-item {
  padding: 8px 0;
  border-left: 2px solid #f5f7fa;
  padding-left: 12px;
  margin-left: 8px;
}

.detailed-view .step-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.detailed-view .step-header {
  margin-bottom: 8px;
}

.detailed-view .step-logs {
  margin-top: 12px;
}

.completion-stats {
  padding: 0 16px 16px;
}

.dialog-footer {
  text-align: right;
}

.is-loading {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}
</style>
