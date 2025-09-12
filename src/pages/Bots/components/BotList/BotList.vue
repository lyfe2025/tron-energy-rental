<template>
  <div>
    <!-- 机器人卡片列表 -->
    <div 
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
      :class="{ 'opacity-50': loading }"
    >
      <BotCard
        v-for="bot in filteredBots"
        :key="`${bot.id}-${bot.network_id || 'no-network'}-${bot.updated_at || Date.now()}-${Math.random()}`"
        :bot="bot"
        :is-selected="selectedBots.includes(bot.id)"
        @select="$emit('select-bot', $event)"
        @toggle-status="$emit('toggle-status', $event)"
        @edit="$emit('edit', $event)"
        @configure-network="$emit('configure-network', $event)"
        @dropdown-command="(command, bot) => $emit('dropdown-command', command, bot)"
        @open-notifications="$emit('open-notifications', $event)"
      />
    </div>

    <!-- 空状态 -->
    <BotEmptyState 
      v-if="!loading && filteredBots.length === 0"
      @create-bot="$emit('create-bot')"
    />

    <!-- 分页 -->
    <BotPagination
      v-if="total > pageSize"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @page-change="$emit('page-change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import BotCard from '../BotCard.vue'
import BotEmptyState from './BotEmptyState.vue'
import BotPagination from './BotPagination.vue'

interface Props {
  loading: boolean
  filteredBots: any[]
  selectedBots: string[]
  currentPage: number
  pageSize: number
  total: number
}

defineProps<Props>()

defineEmits<{
  'select-bot': [bot: any]
  'toggle-status': [bot: any]
  edit: [bot: any]
  'configure-network': [bot: any]
  'dropdown-command': [command: string, bot: any]
  'open-notifications': [bot: any]
  'create-bot': []
  'page-change': [page: number]
}>()
</script>
