import type { Bot, BotForm, BotStats } from '@/pages/Bots/types/bot.types'

// Mock API functions for bot management
export const botApi = {
  // Get all bots
  async getBots(): Promise<{ data: Bot[] }> {
    // Mock data - replace with actual API call
    const data = [
      {
        id: '1',
        name: '能量机器人-001',
        address: 'TRX7n2oDdZhiFrRFUegbqtEeMLNLy2Rhyx',
        private_key: '***',
        type: 'energy',
        description: '专门处理能量租赁的机器人',
        min_order_amount: 10,
        max_order_amount: 1000,
        is_active: true,
        status: 'active',
        balance: 1250.50,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-20T15:45:00Z'
      },
      {
        id: '2',
        name: '带宽机器人-001',
        address: 'TRX8m3pEeZjgGsRGVfhcqtFfNMOLz3Sizy',
        private_key: '***',
        type: 'bandwidth',
        description: '专门处理带宽租赁的机器人',
        min_order_amount: 5,
        max_order_amount: 500,
        is_active: false,
        status: 'inactive',
        balance: 850.25,
        created_at: '2024-01-10T08:20:00Z',
        updated_at: '2024-01-18T12:30:00Z'
      }
    ]
    return { data }
  },

  // Get bot statistics
  async getBotStats(): Promise<BotStats> {
    // Mock data - replace with actual API call
    return {
      total: 12,
      active: 8,
      inactive: 4,
      totalBalance: 15420.75
    }
  },

  // Create a new bot
  async createBot(botData: BotForm): Promise<Bot> {
    // Mock implementation - replace with actual API call
    const newBot: Bot = {
      id: Date.now().toString(),
      ...botData,
      status: botData.is_active ? 'active' : 'inactive',
      balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    return newBot
  },

  // Update an existing bot
  async updateBot(id: string, botData: Partial<BotForm>): Promise<Bot> {
    // Mock implementation - replace with actual API call
    const updatedBot: Bot = {
      id,
      name: botData.name || '',
      address: botData.address || '',
      private_key: botData.private_key || '',
      type: botData.type || 'energy',
      description: botData.description || '',
      min_order_amount: botData.min_order_amount || 0,
      max_order_amount: botData.max_order_amount || 0,
      is_active: botData.is_active || false,
      status: botData.is_active ? 'active' : 'inactive',
      balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    return updatedBot
  },

  // Delete a bot
  async deleteBot(id: string): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Deleting bot with id: ${id}`)
  },

  // Start bots
  async startBots(ids: string[]): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Starting bots with ids: ${ids.join(', ')}`)
  },

  // Stop bots
  async stopBots(ids: string[]): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Stopping bots with ids: ${ids.join(', ')}`)
  },

  // Test bots
  async testBots(ids: string[]): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Testing bots with ids: ${ids.join(', ')}`)
  },

  // Recharge bot balance
  async rechargeBot(id: string, amount: number): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Recharging bot ${id} with amount: ${amount}`)
  },

  // Test bot connection
  async testBotConnection(id: string): Promise<boolean> {
    // Mock implementation - replace with actual API call
    console.log(`Testing connection for bot: ${id}`)
    return Math.random() > 0.3 // 70% success rate
  },

  // Update bot status
  async updateBotStatus(id: string, status: string): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Updating bot ${id} status to: ${status}`)
  },

  // Reset bot
  async resetBot(id: string): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Resetting bot with id: ${id}`)
  },

  // Batch update status
  async batchUpdateStatus(ids: string[], status: string): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Batch updating bots ${ids.join(', ')} status to: ${status}`)
  },

  // Batch test connection
  async batchTestConnection(ids: string[]): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log(`Batch testing connection for bots: ${ids.join(', ')}`)
  }
}