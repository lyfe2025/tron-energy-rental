<template>
  <el-dialog 
    :model-value="visible" 
    @update:model-value="$emit('update:visible', $event)"
    title="导入通知配置"
    width="600px"
  >
    <div class="import-config-dialog">
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        action=""
        :before-upload="handleImportConfig"
        :show-file-list="false"
        accept=".json"
      >
        <el-icon class="el-icon--upload text-6xl text-gray-400 mb-4">
          <upload-filled />
        </el-icon>
        <div class="el-upload__text text-gray-600">
          将配置文件拖到此处，或<em>点击上传</em>
        </div>
        <div class="el-upload__tip text-sm text-gray-500 mt-2">
          只能上传 JSON 格式的配置文件
        </div>
      </el-upload>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import type { BotNotificationConfig } from '@/types/notification'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'import-config', config: BotNotificationConfig): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// Toast 通知
const { success, error, info } = useToast()

const handleImportConfig = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedConfig = JSON.parse(e.target?.result as string)
      
      ElMessageBox.confirm(
        '导入配置将覆盖当前设置，是否继续？',
        '确认导入',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(() => {
        emit('import-config', importedConfig)
        emit('update:visible', false)
        success('配置导入成功')
      }).catch(() => {
        info('已取消导入')
      })
    } catch (error) {
      error('配置文件格式错误')
    }
  }
  reader.readAsText(file)
  return false // 阻止默认上传
}
</script>
