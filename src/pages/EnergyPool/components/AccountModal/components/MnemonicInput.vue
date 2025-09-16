<template>
  <div>
    <label for="mnemonic" class="block text-sm font-medium text-gray-700 mb-1">
      助记词 *
    </label>
    <textarea
      id="mnemonic"
      :model-value="modelValue"
      @input="onInput"
      @blur="onBlur"
      rows="3"
      placeholder="请输入12或24个助记词，用空格分隔"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
      :class="{ 'border-red-500': error }"
    ></textarea>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    
    <!-- 助记词获取指南 -->
    <div class="mt-2">
      <button
        type="button"
        @click="showMnemonicGuide = !showMnemonicGuide"
        class="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        <HelpCircle class="w-4 h-4 mr-1" />
        <span>如何从钱包软件获取助记词？</span>
        <ChevronDown 
          :class="{ 'transform rotate-180': showMnemonicGuide }"
          class="w-4 h-4 ml-1 transition-transform duration-200"
        />
      </button>
      
      <div v-if="showMnemonicGuide" class="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="text-sm text-gray-700 space-y-4">
          <!-- 安全提醒 -->
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex items-start">
              <AlertTriangle class="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div class="text-xs text-red-800">
                <strong>重要安全提醒：</strong>助记词是恢复钱包的唯一凭证，比私钥更加重要。请在绝对安全的环境中操作，确保无人监视，避免截图、拍照或网络传输。
              </div>
            </div>
          </div>

          <!-- TronLink 钱包 -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <Wallet class="w-4 h-4 mr-2 text-blue-600" />
              TronLink 钱包
            </h4>
            <ol class="text-xs text-gray-600 space-y-1 ml-6 list-decimal">
              <li>打开 TronLink 浏览器扩展或手机应用</li>
              <li>点击右上角菜单图标 → 选择"设置"</li>
              <li>找到"钱包备份"或"导出助记词"选项</li>
              <li>输入钱包密码进行身份验证</li>
              <li>确保周围环境安全后，查看并记录助记词</li>
              <li>按正确顺序复制所有助记词（通常为12或24个单词）</li>
            </ol>
          </div>

          <!-- imToken 钱包 -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <Smartphone class="w-4 h-4 mr-2 text-green-600" />
              imToken 钱包
            </h4>
            <ol class="text-xs text-gray-600 space-y-1 ml-6 list-decimal">
              <li>打开 imToken 手机应用</li>
              <li>进入对应的 TRON 钱包</li>
              <li>点击"我" → "管理钱包"</li>
              <li>选择要导出的钱包，点击"备份助记词"</li>
              <li>输入钱包密码或使用生物识别验证</li>
              <li>在安全环境中查看并复制助记词</li>
            </ol>
          </div>

          <!-- Trust Wallet -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <Shield class="w-4 h-4 mr-2 text-purple-600" />
              Trust Wallet
            </h4>
            <ol class="text-xs text-gray-600 space-y-1 ml-6 list-decimal">
              <li>打开 Trust Wallet 应用</li>
              <li>点击右下角"设置"</li>
              <li>选择"钱包" → 点击要备份的钱包</li>
              <li>选择"显示恢复短语"或"备份钱包"</li>
              <li>输入安全密码或使用生物识别</li>
              <li>确保隐私后查看并复制助记词</li>
            </ol>
          </div>

          <!-- 其他钱包 -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <MoreHorizontal class="w-4 h-4 mr-2 text-gray-600" />
              其他钱包软件
            </h4>
            <div class="text-xs text-gray-600 space-y-1">
              <p>大多数钱包的操作步骤类似：</p>
              <ul class="ml-4 list-disc space-y-1">
                <li>找到"设置"、"安全"或"备份"菜单</li>
                <li>寻找"助记词备份"、"恢复短语"或"种子短语"选项</li>
                <li>通过密码或生物识别验证身份</li>
                <li>在安全环境中查看并记录助记词</li>
              </ul>
            </div>
          </div>

          <!-- 格式说明 -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div class="text-xs text-gray-700">
              <strong>助记词格式：</strong>12或24个英文单词，用空格分隔（如：word1 word2 word3...）
              <br>
              <strong>注意事项：</strong>单词顺序很重要，必须按照钱包显示的确切顺序输入
              <br>
              <strong>兼容性：</strong>本系统支持标准BIP39助记词，与主流钱包完全兼容
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 生成私钥按钮 -->
    <div class="mt-2">
      <button
        type="button"
        @click="onGenerate"
        :disabled="!modelValue || generating"
        class="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
      >
        <Loader2 v-if="generating" class="w-3 h-3 animate-spin" />
        <span>{{ generating ? '生成中...' : '从助记词生成私钥' }}</span>
      </button>
      
      <!-- 生成成功提示 -->
      <div v-if="generated === true && !generating" class="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
        ✅ 私钥生成成功！请点击下方"获取账户信息"按钮验证账户数据。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ChevronDown,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  Shield,
  Smartphone,
  Wallet
} from 'lucide-vue-next'
import { ref } from 'vue'

interface Props {
  modelValue: string
  error: string
  generating: boolean
  generated?: boolean
}

interface Emits {
  'update:modelValue': [value: string]
  generate: []
  blur: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const showMnemonicGuide = ref(false)

const onInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

const onBlur = () => {
  emit('blur')
}

const onGenerate = () => {
  emit('generate')
}
</script>
