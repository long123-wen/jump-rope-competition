<template>
  <div class="event-detail-page">
    <el-page-header @back="$router.push('/')" title="返回首页">
      <template #content>
        <span class="page-title">赛事详情</span>
      </template>
    </el-page-header>

    <div v-loading="loading" class="detail-content">
      <!-- 赛事基本信息 -->
      <el-card class="event-info-card" shadow="never" v-if="event">
        <div class="event-title-row">
          <h1>{{ event.name }}</h1>
          <el-tag :type="getStatusType(event.status)" size="large">
            {{ getStatusText(event.status) }}
          </el-tag>
        </div>

        <p class="event-description">{{ event.description || '暂无描述' }}</p>

        <el-descriptions :column="isMobile ? 1 : 3" border style="margin-top: 20px">
          <el-descriptions-item label="开始时间">
            <el-icon><Calendar /></el-icon>
            {{ formatDate(event.startDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="结束时间">
            <el-icon><Calendar /></el-icon>
            {{ formatDate(event.endDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="比赛地点">
            <el-icon><Location /></el-icon>
            {{ event.location || '待定' }}
          </el-descriptions-item>
          <el-descriptions-item label="报名截止">
            <el-icon><Clock /></el-icon>
            {{ event.registrationDeadline ? formatDate(event.registrationDeadline) : '无限制' }}
          </el-descriptions-item>
          <el-descriptions-item label="主办单位" v-if="event.organizer">
            {{ event.organizer }}
          </el-descriptions-item>
          <el-descriptions-item label="联系方式" v-if="event.contact">
            {{ event.contact }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="action-bar">
          <el-button
            type="success"
            size="large"
            @click="goToRegister"
            :disabled="event.status !== 'open'"
          >
            <el-icon><EditPen /></el-icon>
            {{ event.status === 'open' ? '立即报名' : '报名已关闭' }}
          </el-button>
          <el-button
            type="primary"
            size="large"
            @click="$router.push(`/event/${eventId}/my-registrations`)"
            v-if="authStore.isLoggedIn"
          >
            <el-icon><List /></el-icon>
            我的报名
          </el-button>
          <el-button
            size="large"
            @click="$router.push(`/event/${eventId}/export`)"
            v-if="authStore.isLoggedIn"
          >
            <el-icon><Download /></el-icon>
            导出报名
          </el-button>
        </div>
      </el-card>

      <!-- 项目列表 -->
      <el-card class="events-card" shadow="never" v-if="event">
        <template #header>
          <div class="card-header">
            <el-icon><Grid /></el-icon>
            <span>比赛项目</span>
            <el-tag type="info" size="small" style="margin-left: 8px">
              共 {{ categories.length }} 个项目
            </el-tag>
          </div>
        </template>

        <el-empty v-if="categories.length === 0" description="暂无比赛项目" />

        <div class="categories-list">
          <el-card
            v-for="cat in categories"
            :key="cat.id"
            class="category-card"
            shadow="hover"
          >
            <div class="category-header">
              <h3>{{ cat.name }}</h3>
              <el-tag size="small" type="primary">{{ cat.type || '个人赛' }}</el-tag>
            </div>

            <p class="category-desc" v-if="cat.description">{{ cat.description }}</p>

            <!-- 分组列表 -->
            <div class="groups-section" v-if="cat.groups && cat.groups.length > 0">
              <h4>可报名分组</h4>
              <el-table :data="cat.groups" border size="small" style="width: 100%">
                <el-table-column prop="name" label="分组名称" />
                <el-table-column prop="gender" label="性别" width="80">
                  <template #default="{ row }">
                    {{ row.gender === 'male' ? '男' : row.gender === 'female' ? '女' : '不限' }}
                  </template>
                </el-table-column>
                <el-table-column prop="ageMin" label="最小年龄" width="90" />
                <el-table-column prop="ageMax" label="最大年龄" width="90" />
                <el-table-column label="名额" width="100">
                  <template #default="{ row }">
                    <span :class="{ 'full': row.remainingQuota <= 0 }">
                      {{ row.remainingQuota !== undefined ? `${row.remainingQuota}/${row.maxQuota}` : '不限' }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-card>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import request from '../utils/request'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const event = ref(null)
const categories = ref([])

const eventId = computed(() => route.params.eventId)
const isMobile = ref(window.innerWidth < 768)

onMounted(() => {
  loadEventDetail()
})

async function loadEventDetail() {
  loading.value = true
  try {
    const res = await request.get(`/events/${eventId.value}`)
    const data = res.data || res
    event.value = data.event || data
    categories.value = data.categories || []
  } catch (err) {
    console.error('加载赛事详情失败:', err)
  } finally {
    loading.value = false
  }
}

function goToRegister() {
  if (!authStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: `/event/${eventId.value}/register` } })
    return
  }
  router.push(`/event/${eventId.value}/register`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function getStatusType(status) {
  const map = { open: 'success', closed: 'danger', upcoming: 'warning', ongoing: 'primary', ended: 'info' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { open: '报名中', closed: '已关闭', upcoming: '即将开始', ongoing: '进行中', ended: '已结束' }
  return map[status] || status
}
</script>

<style scoped>
.event-detail-page {
  padding-bottom: 40px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.detail-content {
  margin-top: 20px;
}

.event-info-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.event-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.event-title-row h1 {
  font-size: 26px;
  color: #303133;
}

.event-description {
  color: #606266;
  font-size: 15px;
  line-height: 1.8;
}

.action-bar {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.events-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.categories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.category-card {
  border-radius: 8px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-header h3 {
  font-size: 16px;
  color: #303133;
}

.category-desc {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}

.groups-section h4 {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.full {
  color: #f56c6c;
  font-weight: 600;
}

@media (max-width: 768px) {
  .categories-list {
    grid-template-columns: 1fr;
  }

  .event-title-row h1 {
    font-size: 20px;
  }

  .action-bar {
    flex-direction: column;
  }

  .action-bar .el-button {
    width: 100%;
  }
}
</style>
