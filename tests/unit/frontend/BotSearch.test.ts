/**
 * BotSearch.vue 组件单元测试
 */
import BotSearch from '@/pages/Bots/components/BotSearch.vue'
import type { BotFilters } from '@/pages/Bots/types/bot.types'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Lucide图标
vi.mock('lucide-vue-next', () => ({
  Search: { name: 'Search', template: '<svg data-testid="search-icon"><path/></svg>' },
  RotateCcw: { name: 'RotateCcw', template: '<svg data-testid="rotate-icon"><path/></svg>' },
  Download: { name: 'Download', template: '<svg data-testid="download-icon"><path/></svg>' }
}))

describe('BotSearch.vue', () => {
  let defaultFilters: BotFilters

  beforeEach(() => {
    defaultFilters = {
      searchQuery: '',
      statusFilter: '',
      typeFilter: ''
    }
  })

  it('应该正确渲染搜索组件', () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.findAll('select')).toHaveLength(2)
    expect(wrapper.findAll('button')).toHaveLength(2)
  })

  it('应该显示正确的占位符文本', () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const searchInput = wrapper.find('input[type="text"]')
    expect(searchInput.attributes('placeholder')).toBe('搜索机器人名称或地址...')
  })

  it('应该正确绑定搜索查询值', async () => {
    const filters: BotFilters = {
      searchQuery: 'test robot',
      statusFilter: '',
      typeFilter: ''
    }

    const wrapper = mount(BotSearch, {
      props: {
        filters
      }
    })

    const searchInput = wrapper.find('input[type="text"]')
    expect((searchInput.element as HTMLInputElement).value).toBe('test robot')
  })

  it('应该正确绑定状态筛选器值', () => {
    const filters: BotFilters = {
      searchQuery: '',
      statusFilter: 'online',
      typeFilter: ''
    }

    const wrapper = mount(BotSearch, {
      props: {
        filters
      }
    })

    const statusSelect = wrapper.findAll('select')[0]
    expect((statusSelect.element as HTMLSelectElement).value).toBe('online')
  })

  it('应该正确绑定类型筛选器值', () => {
    const filters: BotFilters = {
      searchQuery: '',
      statusFilter: '',
      typeFilter: 'energy'
    }

    const wrapper = mount(BotSearch, {
      props: {
        filters
      }
    })

    const typeSelect = wrapper.findAll('select')[1]
    expect((typeSelect.element as HTMLSelectElement).value).toBe('energy')
  })

  it('应该显示所有状态选项', () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const statusSelect = wrapper.findAll('select')[0]
    const options = statusSelect.findAll('option')
    
    expect(options).toHaveLength(7) // 包括"全部状态"
    expect(options[0].text()).toBe('全部状态')
    expect(options[1].text()).toBe('在线')
    expect(options[2].text()).toBe('离线')
    expect(options[3].text()).toBe('活跃')
    expect(options[4].text()).toBe('非活跃')
    expect(options[5].text()).toBe('异常')
    expect(options[6].text()).toBe('维护中')
  })

  it('应该显示所有类型选项', () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const typeSelect = wrapper.findAll('select')[1]
    const options = typeSelect.findAll('option')
    
    expect(options).toHaveLength(4) // 包括"全部类型"
    expect(options[0].text()).toBe('全部类型')
    expect(options[1].text()).toBe('能量')
    expect(options[2].text()).toBe('带宽')
    expect(options[3].text()).toBe('混合')
  })

  it('应该正确处理搜索输入交互', async () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const searchInput = wrapper.find('input[type="text"]')
    
    // 测试输入框是否可以接受输入
    await searchInput.setValue('new search')
    expect((searchInput.element as HTMLInputElement).value).toBe('new search')
  })

  it('应该正确处理状态选择器交互', async () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const statusSelect = wrapper.findAll('select')[0]
    await statusSelect.setValue('online')
    expect((statusSelect.element as HTMLSelectElement).value).toBe('online')
  })

  it('应该正确处理类型选择器交互', async () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const typeSelect = wrapper.findAll('select')[1]
    await typeSelect.setValue('energy')
    expect((typeSelect.element as HTMLSelectElement).value).toBe('energy')
  })

  it('应该在点击重置按钮时清空所有筛选器', async () => {
    const filters: BotFilters = {
      searchQuery: 'test',
      statusFilter: 'online',
      typeFilter: 'energy'
    }

    const wrapper = mount(BotSearch, {
      props: {
        filters
      }
    })

    const resetButton = wrapper.findAll('button')[0]
    await resetButton.trigger('click')

    expect(wrapper.emitted('update:filters')).toBeTruthy()
    const emittedEvents = wrapper.emitted('update:filters') as unknown[][]
    expect(emittedEvents[0][0]).toEqual({
      searchQuery: '',
      statusFilter: '',
      typeFilter: ''
    })
  })

  it('应该在点击导出按钮时发送export事件', async () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const exportButton = wrapper.findAll('button')[1]
    await exportButton.trigger('click')

    expect(wrapper.emitted('export')).toBeTruthy()
    expect(wrapper.emitted('export')).toHaveLength(1)
  })

  it('应该显示正确的按钮文本和图标', () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const buttons = wrapper.findAll('button')
    
    // 重置按钮
    expect(buttons[0].text()).toContain('重置')
    expect(buttons[0].find('[data-testid="rotate-icon"]').exists()).toBe(true)
    
    // 导出按钮
    expect(buttons[1].text()).toContain('导出')
    expect(buttons[1].find('[data-testid="download-icon"]').exists()).toBe(true)
  })

  it('应该正确应用CSS类名', () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    // 检查容器样式
    const container = wrapper.find('.bg-white.rounded-lg.shadow-sm')
    expect(container.exists()).toBe(true)

    // 检查网格布局
    const grid = wrapper.find('.grid.grid-cols-1.md\\:grid-cols-4')
    expect(grid.exists()).toBe(true)

    // 检查输入框样式
    const searchInput = wrapper.find('input[type="text"]')
    expect(searchInput.classes()).toContain('w-full')
    expect(searchInput.classes()).toContain('pl-10')

    // 检查选择器样式
    const selects = wrapper.findAll('select')
    selects.forEach(select => {
      expect(select.classes()).toContain('px-3')
      expect(select.classes()).toContain('py-2')
      expect(select.classes()).toContain('border')
    })
  })

  it('应该正确显示搜索图标', () => {
    const wrapper = mount(BotSearch, {
      props: {
        filters: defaultFilters
      }
    })

    const searchIcon = wrapper.find('[data-testid="search-icon"]')
    expect(searchIcon.exists()).toBe(true)
    expect(searchIcon.classes()).toContain('absolute')
    expect(searchIcon.classes()).toContain('left-3')
  })

  it('应该支持复杂筛选器组合', async () => {
    const complexFilters: BotFilters = {
      searchQuery: 'production bot',
      statusFilter: 'online',
      typeFilter: 'energy'
    }

    const wrapper = mount(BotSearch, {
      props: {
        filters: complexFilters
      }
    })

    // 验证所有筛选器值都正确显示
    const searchInput = wrapper.find('input[type="text"]')
    const statusSelect = wrapper.findAll('select')[0]
    const typeSelect = wrapper.findAll('select')[1]

    expect((searchInput.element as HTMLInputElement).value).toBe('production bot')
    expect((statusSelect.element as HTMLSelectElement).value).toBe('online')
    expect((typeSelect.element as HTMLSelectElement).value).toBe('energy')
  })
})
