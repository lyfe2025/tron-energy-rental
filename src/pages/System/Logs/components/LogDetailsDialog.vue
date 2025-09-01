<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <FileText class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">操作日志详情</h3>
            <p class="text-sm text-gray-500">
              查看操作的详细信息和变更记录
            </p>
          </div>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 对话框内容 -->
      <div class="overflow-y-auto max-h-[calc(90vh-140px)]">
        <div v-if="log" class="p-6">
          <!-- 基本信息 -->
          <div class="mb-6">
            <h4 class="text-lg font-medium text-gray-900 mb-4">基本信息</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <User class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">操作用户</div>
                    <div class="text-sm text-gray-600">{{ log.username }} (ID: {{ log.user_id }})</div>
                  </div>
                </div>
                
                <div class="flex items-center gap-3">
                  <Activity class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">操作类型</div>
                    <div class="text-sm text-gray-600">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        :class="getActionBadgeClass(log.action)">
                        {{ getActionText(log.action) }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-3">
                  <Database class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">资源类型</div>
                    <div class="text-sm text-gray-600">{{ getResourceText(log.resource) }}</div>
                  </div>
                </div>
                
                <div v-if="log.resource_id" class="flex items-center gap-3">
                  <Hash class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">资源ID</div>
                    <div class="text-sm text-gray-600">{{ log.resource_id }}</div>
                  </div>
                </div>
              </div>
              
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <Globe class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">IP地址</div>
                    <div class="text-sm text-gray-600">{{ log.ip_address }}</div>
                  </div>
                </div>
                
                <div class="flex items-center gap-3">
                  <Monitor class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">用户代理</div>
                    <div class="text-sm text-gray-600 break-all">{{ log.user_agent }}</div>
                  </div>
                </div>
                
                <div class="flex items-center gap-3">
                  <Clock class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">操作时间</div>
                    <div class="text-sm text-gray-600">{{ formatDateTime(log.created_at) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作描述 -->
          <div v-if="log.description" class="mb-6">
            <h4 class="text-lg font-medium text-gray-900 mb-3">操作描述</h4>
            <div class="p-4 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-700">{{ log.description }}</p>
            </div>
          </div>

          <!-- 详细信息 -->
          <div v-if="log.details" class="mb-6">
            <h4 class="text-lg font-medium text-gray-900 mb-3">详细信息</h4>
            
            <!-- 变更前后对比 -->
            <div v-if="hasChanges" class="space-y-4">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- 变更前 -->
                <div v-if="log.details.before">
                  <h5 class="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Minus class="w-4 h-4 text-red-500" />
                    变更前
                  </h5>
                  <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                    <pre class="text-xs text-red-800 whitespace-pre-wrap overflow-x-auto">{{ formatJson(log.details.before) }}</pre>
                  </div>
                </div>
                
                <!-- 变更后 -->
                <div v-if="log.details.after">
                  <h5 class="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Plus class="w-4 h-4 text-green-500" />
                    变更后
                  </h5>
                  <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <pre class="text-xs text-green-800 whitespace-pre-wrap overflow-x-auto">{{ formatJson(log.details.after) }}</pre>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 其他详细信息 -->
            <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre class="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{{ formatJson(log.details) }}</pre>
            </div>
          </div>

          <!-- 相关信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 请求信息 -->
            <div v-if="log.details?.request">
              <h4 class="text-lg font-medium text-gray-900 mb-3">请求信息</h4>
              <div class="space-y-2">
                <div v-if="log.details.request.method" class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-500">请求方法:</span>
                  <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                    :class="getMethodBadgeClass(log.details.request.method)">
                    {{ log.details.request.method }}
                  </span>
                </div>
                <div v-if="log.details.request.url" class="flex items-start gap-2">
                  <span class="text-sm font-medium text-gray-500 mt-0.5">请求URL:</span>
                  <span class="text-sm text-gray-700 break-all">{{ log.details.request.url }}</span>
                </div>
                <div v-if="log.details.request.params" class="flex items-start gap-2">
                  <span class="text-sm font-medium text-gray-500 mt-0.5">请求参数:</span>
                  <pre class="text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-x-auto">{{ formatJson(log.details.request.params) }}</pre>
                </div>
              </div>
            </div>
            
            <!-- 响应信息 -->
            <div v-if="log.details?.response">
              <h4 class="text-lg font-medium text-gray-900 mb-3">响应信息</h4>
              <div class="space-y-2">
                <div v-if="log.details.response.status" class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-500">状态码:</span>
                  <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                    :class="getStatusBadgeClass(log.details.response.status)">
                    {{ log.details.response.status }}
                  </span>
                </div>
                <div v-if="log.details.response.message" class="flex items-start gap-2">
                  <span class="text-sm font-medium text-gray-500 mt-0.5">响应消息:</span>
                  <span class="text-sm text-gray-700">{{ log.details.response.message }}</span>
                </div>
                <div v-if="log.details.response.data" class="flex items-start gap-2">
                  <span class="text-sm font-medium text-gray-500 mt-0.5">响应数据:</span>
                  <pre class="text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-x-auto">{{ formatJson(log.details.response.data) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  X, 
  FileText, 
  User, 
  Activity, 
  Database, 
  Hash, 
  Globe, 
  Monitor, 
  Clock,
  Minus,
  Plus
} from 'lucide-vue-next'
import type { OperationLog } from '../types'

interface Props {
  visible: boolean
  log?: OperationLog | null
}

interface Emits {
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const hasChanges = computed(() => {
  return props.log?.details && 
    (props.log.details.before || props.log.details.after)
})

// 方法
const handleClose = () => {
  emit('close')
}

const getActionText = (action: string): string => {
  const actionMap: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    login: '登录',
    logout: '登出'
  }
  return actionMap[action] || action
}

const getResourceText = (resource: string): string => {
  const resourceMap: Record<string, string> = {
    user: '用户',
    role: '角色',
    department: '部门',
    position: '岗位',
    menu: '菜单'
  }
  return resourceMap[resource] || resource
}

const getActionBadgeClass = (action: string): string => {
  const classMap: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    login: 'bg-purple-100 text-purple-800',
    logout: 'bg-gray-100 text-gray-800'
  }
  return classMap[action] || 'bg-gray-100 text-gray-800'
}

const getMethodBadgeClass = (method: string): string => {
  const classMap: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
    PATCH: 'bg-purple-100 text-purple-800'
  }
  return classMap[method] || 'bg-gray-100 text-gray-800'
}

const getStatusBadgeClass = (status: number): string => {
  if (status >= 200 && status < 300) {
    return 'bg-green-100 text-green-800'
  } else if (status >= 300 && status < 400) {
    return 'bg-yellow-100 text-yellow-800'
  } else if (status >= 400 && status < 500) {
    return 'bg-orange-100 text-orange-800'
  } else if (status >= 500) {
    return 'bg-red-100 text-red-800'
  }
  return 'bg-gray-100 text-gray-800'
}

const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

const formatJson = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>