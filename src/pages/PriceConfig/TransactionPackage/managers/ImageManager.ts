/**
 * 图片管理器
 * 负责图片配置的管理
 */
import { ref } from 'vue'

export class ImageManager {
  private imageEnabled = ref(false)
  private imageUrl = ref('')
  private imageAlt = ref('')

  // Getters
  getImageEnabled() {
    return this.imageEnabled
  }

  getImageUrl() {
    return this.imageUrl
  }

  getImageAlt() {
    return this.imageAlt
  }

  // Setters
  setImageEnabled(enabled: boolean) {
    this.imageEnabled.value = enabled
    if (!enabled) {
      this.imageUrl.value = ''
      this.imageAlt.value = ''
    }
  }

  setImageUrl(url: string) {
    this.imageUrl.value = url
  }

  setImageAlt(alt: string) {
    this.imageAlt.value = alt
  }

  /**
   * 从配置加载图片设置
   */
  loadFromConfig(config: any) {
    this.imageEnabled.value = config?.enable_image || false
    this.imageUrl.value = config?.image_url || ''
    this.imageAlt.value = config?.image_alt || ''
  }

  /**
   * 切换图片启用状态
   */
  toggleImageEnabled() {
    this.setImageEnabled(!this.imageEnabled.value)
  }

  /**
   * 处理图片上传成功
   */
  handleImageUploadSuccess(data: any) {
    console.log('图片上传成功:', data)
    this.imageUrl.value = data.url || data
  }

  /**
   * 处理图片上传错误
   */
  handleImageUploadError(error: string) {
    console.error('图片上传失败:', error)
  }

  /**
   * 导出图片配置用于保存
   */
  exportConfig() {
    return {
      enable_image: this.imageEnabled.value,
      image_url: this.imageUrl.value || null,
      image_alt: this.imageAlt.value || null
    }
  }

  /**
   * 验证图片配置
   */
  validateConfig(): boolean {
    if (this.imageEnabled.value) {
      // 如果启用图片，必须有URL
      return !!this.imageUrl.value
    }
    return true
  }

  /**
   * 重置图片配置
   */
  reset() {
    this.imageEnabled.value = false
    this.imageUrl.value = ''
    this.imageAlt.value = ''
  }

  /**
   * 检查图片URL是否有效
   */
  isImageUrlValid(): boolean {
    if (!this.imageUrl.value) return false
    
    try {
      new URL(this.imageUrl.value)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取图片预览信息
   */
  getPreviewInfo() {
    return {
      enabled: this.imageEnabled.value,
      url: this.imageUrl.value,
      alt: this.imageAlt.value,
      isValid: this.isImageUrlValid()
    }
  }
}
