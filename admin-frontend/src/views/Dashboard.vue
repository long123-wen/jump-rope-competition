<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">赛事总数</div>
              <div class="stat-value">{{ stats.totalEvents }}</div>
            </div>
            <el-icon :size="48" color="#409eff"><Flag /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">报名中赛事</div>
              <div class="stat-value">{{ stats.activeEvents }}</div>
            </div>
            <el-icon :size="48" color="#67c23a"><CircleCheck /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">报名总数</div>
              <div class="stat-value">{{ stats.totalRegistrations }}</div>
            </div>
            <el-icon :size="48" color="#e6a23c"><User /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">已确认报名</div>
              <div class="stat-value">{{ stats.confirmedRegistrations }}</div>
            </div>
            <el-icon :size="48" color="#f56c6c"><Select /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <span>最近赛事</span>
          <el-button type="primary" link @click="$router.push('/events')">
            查看全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>
      <el-table :data="recentEvents" stripe style="width: 100%">
        <el-table-column prop="name" label="赛事名称" min-width="180" />
        <el-table-column prop="startDate" label="开始日期" width="120" />
        <el-table-column prop="endDate" label="结束日期" width="120" />
        <el-table-column prop="location" label="地点" min-width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" class="status-tag">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '../utils/request'

const stats = reactive({
  totalEvents: 0,
  activeEvents: 0,
  totalRegistrations: 0,
  confirmedRegistrations: 0
})

const recentEvents = ref([])

function getStatusType(status) {
  const map = {
    '报名中': 'success',
    '已截止': 'info',
    '进行中': 'warning',
    '已结束': 'danger'
  }
  return map[status] || 'info'
}

async function loadStats() {
  try {
    const res = await request.get('/events')
    const events = res.data || []
    stats.totalEvents = events.length
    stats.activeEvents = events.filter(e => e.status === '报名中').length

    // 获取所有报名数据
    let totalReg = 0
    let confirmedReg = 0
    for (const event of events.slice(0, 20)) {
      try {
        const regRes = await request.get('/registrations', { params: { eventId: event.id } })
        const regs = regRes.data || []
        totalReg += regs.length
        confirmedReg += regs.filter(r => r.status === '已确认').length
      } catch (e) {
        // 忽略单个赛事的错误
      }
    }
    stats.totalRegistrations = totalReg
    stats.confirmedRegistrations = confirmedReg
    recentEvents.value = events.slice(0, 5)
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard-container {
  padding: 0;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-tag {
  font-weight: normal;
}
</style>
