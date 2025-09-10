<template>
  <div class="image-upload-component">
    <!-- 图片预览区域 -->
    <div v-if="previewUrl" class="image-preview mb-4">
      <div class="relative inline-block">
        <img 
          :src="previewUrl" 
          :alt="imageAlt || '上传的图片'" 
          class="max-w-xs max-h-48 rounded-lg border shadow-sm"
          @error="handleImageError"
        />
        <button
          @click="removeImage"
          class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
          title="删除图片"
        >
          ×
        </button>
      </div>
      <div v-if="imageAlt" class="text-xs text-gray-500 mt-1">
        {{ imageAlt }}
      </div>
    </div>

    <!-- 上传区域 -->
    <div 
      v-if="!previewUrl"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      :class="[
        'upload-area border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      ]"
      @click="openFileDialog"
    >
      <div class="upload-icon mb-2">
        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="upload-text">
        <p class="text-sm text-gray-600">
          <span class="font-medium text-blue-600 hover:text-blue-500">点击上传</span>
          或拖拽图片到此处
        </p>
        <p class="text-xs text-gray-500 mt-1">
          支持 JPG, PNG, GIF, WEBP 格式，最大 5MB
        </p>
      </div>
    </div>

    <!-- 文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- 上传进度 -->
    <div v-if="uploading" class="mt-4">
      <div class="flex items-center">
        <div class="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
        <span class="ml-3 text-sm text-gray-600">{{ uploadProgress }}%</span>
      </div>
      <p class="text-sm text-gray-500 mt-1">正在上传图片...</p>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '../utils/api'

interface Props {
  modelValue?: string
  imageAlt?: string
  maxSize?: number // MB
  accept?: string[]
}

interface Emits {
  (event: 'update:modelValue', value: string): void
  (event: 'upload-success', data: any): void
  (event: 'upload-error', error: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  imageAlt: '',
  maxSize: 5,
  accept: () => ['jpg', 'jpeg', 'png', 'gif', 'webp']
})

const emit = defineEmits<Emits>()

// 响应式数据
const fileInput = ref<HTMLInputElement>()
const previewUrl = ref('')
const uploading = ref(false)
const uploadProgress = ref(0)
const error = ref('')
const isDragging = ref(false)

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== previewUrl.value) {
    // 如果传入的是相对路径，直接使用；如果是完整URL，提取相对路径
    previewUrl.value = newValue.startsWith('http') ? new URL(newValue).pathname : newValue
  } else if (!newValue) {
    previewUrl.value = ''
  }
}, { immediate: true })

// 打开文件对话框
const openFileDialog = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    handleFile(file)
  }
}

// 处理拖拽
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

// 处理文件
const handleFile = async (file: File) => {
  error.value = ''

  // 验证文件类型
  const fileExt = file.name.split('.').pop()?.toLowerCase()
  if (!fileExt || !props.accept.includes(fileExt)) {
    error.value = `不支持的文件格式。仅支持: ${props.accept.join(', ')}`
    return
  }

  // 验证文件大小
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > props.maxSize) {
    error.value = `文件大小不能超过 ${props.maxSize}MB`
    return
  }

  // 开始上传
  await uploadFile(file)
}

// 上传文件
const uploadFile = async (file: File) => {
  uploading.value = true
  uploadProgress.value = 0
  error.value = ''

  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await api.post('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          )
        }
      }
    })

    if (response.data.success) {
      const imageUrl = response.data.data.url
      // 使用相对路径作为预览URL，让Vite代理处理
      previewUrl.value = imageUrl
      
      // 发出事件
      emit('update:modelValue', imageUrl)
      emit('upload-success', response.data.data)
    } else {
      throw new Error(response.data.error || '上传失败')
    }
  } catch (err: any) {
    console.error('Upload error:', err)
    error.value = err.response?.data?.error || err.message || '上传失败'
    emit('upload-error', error.value)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

// 删除图片
const removeImage = () => {
  previewUrl.value = ''
  emit('update:modelValue', '')
  
  // 清空文件输入框
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 处理图片加载错误
const handleImageError = () => {
  console.error('图片加载失败:', previewUrl.value)
  // 可以在这里添加默认图片或其他处理
}
</script>

<style scoped>
.upload-area {
  transition: all 0.2s ease;
}

.upload-area:hover {
  background-color: #f9fafb;
}

.image-preview img {
  object-fit: cover;
}
</style>
