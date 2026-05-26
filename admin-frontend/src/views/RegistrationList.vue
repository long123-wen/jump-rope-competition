<template>
  <div class="registration-list-container">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button type="info" link @click="$router.push('/events')">
              <el-icon><ArrowLeft /></el-icon> 返回赛事列表
            </el-button>
            <el-divider direction="vertical" />
            <span>{{ eventName }} - 报名管理</span>
          </div>
          <div class="header-right">
            <el-button type="success" @click="handleExport">
              <el-icon><Download /></el-icon> 导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <el-select
            v-model="filterCategoryId"
            placeholder="筛选项目"
            clearable
            style="width: 180px"
            @change="loadRegistrations"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
          <el-select
            v-model="filterGroupId"
            placeholder="筛选分组"
            clearable
            style="width: 160px"
            @change="loadRegistrations"
          >
            <el-option
              v-for="g in groups"
              :key="g.id"
              :label="g.name"
              :value="g.id"
            />
          </el-select>
          <el-select
            v-model="filterStatus"
            placeholder="筛选状态"
            clearable
            style="width: 140px"
            @change="loadRegistrations"
          >
            <el-option label="待确认" value="待确认" />
            <el-option label="已确认" value="已确认" />
            <el-option label="已退赛" value="已退赛" />
          </el-select>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索运动员/单位"
            clearable
            style="width: 200px"
            @clear="loadRegistrations"
            @keyup.enter="loadRegistrations"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-bar">
        <el-tag type="info">总报名: {{ filteredRegistrations.length }}</el-tag>
        <el-tag type="warning">待确认: {{ pendingCount }}</el-tag>
        <el-tag type="success">已确认: {{ confirmedCount }}</el-tag>
        <el-tag type="danger">已退赛: {{ withdrawnCount }}</el-tag>
      </div>

      <!-- 表格 -->
      <el-table :data="pagedRegistrations" stripe v-loading="loading" style="width: 100%" :default-sort="{ prop: 'createdAt', order: 'descending' }">
        <el-table-column prop="athleteName" label="运动员" width="100" />
        <el-table-column prop="athleteGender" label="性别" width="60" align="center" />
        <el-table-column prop="orgName" label="所属单位" min-width="150" show-overflow-tooltip />
        <el-table-column prop="orgType" label="单位类型" width="90" align="center" />
        <el-table-column prop="userName" label="报名人" width="90" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="categoryName" label="项目" width="120" />
        <el-table-column prop="groupName" label="分组" width="100" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="报名时间" width="170" sortable />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === '待确认'"
              type="success"
              link
              size="small"
              @click="handleConfirm(row)"
            >
              <el-icon><CircleCheck /></el-icon> 确认
            </el-button>
            <el-button
              v-if="row.status !== '已退赛'"
              type="danger"
              link
              size="small"
              @click="handleWithdraw(row)"
            >
              <el-icon><CircleClose /></el-icon> 退赛
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredRegistrations.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const route = useRoute()
const eventId = computed(() => route.params.eventId)
const eventName = ref('')
const loading = ref(false)
const searchKeyword = ref('')
const filterCategoryId = ref(null)
const filterGroupId = ref(null)
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

const registrations = ref([])
const categories = ref([])
const groups = ref([])

const filteredRegistrations = computed(() => {
  let list = registrations.value
  if (filterCategoryId.value) {
    list = list.filter(r => r.categoryId === filterCategoryId.value)
  }
  if (filterGroupId.value) {
    list = list.filter(r => r.groupId === filterGroupId.value)
  }
  if (filterStatus.value) {
    list = list.filter(r => r.status === filterStatus.value)
  }
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(r =>
      (r.athleteName && r.athleteName.toLowerCase().includes(kw)) ||
      (r.orgName && r.orgName.toLowerCase().includes(kw))
    )
  }
  return list
})

const pagedRegistrations = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRegistrations.value.slice(start, start + pageSize.value)
})

const pendingCount = computed(() => filteredRegistrations.value.filter(r => r.status === '待确认').length)
const confirmedCount = computed(() => filteredRegistrations.value.filter(r => r.status === '已确认').length)
const withdrawnCount = computed(() => filteredRegistrations.value.filter(r => r.status === '已退赛').length)

function getStatusType(status) {
  const map = {
    '待确认': 'warning',
    '已确认': 'success',
    '已退赛': 'danger'
  }
  return map[status] || 'info'
}

async function loadEventName() {
  try {
    const res = await request.get('/events')
    const event = (res.data || []).find(e => e.id === Number(eventId.value))
    if (event) {
      eventName.value = event.name
    }
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

async function loadCategories() {
  try {
    const res = await request.get('/categories', { params: { eventId: eventId.value } })
    categories.value = res.data || []
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

async function loadGroups() {
  try {
    const res = await request.get('/groups', { params: { eventId: eventId.value } })
    groups.value = res.data || []
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

async function loadRegistrations() {
  loading.value = true
  try {
    const res = await request.get('/registrations', { params: { eventId: eventId.value } })
    registrations.value = res.data || []
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

async function handleConfirm(row) {
  try {
    await ElMessageBox.confirm(
      `确定要确认运动员"${row.athleteName}"的报名吗？`,
      '确认报名',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    await request.put(`/registrations/${row.id}/status`, { status: '已确认' })
    ElMessage.success('报名已确认')
    loadRegistrations()
  } catch (err) {
    // 用户取消或错误
  }
}

async function handleWithdraw(row) {
  try {
    await ElMessageBox.confirm(
      `确定要将运动员"${row.athleteName}"标记为退赛吗？`,
      '退赛确认',
      {
        confirmButtonText: '确定退赛',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    await request.put(`/registrations/${row.id}/status`, { status: '已退赛' })
    ElMessage.success('已标记为退赛')
    loadRegistrations()
  } catch (err) {
    // 用户取消或错误
  }
}

async function handleExport() {
  try {
    const res = await request.get('/registrations/export', {
      params: { eventId: eventId.value },
      responseType: 'blob'
    })
    // 创建下载链接
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${eventName.value}_报名详情.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('导出成功')
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

onMounted(() => {
  loadEventName()
  loadCategories()
  loadGroups()
  loadRegistrations()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
}

.header-right {
  display: flex;
  gap: 8px;
}

.stats-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
