<template>
  <div class="export-page">
    <el-page-header @back="$router.push(`/event/${eventId}`)" :title="'赛事详情'">
      <template #content>
        <span class="page-title">导出报名详情</span>
      </template>
    </el-page-header>

    <div class="export-content">
      <el-card shadow="never" class="export-card">
        <template #header>
          <div class="card-header">
            <span>导出设置</span>
          </div>
        </template>

        <el-form label-width="100px" size="large">
          <!-- 赛事信息 -->
          <el-form-item label="当前赛事">
            <el-tag type="primary" size="large">{{ eventName || '加载中...' }}</el-tag>
          </el-form-item>

          <!-- 导出范围 -->
          <el-form-item label="导出范围">
            <el-radio-group v-model="exportScope">
              <el-radio value="all">全部报名</el-radio>
              <el-radio value="category">按项目导出</el-radio>
              <el-radio value="group">按分组导出</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 按项目选择 -->
          <el-form-item label="选择项目" v-if="exportScope === 'category'">
            <el-select
              v-model="selectedCategory"
              placeholder="请选择项目"
              style="width: 300px"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>

          <!-- 按分组选择 -->
          <el-form-item label="选择分组" v-if="exportScope === 'group'">
            <el-cascader
              v-model="selectedGroup"
              :options="groupOptions"
              :props="{ value: 'id', label: 'name', children: 'groups' }"
              placeholder="请选择项目-分组"
              style="width: 300px"
              clearable
            />
          </el-form-item>

          <!-- 导出格式 -->
          <el-form-item label="导出格式">
            <el-radio-group v-model="exportFormat">
              <el-radio value="xlsx">Excel (.xlsx)</el-radio>
              <el-radio value="csv">CSV (.csv)</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 导出按钮 -->
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              @click="handleExport"
              :loading="exporting"
            >
              <el-icon><Download /></el-icon>
              导出报名详情
            </el-button>
            <el-button size="large" @click="handlePreview">
              <el-icon><View /></el-icon>
              预览数据
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 预览表格 -->
      <el-card v-if="showPreview" shadow="never" class="preview-card" style="margin-top: 20px">
        <template #header>
          <div class="card-header">
            <span>数据预览</span>
            <el-tag type="info" size="small">共 {{ previewData.length }} 条记录</el-tag>
          </div>
        </template>

        <el-table :data="previewData" border stripe style="width: 100%" max-height="500">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="organizationName" label="机构名称" min-width="140" />
          <el-table-column prop="categoryName" label="项目名称" min-width="120" />
          <el-table-column prop="groupName" label="分组" width="100" />
          <el-table-column prop="athleteName" label="运动员" width="100" />
          <el-table-column prop="athleteGender" label="性别" width="70">
            <template #default="{ row }">
              {{ row.athleteGender === 'male' ? '男' : '女' }}
            </template>
          </el-table-column>
          <el-table-column prop="athleteBirthDate" label="出生日期" width="120" />
          <el-table-column prop="athleteIdCard" label="身份证号" width="200" />
          <el-table-column prop="status" label="状态" width="80">
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
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const route = useRoute()
const eventId = computed(() => route.params.eventId)

const eventName = ref('')
const categories = ref([])
const exportScope = ref('all')
const selectedCategory = ref('')
const selectedGroup = ref([])
const exportFormat = ref('xlsx')
const exporting = ref(false)
const showPreview = ref(false)
const previewData = ref([])

const groupOptions = computed(() => {
  return categories.value.map(cat => ({
    id: cat.id,
    name: cat.name,
    groups: (cat.groups || []).map(g => ({
      id: g.id,
      name: g.name
    }))
  }))
})

onMounted(() => {
  loadEventData()
})

async function loadEventData() {
  try {
    const res = await request.get(`/events/${eventId.value}`)
    const data = res.data || res
    eventName.value = data.event ? data.event.name : data.name
    categories.value = data.categories || []
  } catch (err) {
    console.error('加载赛事数据失败:', err)
  }
}

async function loadPreviewData() {
  try {
    const params = { eventId: eventId.value }
    if (exportScope.value === 'category' && selectedCategory.value) {
      params.categoryId = selectedCategory.value
    }
    if (exportScope.value === 'group' && selectedGroup.value && selectedGroup.value.length === 2) {
      params.categoryId = selectedGroup.value[0]
      params.groupId = selectedGroup.value[1]
    }

    const res = await request.get('/registrations/export', { params })
    previewData.value = res.data || res || []
  } catch (err) {
    console.error('加载数据失败:', err)
  }
}

async function handlePreview() {
  showPreview.value = true
  await loadPreviewData()
}

async function handleExport() {
  if (exportScope.value === 'category' && !selectedCategory.value) {
    ElMessage.warning('请选择要导出的项目')
    return
  }
  if (exportScope.value === 'group' && (!selectedGroup.value || selectedGroup.value.length < 2)) {
    ElMessage.warning('请选择要导出的分组')
    return
  }

  exporting.value = true
  try {
    const params = {
      eventId: eventId.value,
      format: exportFormat.value
    }
    if (exportScope.value === 'category' && selectedCategory.value) {
      params.categoryId = selectedCategory.value
    }
    if (exportScope.value === 'group' && selectedGroup.value && selectedGroup.value.length === 2) {
      params.categoryId = selectedGroup.value[0]
      params.groupId = selectedGroup.value[1]
    }

    const response = await request.get('/registrations/export', {
      params,
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([response], {
      type: exportFormat.value === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${eventName.value || '报名详情'}.${exportFormat.value}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (err) {
    console.error('导出失败:', err)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    exporting.value = false
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
  const map = { pending: 'warning', confirmed: 'success', cancelled: 'info', rejected: 'danger' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { pending: '待确认', confirmed: '已确认', cancelled: '已取消', rejected: '已拒绝' }
  return map[status] || status
}
</script>

<style scoped>
.export-page {
  padding-bottom: 40px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.export-content {
  margin-top: 20px;
}

.export-card,
.preview-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .el-form-item :deep(.el-radio-group) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
