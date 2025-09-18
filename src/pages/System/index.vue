<template>
  <div class="system-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">系统管理</h1>
      <p class="page-description">管理系统的组织架构、权限配置和操作日志</p>
    </div>

    <!-- 功能模块卡片 -->
    <div class="module-grid">
      <!-- 部门管理 -->
      <div class="module-card" @click="navigateTo('/system/departments')">
        <div class="module-icon">
          <Building2 :size="32" />
        </div>
        <div class="module-content">
          <h3>部门管理</h3>
          <p>管理组织架构和部门层级关系</p>
        </div>
        <ChevronRight :size="20" class="module-arrow" />
      </div>

      <!-- 岗位管理 -->
      <div class="module-card" @click="navigateTo('/system/positions')">
        <div class="module-icon">
          <Users :size="32" />
        </div>
        <div class="module-content">
          <h3>岗位管理</h3>
          <p>配置岗位信息和职责描述</p>
        </div>
        <ChevronRight :size="20" class="module-arrow" />
      </div>

      <!-- 角色管理 -->
      <div class="module-card" @click="navigateTo('/system/roles')">
        <div class="module-icon">
          <Shield :size="32" />
        </div>
        <div class="module-content">
          <h3>角色管理</h3>
          <p>配置系统角色和权限分配</p>
        </div>
        <ChevronRight :size="20" class="module-arrow" />
      </div>

      <!-- 菜单管理 -->
      <div class="module-card" @click="navigateTo('/system/menus')">
        <div class="module-icon">
          <Menu :size="32" />
        </div>
        <div class="module-content">
          <h3>菜单管理</h3>
          <p>管理系统菜单和权限资源</p>
        </div>
        <ChevronRight :size="20" class="module-arrow" />
      </div>

      <!-- 用户角色 -->
      <div class="module-card" @click="navigateTo('/system/user-roles')">
        <div class="module-icon">
          <UserCheck :size="32" />
        </div>
        <div class="module-content">
          <h3>用户角色</h3>
          <p>分配和管理用户的角色权限</p>
        </div>
        <ChevronRight :size="20" class="module-arrow" />
      </div>

      <!-- 操作日志 -->
      <div class="module-card" @click="navigateTo('/system/logs')">
        <div class="module-icon">
          <FileText :size="32" />
        </div>
        <div class="module-content">
          <h3>操作日志</h3>
          <p>查看系统操作和登录日志</p>
        </div>
        <ChevronRight :size="20" class="module-arrow" />
      </div>

    </div>

    <!-- 快速统计 -->
    <div class="stats-section">
      <h2>系统概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <Building2 :size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.departments }}</div>
            <div class="stat-label">部门数量</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <Users :size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.positions }}</div>
            <div class="stat-label">岗位数量</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <Shield :size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.roles }}</div>
            <div class="stat-label">角色数量</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <Menu :size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.menus }}</div>
            <div class="stat-label">菜单数量</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Building2,
  ChevronRight,
  FileText,
  Menu,
  Shield,
  UserCheck,
  Users
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 统计数据
const stats = ref({
  departments: 0,
  positions: 0,
  roles: 0,
  menus: 0
})

// 导航到指定页面
const navigateTo = (path: string) => {
  router.push(path)
}

// 加载统计数据
const loadStats = async () => {
  try {
    // TODO: 调用API获取统计数据
    stats.value = {
      departments: 8,
      positions: 15,
      roles: 5,
      menus: 12
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.system-management {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.module-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
}

.module-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.module-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.module-content {
  flex: 1;
}

.module-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.module-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.module-arrow {
  flex-shrink: 0;
  color: #9ca3af;
  transition: color 0.2s ease;
}

.module-card:hover .module-arrow {
  color: #3b82f6;
}

.stats-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.stats-section h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: #e0e7ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
</style>