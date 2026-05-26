<template>
  <div class="order-management-container">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button type="info" link @click="$router.push('/events')">
              <el-icon><ArrowLeft /></el-icon> 返回赛事列表
            </el-button>
            <el-divider direction="vertical" />
            <span>{{ eventName }} - 出场顺序与秩序册</span>
          </div>
          <div class="header-right">
            <el-button type="success" @click="handleExportProgram">
              <el-icon><Download /></el-icon> 导出秩序册Excel
            </el-button>
          </div>
        </div>
      </template>

      <!-- 选择项目和分组 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <el-select
            v-model="selectedCategoryId"
            placeholder="选择项目"
            style="width: 200px"
            @change="handleCategoryChange"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
          <el-select
            v-model="selectedGroupId"
            placeholder="选择分组"
            style="width: 180px"
            :disabled="!selectedCategoryId"
            @change="loadOrders"
          >
            <el-option
              v-for="g in groups"
              :key="g.id"
              :label="g.name"
              :value="g.id"
            />
          </el-select>
          <el-button
            type="primary"
            :disabled="!selectedCategoryId || !selectedGroupId"
            :loading="generateLoading"
            @click="handleGenerate"
          >
            <el-icon><Sort /></el-icon> 自动编排出场顺序
          </el-button>
        </div>
        <div class="table-toolbar-right">
          <el-button type="warning" @click="handleViewProgram">
            <el-icon><Document /></el-icon> 查看完整秩序册
          </el-button>
        </div>
      </div>

      <!-- 出场顺序列表 -->
      <el-table
        v-if="selectedCategoryId && selectedGroupId"
        :data="orders"
        stripe
        v-loading="ordersLoading"
        style="width: 100%"
        empty-text="暂无出场顺序数据，请先自动编排"
      >
        <el-table-column prop="sequence" label="出场顺序" width="100" align="center" />
        <el-table-column prop="athleteName" label="运动员姓名" width="130" />
        <el-table-column prop="athleteGender" label="性别" width="70" align="center" />
        <el-table-column prop="orgName" label="所属单位" min-width="180" show-overflow-tooltip />
        <el-table-column prop="orgType" label="单位类型" width="100" align="center" />
      </el-table>

      <el-empty v-else description="请先选择项目和分组" />

      <!-- 分页 -->
      <div class="pagination-container" v-if="orders.length > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="orders.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 完整秩序册对话框 -->
    <el-dialog
      v-model="programDialogVisible"
      title="完整秩序册"
      width="85%"
      :close-on-click-modal="false"
      top="5vh"
    >
      <div v-loading="programLoading">
        <div v-if="programData.length === 0 && !programLoading" class="empty-program">
          <el-empty description="暂无秩序册数据，请先为各项目分组编排出场顺序" />
        </div>
        <div v-else>
          <div class="program-header">
            <h2>{{ eventName }} - 秩序册</h2>
          </div>
          <div v-for="(section, index) in programData" :key="index" class="program-section">
            <el-divider content-position="left">
              <span class="section-title">{{ section.categoryName }} ({{ section.categoryType }}) - {{ section.groupName }} ({{ section.groupCategoryType }})</span>
            </el-divider>
            <el-table :data="section.athletes" stripe border size="small">
              <el-table-column prop="sequence" label="出场顺序" width="90" align="center" />
              <el-table-column prop="athleteName" label="运动员" width="110" />
              <el-table-column prop="athleteGender" label="性别" width="60" align="center" />
              <el-table-column prop="birthDate" label="出生日期" width="110" />
              <el-table-column prop="idCard" label="身份证号" width="180" />
              <el-table-column prop="orgName" label="所属单位" min-width="160" show-overflow-tooltip />
              <el-table-column prop="orgType" label="单位类型" width="90" align="center" />
            </el-table>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="programDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
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
const generateLoading = ref(false)
const ordersLoading = ref(false)
const programLoading = ref(false)
const selectedCategoryId = ref(null)
const selectedGroupId = ref(null)
const currentPage = ref(1)
const pageSize = ref(20)

const categories = ref([])
const groups = ref([])
const orders = ref([])
const programData = ref([])
const programDialogVisible = ref(false)

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

function handleCategoryChange() {
  selectedGroupId.value = null
  orders.value = []
  if (selectedCategoryId.value) {
    loadOrders()
  }
}

async function loadOrders() {
  if (!selectedCategoryId.value || !selectedGroupId.value) return
  ordersLoading.value = true
  try {
    const res = await request.get('/orders', {
      params: {
        categoryId: selectedCategoryId.value,
        groupId: selectedGroupId.value
      }
    })
    orders.value = res.data || []
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    ordersLoading.value = false
  }
}

async function handleGenerate() {
  try {
    await ElMessageBox.confirm(
      '自动编排将清除当前项目和分组的出场顺序，并按报名时间重新排序。确定要继续吗？',
      '编排确认',
      {
        confirmButtonText: '确定编排',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    generateLoading.value = true
    const res = await request.post('/orders/generate', null, {
      params: {
        categoryId: selectedCategoryId.value,
        groupId: selectedGroupId.value
      }
    })
    ElMessage.success(res.message || '出场顺序编排成功')
    loadOrders()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已在拦截器中处理
    }
  } finally {
    generateLoading.value = false
  }
}

async function handleViewProgram() {
  programDialogVisible.value = true
  programLoading.value = true
  programData.value = []
  try {
    const res = await request.get('/orders/program', {
      params: { eventId: eventId.value }
    })
    programData.value = res.data?.program || []
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    programLoading.value = false
  }
}

async function handleExportProgram() {
  try {
    const res = await request.get('/orders/program/export', {
      params: { eventId: eventId.value },
      responseType: 'blob'
    })
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${eventName.value}_秩序册.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('秩序册导出成功')
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

onMounted(() => {
  loadEventName()
  loadCategories()
  loadGroups()
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

.program-header {
  text-align: center;
  margin-bottom: 20px;
}

.program-header h2 {
  font-size: 20px;
  color: #303133;
}

.program-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: #606266;
}

.empty-program {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
