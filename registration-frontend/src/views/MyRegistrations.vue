<template>
  <div class="my-registrations-page">
    <el-page-header @back="$router.push(`/event/${eventId}`)" :title="'赛事详情'">
      <template #content>
        <span class="page-title">我的报名记录</span>
      </template>
    </el-page-header>

    <div class="registrations-content">
      <el-card shadow="never" class="main-card">
        <template #header>
          <div class="card-header">
            <span>报名列表</span>
            <div class="header-actions">
              <el-button type="primary" @click="$router.push(`/event/${eventId}/register`)">
                <el-icon><Plus /></el-icon> 继续报名
              </el-button>
              <el-button @click="$router.push(`/event/${eventId}/export`)">
                <el-icon><Download /></el-icon> 导出报名
              </el-button>
            </div>
          </div>
        </template>

        <div v-loading="loading">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <el-select
              v-model="filterStatus"
              placeholder="筛选状态"
              clearable
              style="width: 150px"
              @change="loadRegistrations"
            >
              <el-option label="全部" value="" />
              <el-option label="待确认" value="pending" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已取消" value="cancelled" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>

            <el-select
              v-model="filterCategory"
              placeholder="筛选项目"
              clearable
              style="width: 180px"
              @change="loadRegistrations"
            >
              <el-option label="全部项目" value="" />
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </div>

          <el-empty v-if="!loading && registrations.length === 0" description="暂无报名记录" />

          <el-table
            v-if="registrations.length > 0"
            :data="registrations"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="categoryName" label="项目名称" min-width="140" />
            <el-table-column prop="groupName" label="分组" width="120" />
            <el-table-column prop="athleteName" label="运动员" width="100" />
            <el-table-column prop="athleteGender" label="性别" width="70">
              <template #default="{ row }">
                {{ row.athleteGender === 'male' ? '男' : '女' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="报名时间" width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'pending'"
                  type="danger"
                  text
                  size="small"
                  @click="cancelRegistration(row)"
                >
                  取消
                </el-button>
                <span v-else class="text-muted">--</span>
              </template>
            </el-table-column>
          </el-table>

          <!-- 统计信息 -->
          <div class="summary-bar" v-if="registrations.length > 0">
            <span>共 <strong>{{ registrations.length }}</strong> 条报名记录</span>
            <span style="margin-left: 20px">
              待确认: <strong>{{ pendingCount }}</strong>
            </span>
            <span style="margin-left: 20px">
              已确认: <strong>{{ confirmedCount }}</strong>
            </span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const route = useRoute()
const eventId = computed(() => route.params.eventId)
const loading = ref(false)
const registrations = ref([])
const categories = ref([])
const filterStatus = ref('')
const filterCategory = ref('')

const pendingCount = computed(() =>
  registrations.value.filter(r => r.status === 'pending').length
)

const confirmedCount = computed(() =>
  registrations.value.filter(r => r.status === 'confirmed').length
)

onMounted(() => {
  loadRegistrations()
  loadCategories()
})

async function loadCategories() {
  try {
    const res = await request.get(`/events/${eventId.value}`)
    const data = res.data || res
    categories.value = data.categories || []
  } catch (err) {
    console.error('加载项目列表失败:', err)
  }
}

async function loadRegistrations() {
  loading.value = true
  try {
    const params = { eventId: eventId.value }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterCategory.value) params.categoryId = filterCategory.value

    const res = await request.get('/registrations/my', { params })
    registrations.value = res.data || res || []
  } catch (err) {
    console.error('加载报名记录失败:', err)
  } finally {
    loading.value = false
  }
}

async function cancelRegistration(row) {
  try {
    await ElMessageBox.confirm(
      `确定要取消 ${row.athleteName} 在 ${row.categoryName} 的报名吗？`,
      '取消报名',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '再想想',
        type: 'warning'
      }
    )

    await request.put(`/registrations/${row.id}/cancel`)
    ElMessage.success('报名已取消')
    loadRegistrations()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('取消报名失败:', err)
    }
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusType(status) {
  const map = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'info',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    pending: '待确认',
    confirmed: '已确认',
    cancelled: '已取消',
    rejected: '已拒绝'
  }
  return map[status] || status
}
</script>

<style scoped>
.my-registrations-page {
  padding-bottom: 40px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.registrations-content {
  margin-top: 20px;
}

.main-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.summary-bar {
  margin-top: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #606266;
  font-size: 14px;
}

.text-muted {
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-bar .el-select {
    width: 100% !important;
  }
}
</style>
