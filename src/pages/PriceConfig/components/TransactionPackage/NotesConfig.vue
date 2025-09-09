<template>
  <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
    <h3 class="text-lg font-medium text-gray-900 mb-4">⚠️ 注意事项配置</h3>
    <div class="space-y-3">
      <div
        v-for="(note, index) in notes"
        :key="index"
        class="flex items-center space-x-2"
      >
        <input
          :value="note"
          @input="updateNote(index, ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="请输入注意事项"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="removeNote(index)"
          class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-shrink-0"
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
interface NotesConfigProps {
  notes: string[]
}

const props = defineProps<NotesConfigProps>()
const emit = defineEmits<{
  'update:notes': [notes: string[]]
}>()

const addNote = () => {
  const newNotes = [...props.notes, '']
  emit('update:notes', newNotes)
}

const removeNote = (index: number) => {
  const newNotes = [...props.notes]
  newNotes.splice(index, 1)
  emit('update:notes', newNotes)
}

const updateNote = (index: number, value: string) => {
  const newNotes = [...props.notes]
  newNotes[index] = value
  emit('update:notes', newNotes)
}
</script>
