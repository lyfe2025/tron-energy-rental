<template>
  <div class="maintenance-form">
    <el-card class="form-card">
      <template #header>
        <span class="text-gray-900 font-semibold flex items-center gap-2">
          <span class="text-xl">🔧</span>
          系统维护通知配置
        </span>
      </template>

      <el-form :model="form" label-width="120px">
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="维护类型" required>
              <el-select :value="form.maintenance_type" @change="updateForm('maintenance_type', $event)" placeholder="选择维护类型">
                <el-option label="计划维护" value="scheduled" />
                <el-option label="紧急维护" value="emergency" />
                <el-option label="功能升级" value="upgrade" />
                <el-option label="安全更新" value="security_update" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急程度" required>
              <el-select :value="urgency" @change="$emit('update:urgency', $event)" placeholder="选择紧急程度">
                <el-option label="📅 普通" value="low" />
                <el-option label="⚠️ 重要" value="medium" />
                <el-option label="🚨 紧急" value="high" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间" required>
              <el-date-picker
                :value="form.start_time"
                @change="updateForm('start_time', $event)"
                type="datetime"
                placeholder="选择维护开始时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预计时长">
              <el-input-number 
                :value="form.duration_hours"
                @change="updateForm('duration_hours', $event)"
                :min="0.5" :max="24" :step="0.5"
                controls-position="right"
                style="width: 100%"
              />
              <span class="ml-2 text-gray-400">小时</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="影响功能">
          <el-checkbox-group :value="form.affected_features" @change="updateForm('affected_features', $event)">
            <el-checkbox label="order_creation">下单功能</el-checkbox>
            <el-checkbox label="payment_processing">支付处理</el-checkbox>
            <el-checkbox label="energy_delegation">能量代理</el-checkbox>
            <el-checkbox label="agent_functions">代理功能</el-checkbox>
            <el-checkbox label="customer_service">客服支持</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="维护内容" required>
          <el-input 
            type="textarea" 
            :value="form.description"
            @input="updateForm('description', $event)"
            placeholder="详细描述本次维护的内容和目的"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="发送时机">
          <el-checkbox-group :value="form.send_schedule" @change="updateForm('send_schedule', $event)">
            <el-checkbox label="advance_24h">提前24小时通知</el-checkbox>
            <el-checkbox label="advance_1h">提前1小时提醒</el-checkbox>
            <el-checkbox label="start_notification">维护开始通知</el-checkbox>
            <el-checkbox label="completion_notification">维护完成通知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
interface MaintenanceForm {
  maintenance_type: string
  start_time: string
  duration_hours: number
  affected_features: string[]
  description: string
  send_schedule: string[]
}

interface Props {
  form: MaintenanceForm
  urgency: string
}

interface Emits {
  (e: 'update:form', value: MaintenanceForm): void
  (e: 'update:urgency', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Helper function to update form properties
const updateForm = (key: keyof MaintenanceForm, value: any) => {
  const updatedForm = { ...props.form, [key]: value }
  emit('update:form', updatedForm)
}
</script>

<style scoped>
.form-card {
  @apply bg-white border-gray-200 shadow-sm;
}

.form-card :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.form-card :deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
}

.form-card :deep(.el-input__inner),
.form-card :deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

.form-card :deep(.el-select) {
  @apply bg-white;
}

.form-card :deep(.el-checkbox__label) {
  @apply text-gray-700;
}

.form-card :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-blue-600 border-blue-600;
}

/* 按钮样式 */
:deep(.el-button) {
  @apply rounded-lg font-medium transition-all duration-200;
}

:deep(.el-button--primary) {
  @apply bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm hover:shadow-md;
}
</style>
