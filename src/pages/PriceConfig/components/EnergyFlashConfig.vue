<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">能量闪租模式</h2>
        <p class="text-gray-600 text-sm mt-1">单笔能量闪电租赁配置</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">启用状态</span>
        <button
          @click="handleToggle"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config?.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <div v-if="config" class="flex flex-col md:flex-row gap-6" ref="layoutContainer">
      <!-- 左侧：Telegram 显示预览 -->
      <div class="md:w-1/3">
        <!-- Telegram风格预览 -->
        <div class="bg-white rounded-lg border shadow-sm max-w-sm sticky top-4">
          <!-- 机器人头部 -->
          <div class="bg-blue-500 text-white px-4 py-3 rounded-t-lg">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span class="text-xs">🤖</span>
              </div>
              <div>
                <div class="text-sm font-medium">TRON能量租赁机器人</div>
                <div class="text-xs text-blue-100">在线</div>
              </div>
            </div>
          </div>
            
          <!-- 消息内容 -->
          <div class="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            <!-- 机器人消息 -->
            <div class="flex gap-2">
              <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-white text-xs">🤖</span>
              </div>
              <div class="flex-1">
                <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <!-- 图片显示（如果启用） -->
                  <div v-if="config.enable_image && config.image_url" class="mb-3">
                    <img 
                      :src="config.image_url" 
                      :alt="config.image_alt || '能量闪租配置图片'" 
                      class="w-full rounded-lg border"
                      @error="handleImageError"
                    />
                    <div v-if="config.image_alt" class="text-xs text-gray-500 mt-1 text-center">
                      {{ config.image_alt }}
                    </div>
                  </div>
                  
                  <!-- 标题 -->
                  <div class="font-bold text-sm mb-1 text-green-600">
                    {{ getDisplayText('title', '⚡闪租能量（需要时）') }}
                  </div>
                  
                  <!-- 副标题 -->
                  <div class="text-xs text-gray-600 mb-2">
                    {{ formatSubtitle() }}
                  </div>
                  
                  <!-- 详细信息 -->
                  <div class="text-xs space-y-1">
                    <div>{{ formatText('duration_label', '⏱ 租期时效：{duration}小时', config.config.expiry_hours) }}</div>
                    <div>{{ formatText('price_label', '💰 单笔价格：{price}TRX', config.config.single_price) }}</div>
                    <div>{{ formatText('max_label', '🔢 最大购买：{max}笔', config.config.max_transactions) }}</div>
                    <div class="pt-1 border-t border-gray-200">{{ getDisplayText('address_label', '📍 支付地址') }}</div>
                    <div class="font-mono text-xs text-blue-600 break-all">{{ config.config.payment_address || 'TExample...' }}</div>
                    
                    <!-- 双倍能量警告 -->
                    <div v-if="config.config.double_energy_for_no_usdt" class="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                      {{ getDisplayText('double_energy_warning', '⚠️ 注意：账户无USDT将消耗双倍能量') }}
                    </div>
                    
                    <!-- 注意事项 -->
                    <div v-if="config.config.notes && config.config.notes.length > 0" class="mt-2 pt-2 border-t border-gray-200">
                      <div class="text-xs font-medium text-gray-700 mb-1">注意事项：</div>
                      <div v-for="(note, index) in config.config.notes" :key="index" class="text-xs text-gray-600">
                        {{ index + 1 }}. {{ note }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 消息发送时间 -->
                <div class="text-xs text-gray-400 mt-1">
                  刚刚
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：配置表单 -->
      <div class="md:w-2/3 space-y-6">
        
        <!-- 图片配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">🖼️ 图片配置</h3>
          
          <div class="space-y-4">
            <!-- 启用图片开关 -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">启用图片显示</label>
                <p class="text-xs text-gray-500">在Telegram消息中显示图片</p>
              </div>
              <button
                @click="toggleImageEnabled"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  config.enable_image ? 'bg-blue-600' : 'bg-gray-200'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    config.enable_image ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>

            <!-- 图片上传 -->
            <div v-if="config.enable_image">
              <label class="block text-sm font-medium text-gray-700 mb-2">上传图片</label>
              <ImageUpload
                v-model="config.image_url"
                :image-alt="config.image_alt"
                @upload-success="handleImageUploadSuccess"
                @upload-error="handleImageUploadError"
              />
            </div>

            <!-- 图片描述 -->
            <div v-if="config.enable_image && config.image_url">
              <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">图片描述（可选）</label>
              <input
                type="text"
                v-model="config.image_alt"
                placeholder="图片的替代文本描述"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">用于图片加载失败时的替代显示</p>
            </div>
          </div>
        </div>

        <!-- 基础配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">⚙️ 基础配置</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">单笔价格</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="config.config.single_price"
                  type="number"
                  step="0.1"
                  min="0.1"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">TRX</span>
              </div>
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">最大购买数量</label>
              <input
                v-model.number="config.config.max_transactions"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">租赁时长</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="config.config.expiry_hours"
                  type="number"
                  min="1"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">小时</span>
              </div>
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">支付地址</label>
              <input
                v-model="config.config.payment_address"
                type="text"
                placeholder="请输入TRON支付地址"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- 特殊选项 -->
          <div class="mt-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">无USDT双倍能量</label>
                <p class="text-xs text-gray-500">当用户账户无USDT时提供双倍能量</p>
              </div>
              <button
                @click="toggleDoubleEnergy"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  config.config.double_energy_for_no_usdt ? 'bg-blue-600' : 'bg-gray-200'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    config.config.double_energy_for_no_usdt ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- 显示文本配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">📝 显示文本配置</h3>
          <div class="space-y-4">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                v-model="displayTexts.title"
                type="text"
                placeholder="⚡闪租能量（需要时）"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">副标题模板</label>
              <input
                v-model="displayTexts.subtitle_template"
                type="text"
                placeholder="（{price}TRX/笔，最多买{max}笔）"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">支持变量：{price} 价格，{max} 最大数量</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">租赁时长标签</label>
                <input
                  v-model="displayTexts.duration_label"
                  type="text"
                  placeholder="⏱ 租期时效：{duration}小时"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">价格标签</label>
                <input
                  v-model="displayTexts.price_label"
                  type="text"
                  placeholder="💰 单笔价格：{price}TRX"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">最大数量标签</label>
                <input
                  v-model="displayTexts.max_label"
                  type="text"
                  placeholder="🔢 最大购买：{max}笔"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">地址标签</label>
                <input
                  v-model="displayTexts.address_label"
                  type="text"
                  placeholder="📍 支付地址"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">双倍能量提醒</label>
              <textarea
                v-model="displayTexts.double_energy_warning"
                rows="2"
                placeholder="⚠️ 注意：账户无USDT将消耗双倍能量"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- 注意事项配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">📋 注意事项配置</h3>
          <div class="space-y-3">
            <div v-for="(note, index) in notes" :key="index" class="flex gap-2">
              <input
                v-model="notes[index]"
                type="text"
                :placeholder="`注意事项 ${index + 1}`"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                @click="removeNote(index)"
                class="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
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

        <!-- 保存按钮 -->
        <div class="mt-4 flex justify-end">
          <button
            @click="handleSave"
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
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import ImageUpload from '../../../components/ImageUpload.vue';
import type { ConfigCardProps } from '../types';

/**
 * 组件接口定义 - 保持与原组件完全一致
 */
const props = defineProps<ConfigCardProps>()

// 初始化默认配置
const initializeConfig = () => {
  if (props.config?.config) {
    // 确保 display_texts 存在
    if (!props.config.config.display_texts) {
      props.config.config.display_texts = {
        title: '',
        subtitle_template: '',
        duration_label: '',
        price_label: '',
        max_label: '',
        address_label: '',
        double_energy_warning: ''
      }
    }
    // 确保 notes 数组存在
    if (!props.config.config.notes) {
      props.config.config.notes = []
    }
  }
}

const handleToggle = () => {
  props.onToggle('energy_flash')
}

const handleSave = () => {
  props.onSave('energy_flash')
}

// 每次props变化时也调试一下
watch(() => props.config, () => {
  console.log('🐛 EnergyFlash Config Changed:', props.config?.mode_type)
  initializeConfig() // 初始化配置
  setTimeout(() => {
    if (layoutContainer.value) debugLayout()
  }, 100)
}, { immediate: true })

// 计算属性：安全访问 display_texts
const displayTexts = computed(() => {
  if (!props.config?.config?.display_texts) {
    return {
      title: '',
      subtitle_template: '',
      duration_label: '',
      price_label: '',
      max_label: '',
      address_label: '',
      double_energy_warning: ''
    }
  }
  return props.config.config.display_texts
})

// 计算属性：安全访问 notes
const notes = computed(() => {
  return props.config?.config?.notes || []
})

// 获取显示文本，如果没有配置则使用默认值
const getDisplayText = (key: string, defaultValue: string): string => {
  return props.config?.config.display_texts?.[key] || defaultValue
}

// 格式化副标题，替换占位符
const formatSubtitle = (): string => {
  const template = getDisplayText('subtitle_template', '（{price}TRX/笔，最多买{max}笔）')
  return template
    .replace('{price}', props.config?.config.single_price?.toString() || '0')
    .replace('{max}', props.config?.config.max_transactions?.toString() || '0')
}

// 格式化文本，替换单个占位符
const formatText = (textKey: string, defaultTemplate: string, value: any): string => {
  const template = getDisplayText(textKey, defaultTemplate)
  const placeholder = textKey.includes('duration') ? '{duration}' : 
                     textKey.includes('price') ? '{price}' : 
                     textKey.includes('max') ? '{max}' : '{value}'
  return template.replace(placeholder, value?.toString() || '0')
}

// 图片相关处理函数
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
}

