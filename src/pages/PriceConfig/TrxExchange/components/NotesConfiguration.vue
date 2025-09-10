<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📋 注意事项配置</h3>
    <div class="space-y-3">
      <div v-for="(note, index) in notes" :key="index" class="flex gap-2">
        <input
          v-model="notes[index]"
          type="text"
          :placeholder="`注意事项 ${index + 1}`"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="removeNote(index)"
          class="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
        >
          删除
        </button>
      </div>
      <button
        @click="addNote"
        class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
      >
        添加注意事项
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  notes: string[]
  addNote: () => void
  removeNote: (index: number) => void
}

defineProps<Props>()
</script>
