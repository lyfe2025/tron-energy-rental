/**
 * 预设值管理逻辑
 */

import { useToast } from '@/composables/useToast'
import { reactive, ref } from 'vue'
import { SimpleResourceConsumptionApi } from '../../../services/simpleApi'
import type { EnergyConfig } from '../../../types/resource-consumption.types'
import { ResourceConsumptionValidator } from '../../../utils/validation'
import type { NewPresetState } from '../types/energy-calculator.types'

export function usePresetManager(
  localConfig: EnergyConfig, 
  emitUpdate: () => Promise<void>
) {
  const { success, error, warning } = useToast()
  
  // 新预设
  const newPreset = reactive<NewPresetState>({
    name: '',
    value: 15000
  })

  // 保存状态
  const isSaving = ref(false)

  // 应用预设值
  const applyPreset = (value: number) => {
    localConfig.usdt_standard_energy = value
    emitUpdate()
    success(`已应用预设值：${value.toLocaleString()} 能量`)
  }

  // 添加预设值
  const addPreset = async () => {
    if (!newPreset.name.trim() || !newPreset.value) {
      warning('请填写完整的预设信息')
      return
    }
    
    // 验证预设值
    const rule = ResourceConsumptionValidator.getFieldRule('energy', 'usdt_standard_energy')
    if (rule && rule.min !== undefined && rule.max !== undefined && (newPreset.value < rule.min || newPreset.value > rule.max)) {
      error(`预设值必须在 ${rule.min} - ${rule.max} 之间`)
      return
    }
    
    // 检查重复名称
    if (localConfig.preset_values.some(preset => preset.name === newPreset.name.trim())) {
      warning('预设名称已存在')
      return
    }

    // 保存新预设值的引用，用于回滚
    const newPresetValue = {
      name: newPreset.name.trim(),
      value: newPreset.value
    }

    try {
      isSaving.value = true
      
      // 先更新本地状态
      localConfig.preset_values.push(newPresetValue)
      await emitUpdate()
      
      // 使用独立的预设值保存API
      await SimpleResourceConsumptionApi.saveEnergyPresets(localConfig.preset_values)
      
      // 保存成功后清空输入
      newPreset.name = ''
      newPreset.value = 15000
      
      success('预设值添加成功')
    } catch (error) {
      // 保存失败，回滚本地状态
      const index = localConfig.preset_values.findIndex(p => p.name === newPresetValue.name && p.value === newPresetValue.value)
      if (index !== -1) {
        localConfig.preset_values.splice(index, 1)
      }
      
      console.error('保存预设值失败:', error)
      error('预设值保存失败，请稍后重试')
    } finally {
      isSaving.value = false
    }
  }

  // 删除预设值
  const removePreset = async (index: number) => {
    if (index < 0 || index >= localConfig.preset_values.length) {
      error('预设值索引无效')
      return
    }

    // 保存被删除的预设值，用于回滚
    const deletedPreset = localConfig.preset_values[index]

    try {
      isSaving.value = true
      
      // 先更新本地状态
      localConfig.preset_values.splice(index, 1)
      await emitUpdate()
      
      // 使用独立的预设值保存API
      await SimpleResourceConsumptionApi.saveEnergyPresets(localConfig.preset_values)
      
      success('预设值删除成功')
    } catch (error) {
      // 保存失败，回滚本地状态
      localConfig.preset_values.splice(index, 0, deletedPreset)
      
      console.error('删除预设值失败:', error)
      error('预设值删除失败，请稍后重试')
    } finally {
      isSaving.value = false
    }
  }

  return {
    newPreset,
    isSaving,
    applyPreset,
    addPreset,
    removePreset
  }
}