const handleImageUploadSuccess = (data: { url: string; filename: string }) => {
  if (props.config) {
    props.config.image_url = data.url
    console.log('图片上传成功:', data)
  }
}

const handleImageUploadError = (error: string) => {
  console.error('图片上传失败:', error)
}

const toggleImageEnabled = () => {
  if (props.config) {
    props.config.enable_image = !props.config.enable_image
    if (!props.config.enable_image) {
      props.config.image_url = ''
      props.config.image_alt = ''
    }
  }
}

// 双倍能量开关
const toggleDoubleEnergy = () => {
  if (props.config) {
    props.config.config.double_energy_for_no_usdt = !props.config.config.double_energy_for_no_usdt
  }
}

// 注意事项管理
const addNote = () => {
  if (props.config && props.config.config.notes) {
    props.config.config.notes.push('')
  }
}

const removeNote = (index: number) => {
  if (props.config && props.config.config.notes) {
    props.config.config.notes.splice(index, 1)
  }
}

// 组件挂载时初始化
const layoutContainer = ref(null)

// 调试函数  
const debugLayout = () => {
  if (layoutContainer.value) {
    const element = layoutContainer.value as HTMLElement
    const styles = window.getComputedStyle(element)
    const screenWidth = window.innerWidth
    
    console.log('🐛 EnergyFlash Layout Debug:', {
      screenWidth,
      flexDirection: styles.flexDirection,
      className: element.className,
      isMdBreakpoint: screenWidth >= 768,
      elementWidth: element.offsetWidth
    })
    
    // 检查子元素
    const children = element.children
    console.log(`🐛 EnergyFlash 总共有 ${children.length} 个子元素`)
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const childStyles = window.getComputedStyle(child)
      console.log(`  子元素 ${i + 1}:`, {
        className: child.className,
        width: childStyles.width,
        height: childStyles.height,
        display: childStyles.display,
        visibility: childStyles.visibility,
        opacity: childStyles.opacity,
        flexBasis: childStyles.flexBasis,
        offsetWidth: child.offsetWidth,
        offsetHeight: child.offsetHeight,
        isVisible: child.offsetWidth > 0 && child.offsetHeight > 0
      })
    }
  }
}

onMounted(() => {
  // 调试当前布局
  nextTick(() => {
    debugLayout()
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      setTimeout(debugLayout, 100)
    })
  })
})
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}

.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>