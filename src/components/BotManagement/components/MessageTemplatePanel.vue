<template>
  <MessageTemplate :bot-id="botId" />
</template>

<script setup lang="ts">
import MessageTemplate from '../MessageTemplate/index.vue';

interface Props {
  botId: string
}

defineProps<Props>()
</script>