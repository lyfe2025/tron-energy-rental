/**
 * BotStats.vue 组件单元测试
 */
import BotStats from '@/pages/Bots/components/BotStats.vue'
import type { BotStats as BotStatsType } from '@/pages/Bots/types/bot.types'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

// Mock Lucide图标
const MockIcon = {
  name: 'MockIcon',
  template: '<svg data-testid="mock-icon"><path/></svg>'
}

describe('BotStats.vue', () => {
  let mockStats: BotStatsType[]

  beforeEach(() => {
    mockStats = [
      {
        label: '总机器人数',
        value: 15,
        icon: MockIcon,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        change: '+12%',
        changeColor: 'text-green-600'
      },
      {
        label: '在线机器人',
        value: 12,
        icon: MockIcon,
        bgColor: 'bg-green-50',
        iconColor: 'text-green-600',
        change: null,
        changeColor: ''
      },
      {
        label: '今日订单',
        value: 156,
        icon: MockIcon,
        bgColor: 'bg-yellow-50',
        iconColor: 'text-yellow-600',
        change: '-5%',
        changeColor: 'text-red-600'
      },
      {
        label: '总余额',
        value: 50000,
        icon: MockIcon,
        bgColor: 'bg-purple-50',
        iconColor: 'text-purple-600',
        change: '+8%',
        changeColor: 'text-green-600'
      }
    ]
  })

  it('应该正确渲染统计卡片', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: mockStats
      }
    })

    expect(wrapper.exists()).toBe(true)
    
    // 检查是否渲染了正确数量的统计卡片
    const statCards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
    expect(statCards).toHaveLength(4)
  })

  it('应该显示正确的统计标签和数值', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: mockStats
      }
    })

    // 检查第一个统计卡片
    const firstCard = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')[0]
    expect(firstCard.find('.text-sm.font-medium.text-gray-600').text()).toBe('总机器人数')
    expect(firstCard.find('.text-2xl.font-bold.text-gray-900').text()).toBe('15')
  })

  it('应该显示变化数据和正确的颜色', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: mockStats
      }
    })

    // 检查有正向变化的卡片
    const firstCard = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')[0]
    const changeElement = firstCard.find('.text-green-600')
    expect(changeElement.exists()).toBe(true)
    expect(changeElement.text()).toBe('+12%')

    // 检查有负向变化的卡片
    const thirdCard = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')[2]
    const negativeChange = thirdCard.find('.text-red-600')
    expect(negativeChange.exists()).toBe(true)
    expect(negativeChange.text()).toBe('-5%')
  })

  it('应该在没有变化数据时隐藏变化元素', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: mockStats
      }
    })

    // 检查第二个卡片（change为null）
    const secondCard = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')[1]
    const changeElements = secondCard.findAll('[class*="change"]')
    
    // 变化元素应该不存在或者为空
    expect(secondCard.find('.text-sm.mt-1').exists()).toBe(false)
  })

  it('应该应用正确的背景颜色和图标颜色', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: mockStats
      }
    })

    // 检查第一个卡片的背景颜色
    const firstCard = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')[0]
    const iconContainer = firstCard.find('.bg-blue-50')
    expect(iconContainer.exists()).toBe(true)

    // 检查图标颜色
    const icon = iconContainer.find('[data-testid="mock-icon"]')
    expect(icon.exists()).toBe(true)
    expect(icon.classes()).toContain('text-blue-600')
  })

  it('应该正确渲染动态图标组件', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: mockStats
      }
    })

    // 检查每个卡片都有图标
    const icons = wrapper.findAll('[data-testid="mock-icon"]')
    expect(icons).toHaveLength(4)
  })

  it('应该在空数据时正确处理', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: []
      }
    })

    // 应该渲染容器但没有卡片
    expect(wrapper.find('.grid').exists()).toBe(true)
    const statCards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
    expect(statCards).toHaveLength(0)
  })

  it('应该正确处理大数值', () => {
    const largeValueStats: BotStatsType[] = [
      {
        label: '超大数值',
        value: 1234567,
        icon: MockIcon,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        change: null,
        changeColor: ''
      }
    ]

    const wrapper = mount(BotStats, {
      props: {
        botStats: largeValueStats
      }
    })

    const valueElement = wrapper.find('.text-2xl.font-bold.text-gray-900')
    expect(valueElement.text()).toBe('1234567')
  })

  it('应该正确处理长标签文本', () => {
    const longLabelStats: BotStatsType[] = [
      {
        label: '这是一个非常长的标签文本用于测试换行和显示',
        value: 100,
        icon: MockIcon,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        change: null,
        changeColor: ''
      }
    ]

    const wrapper = mount(BotStats, {
      props: {
        botStats: longLabelStats
      }
    })

    const labelElement = wrapper.find('.text-sm.font-medium.text-gray-600')
    expect(labelElement.text()).toBe('这是一个非常长的标签文本用于测试换行和显示')
  })

  it('应该正确应用响应式网格布局', () => {
    const wrapper = mount(BotStats, {
      props: {
        botStats: mockStats
      }
    })

    const gridContainer = wrapper.find('.grid')
    expect(gridContainer.classes()).toContain('grid-cols-1')
    expect(gridContainer.classes()).toContain('md:grid-cols-2')
    expect(gridContainer.classes()).toContain('lg:grid-cols-4')
    expect(gridContainer.classes()).toContain('gap-6')
  })
})
