<template>
  <div class="home-page">
    <!-- 顶部横幅 -->
    <div class="banner">
      <div class="banner-content">
        <el-icon :size="48" color="#fff"><Trophy /></el-icon>
        <h1>跳绳赛事在线报名系统</h1>
        <p>便捷、高效的赛事报名管理平台</p>
      </div>
    </div>

    <!-- 赛事列表 -->
    <div class="events-section">
      <div class="section-header">
        <h2><el-icon><List /></el-icon> 赛事列表</h2>
        <el-input
          v-model="searchText"
          placeholder="搜索赛事名称..."
          prefix-icon="Search"
          clearable
          style="width: 250px"
        />
      </div>

      <el-skeleton :loading="loading" :count="3" animated v-if="loading">
        <template #template>
          <el-skeleton-item variant="rect" style="height: 180px; margin-bottom: 20px; border-radius: 8px;" />
        </template>
      </el-skeleton>

      <el-empty v-if="!loading && filteredEvents.length === 0" description="暂无赛事信息" />

      <div class="events-grid" v-if="!loading">
        <el-card
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-card"
          shadow="hover"
        >
          <div class="event-card-header">
            <h3>{{ event.name }}</h3>
            <el-tag :type="getStatusType(event.status)" size="small">
              {{ getStatusText(event.status) }}
            </el-tag>
          </div>

          <p class="event-desc">{{ event.description || '暂无描述' }}</p>

          <div class="event-info">
            <div class="info-item">
              <el-icon><Calendar /></el-icon>
              <span>{{ formatDate(event.startDate) }} ~ {{ formatDate(event.endDate) }}</span>
            </div>
            <div class="info-item">
              <el-icon><Location /></el-icon>
              <span>{{ event.location || '待定' }}</span>
            </div>
            <div class="info-item" v-if="event.registrationDeadline">
              <el-icon><Clock /></el-icon>
              <span>报名截止：{{ formatDate(event.registrationDeadline) }}</span>
            </div>
          </div>

          <div class="event-actions">
            <el-button type="primary" @click="goToDetail(event.id)">
              <el-icon><View /></el-icon> 查看详情
            </el-button>
            <el-button
              type="success"
              @click="goToRegister(event)"
              :disabled="event.status !== 'open'"
            >
              <el-icon><EditPen /></el-icon>
              {{ event.status === 'open' ? '立即报名' : '报名已关闭' }}
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import request from '../utils/request'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const events = ref([])
const searchText = ref('')

const filteredEvents = computed(() => {
  if (!searchText.value) return events.value
  const keyword = searchText.value.toLowerCase()
  return events.value.filter(e => e.name.toLowerCase().includes(keyword))
})

onMounted(() => {
  fetchEvents()
})

async function fetchEvents() {
  loading.value = true
  try {
    const res = await request.get('/events/public')
    events.value = res.data || res || []
  } catch (err) {
    console.error('获取赛事列表失败:', err)
  } finally {
    loading.value = false
  }
}

function goToDetail(eventId) {
  router.push(`/event/${eventId}`)
}

function goToRegister(event) {
  if (!authStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: `/event/${event.id}/register` } })
    return
  }
  router.push(`/event/${event.id}/register`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function getStatusType(status) {
  const map = {
    open: 'success',
    closed: 'danger',
    upcoming: 'warning',
    ongoing: 'primary',
    ended: 'info'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    open: '报名中',
    closed: '已关闭',
    upcoming: '即将开始',
    ongoing: '进行中',
    ended: '已结束'
  }
  return map[status] || status
}
</script>

<style scoped>
.home-page {
  padding-bottom: 20px;
}

.banner {
  background: linear-gradient(135deg, #409EFF 0%, #1a5bc4 100%);
  border-radius: 12px;
  padding: 60px 40px;
  text-align: center;
  margin-bottom: 30px;
  color: #fff;
}

.banner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.banner h1 {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 2px;
}

.banner p {
  font-size: 16px;
  opacity: 0.9;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  color: #303133;
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.event-card {
  border-radius: 8px;
  transition: transform 0.2s;
}

.event-card:hover {
  transform: translateY(-4px);
}

.event-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.event-card-header h3 {
  font-size: 18px;
  color: #303133;
  flex: 1;
  margin-right: 12px;
}

.event-desc {
  color: #606266;
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 14px;
}

.event-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .banner {
    padding: 40px 20px;
  }

  .banner h1 {
    font-size: 24px;
  }

  .events-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .section-header .el-input {
    width: 100%;
  }
}
</style>
