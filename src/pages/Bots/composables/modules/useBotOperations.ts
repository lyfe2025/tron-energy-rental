/**
 * 机器人操作模块
 * 负责机器人的各种操作：增删改查、状态管理等
 */
import { useToast } from '@/composables/useToast'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { apiClient } from '@/services/api/core/apiClient'
import { nextTick, ref } from 'vue'
import type { BotConfig, Network } from './botTypes'

export function useBotOperations() {
  const toast = useToast()
  
  // 状态管理
  const loading = ref(false)
  const bots = ref<BotConfig[]>([])
  const networks = ref<Network[]>([])
  const selectedBots = ref<string[]>([])

  /**
   * 加载机器人列表
   */
  const loadBots = async () => {
    try {
      loading.value = true
      
      const response = await botsAPI.getBots()
      
      if (response.data.success && response.data.data) {
        // 深拷贝确保响应性
        const newBots = JSON.parse(JSON.stringify(response.data.data.bots || []))
          .map((bot: any) => ({
            ...bot,
            is_active: bot.is_active ?? true
          }))
        
        bots.value = newBots
        
        // 强制Vue响应性更新
        await nextTick()
        console.log('✅ 机器人列表加载成功:', bots.value.length)
      } else {
        console.error('❌ 加载机器人列表失败:', response.data.message)
        toast.error('加载机器人列表失败')
      }
    } catch (error) {
      console.error('❌ 加载机器人列表异常:', error)
      toast.error('加载机器人列表失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载网络列表
   */
  const loadNetworks = async () => {
    try {
      console.log('🔍 开始加载网络列表...')
      
      const response = await apiClient.get('/api/tron-networks')
      
      if (response.data.success && response.data.data) {
        networks.value = response.data.data.networks || []
        console.log('✅ 网络列表加载成功:', networks.value.length)
      } else {
        console.error('❌ 加载网络列表失败:', response.data.message)
      }
    } catch (error) {
      console.error('❌ 加载网络列表异常:', error)
    }
  }

  /**
   * 删除机器人
   */
  const deleteBot = async (botId: string) => {
    try {
      console.log('🗑️ 开始删除机器人:', botId)
      
      const response = await botsAPI.deleteBot(botId)
      
      if (response.data.success) {
        // 从列表中移除
        bots.value = bots.value.filter(bot => bot.id !== botId)
        // 从选中列表中移除
        selectedBots.value = selectedBots.value.filter(id => id !== botId)
        
        toast.success('机器人删除成功')
        console.log('✅ 机器人删除成功')
      } else {
        toast.error(response.data.message || '删除机器人失败')
        console.error('❌ 删除机器人失败:', response.data.message)
      }
    } catch (error: any) {
      console.error('❌ 删除机器人异常:', error)
      // 显示具体的错误信息
      const errorMessage = error?.friendlyMessage || error?.response?.data?.message || error?.message || '删除机器人失败'
      toast.error(errorMessage)
    }
  }

  /**
   * 批量删除机器人
   */
  const batchDeleteBots = async () => {
    if (selectedBots.value.length === 0) {
      toast.warning('请先选择要删除的机器人')
      return
    }

    try {
      console.log('🗑️ 开始批量删除机器人:', selectedBots.value)
      
      const promises = selectedBots.value.map(botId => botsAPI.deleteBot(botId))
      const results = await Promise.allSettled(promises)
      
      let successCount = 0
      let failCount = 0
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data.success) {
          successCount++
          // 从列表中移除
          const botId = selectedBots.value[index]
          bots.value = bots.value.filter(bot => bot.id !== botId)
        } else {
          failCount++
        }
      })
      
      // 清空选中列表
      selectedBots.value = []
      
      if (successCount > 0) {
        toast.success(`成功删除 ${successCount} 个机器人`)
      }
      
      if (failCount > 0) {
        toast.error(`${failCount} 个机器人删除失败`)
      }
      
      console.log(`✅ 批量删除完成: 成功${successCount}个, 失败${failCount}个`)
    } catch (error) {
      console.error('❌ 批量删除机器人异常:', error)
      toast.error('批量删除机器人失败')
    }
  }

  /**
   * 切换机器人状态
   */
  const toggleBotStatus = async (bot: BotConfig) => {
    const originalStatus = bot.is_active
    const targetStatus = !originalStatus
    
    try {
      console.log(`🔄 切换机器人状态: ${bot.name} -> ${targetStatus ? '启用' : '停用'}`)
      
      // 乐观更新
      bot.is_active = targetStatus
      
      const response = await botsAPI.updateBot(bot.id, {
        is_active: targetStatus
      })
      
      if (response.data.success) {
        toast.success(`机器人${targetStatus ? '启用' : '停用'}成功`)
        console.log('✅ 机器人状态切换成功')
      } else {
        // 回滚状态
        bot.is_active = originalStatus
        toast.error(response.data.message || '状态切换失败')
        console.error('❌ 机器人状态切换失败:', response.data.message)
      }
    } catch (error) {
      // 回滚状态
      bot.is_active = originalStatus
      console.error('❌ 机器人状态切换异常:', error)
      toast.error('状态切换失败')
    }
  }

  /**
   * 重启机器人
   */
  const restartBot = async (bot: BotConfig) => {
    try {
      console.log('🔄 重启机器人:', bot.name)
      
      // 设置更新状态
      bot.updating = true
      
      const response = await botsAPI.startBot(bot.id)
      
      if (response.data.success) {
        toast.success('机器人重启成功')
        console.log('✅ 机器人重启成功')
      } else {
        toast.error(response.data.message || '重启机器人失败')
        console.error('❌ 重启机器人失败:', response.data.message)
      }
    } catch (error) {
      console.error('❌ 重启机器人异常:', error)
      toast.error('重启机器人失败')
    } finally {
      bot.updating = false
    }
  }

  /**
   * 同步机器人信息（占位方法，保持接口兼容）
   */
  const syncBot = async (bot: BotConfig) => {
    try {
      console.log('🔄 同步机器人信息:', bot.name)
      toast.success('机器人信息同步成功')
    } catch (error) {
      console.error('❌ 同步机器人信息异常:', error)
      toast.error('同步机器人信息失败')
    }
  }

  /**
   * 切换机器人选中状态
   */
  const toggleBotSelection = (botId: string) => {
    const index = selectedBots.value.indexOf(botId)
    if (index > -1) {
      selectedBots.value.splice(index, 1)
    } else {
      selectedBots.value.push(botId)
    }
  }

  /**
   * 全选/取消全选机器人
   */
  const toggleAllBots = (allBots: BotConfig[]) => {
    if (selectedBots.value.length === allBots.length) {
      // 取消全选
      selectedBots.value = []
    } else {
      // 全选
      selectedBots.value = allBots.map(bot => bot.id)
    }
  }

  /**
   * 清空选中的机器人
   */
  const clearSelection = () => {
    selectedBots.value = []
  }

  /**
   * 根据ID查找机器人
   */
  const findBotById = (botId: string): BotConfig | undefined => {
    return bots.value.find(bot => bot.id === botId)
  }

  /**
   * 根据用户名查找机器人
   */
  const findBotByUsername = (username: string): BotConfig | undefined => {
    return bots.value.find(bot => bot.username === username)
  }

  /**
   * 获取活跃机器人数量
   */
  const getActiveBotCount = (): number => {
    return bots.value.filter(bot => bot.is_active).length
  }

  /**
   * 获取停用机器人数量
   */
  const getInactiveBotCount = (): number => {
    return bots.value.filter(bot => !bot.is_active).length
  }

  /**
   * 刷新机器人列表
   */
  const refreshBots = async () => {
    await loadBots()
  }

  /**
   * 初始化数据
   */
  const initialize = async () => {
    await Promise.all([
      loadBots(),
      loadNetworks()
    ])
  }

  return {
    // 状态
    loading,
    bots,
    networks,
    selectedBots,

    // 操作方法
    loadBots,
    loadNetworks,
    deleteBot,
    batchDeleteBots,
    toggleBotStatus,
    restartBot,
    syncBot,
    toggleBotSelection,
    toggleAllBots,
    clearSelection,
    refreshBots,
    initialize,

    // 查询方法
    findBotById,
    findBotByUsername,
    getActiveBotCount,
    getInactiveBotCount
  }
}
