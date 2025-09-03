/**
 * 设置核心状态管理模块
 * 负责状态管理、标签页配置和基本计算属性
 */

import { Bell, DollarSign, Settings, Shield, Wrench } from 'lucide-vue-next'
import { computed, reactive } from 'vue'
import type { SettingsManagementState, SettingsTab } from '../types/settings.types'

export function useSettingsCore() {
  // 状态管理
  const state = reactive<Pick<SettingsManagementState, 'activeTab' | 'isSaving' | 'isLoading' | 'isDirty' | 'lastSaved'>>({
    activeTab: 'basic',
    isSaving: false,
    isLoading: false,
    isDirty: false,
    lastSaved: null
  })

  // 标签页配置
  const settingTabs: SettingsTab[] = [
    { id: 'basic', name: '基础设置', icon: Settings },
    { id: 'security', name: '安全设置', icon: Shield },
    { id: 'notifications', name: '通知设置', icon: Bell },
    { id: 'pricing', name: '定价设置', icon: DollarSign },
    { id: 'advanced', name: '高级设置', icon: Wrench }
  ]

  // 计算属性
  const hasUnsavedChanges = computed(() => {
    return state.isDirty
  })

  // 状态控制方法
  const setLoading = (loading: boolean) => {
    state.isLoading = loading
  }

  const setSaving = (saving: boolean) => {
    state.isSaving = saving
  }

  const setDirty = (dirty: boolean) => {
    state.isDirty = dirty
  }

  const setLastSaved = (date: Date | null) => {
    state.lastSaved = date
  }

  const setActiveTab = (tabId: string) => {
    state.activeTab = tabId
  }

  return {
    // 状态
    state,
    settingTabs,
    
    // 计算属性
    hasUnsavedChanges,
    activeTab: computed(() => state.activeTab),
    isSaving: computed(() => state.isSaving),
    isLoading: computed(() => state.isLoading),
    isDirty: computed(() => state.isDirty),
    lastSaved: computed(() => state.lastSaved),
    
    // 状态控制方法
    setLoading,
    setSaving,
    setDirty,
    setLastSaved,
    setActiveTab
  }
}
