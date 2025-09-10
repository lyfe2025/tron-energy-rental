<template>
  <NotificationAnalytics :bot-id="botId" />
</template>

<script setup lang="ts">
import NotificationAnalytics from '../NotificationAnalytics/index.vue';

interface Props {
  botId: string
}

defineProps<Props>()
</script>