<template>
  <NotificationSettings :bot-id="botId" />
</template>

<script setup lang="ts">
import NotificationSettings from '../NotificationSettings/index.vue';

interface Props {
  botId: string
}

defineProps<Props>()
</script>