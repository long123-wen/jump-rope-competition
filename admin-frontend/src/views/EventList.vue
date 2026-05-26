<template>
  <div class="event-list-container">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <span>赛事管理</span>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon> 新建赛事
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索赛事名称"
            clearable
            style="width: 200px"
            @clear="loadEvents"
            @keyup.enter="loadEvents"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="filterStatus" placeholder="筛选状态" clearable style="width: 140px" @change="loadEvents">
            <el-option label="报名中" value="报名中" />
            <el-option label="已截止" value="已截止" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已结束" value="已结束" />
          </el-select>
        </div>
      </div>

      <!-- 表格 -->
      <el-table :data="pagedEvents" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="赛事名称" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="goToCategories(row.id)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="开始日期" width="120" />
        <el-table-column prop="endDate" label="结束日期" width="120" />
        <el-table-column prop="location" label="地点" min-width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" class="status-tag">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goToCategories(row.id)">
              <el-icon><List /></el-icon> 项目
            </el-button>
            <el-button type="primary" link size="small" @click="goToGroups(row.id)">
              <el-icon><Grid /></el-icon> 分组
            </el-button>
            <el-button type="primary" link size="small" @click="goToRegistrations(row.id)">
              <el-icon><User /></el-icon> 报名
            </el-button>
            <el-button type="warning" link size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredEvents.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 新建/编辑赛事对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑赛事' : '新建赛事'"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="赛事名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入赛事名称" />
        </el-form-item>
        <el-form-item label="赛事描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入赛事描述"
          />
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            placeholder="选择开始日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker
            v-model="form.endDate"
            type="date"
            placeholder="选择结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="比赛地点" prop="location">
          <el-input v-model="form.location" placeholder="请输入比赛地点" />
        </el-form-item>
        <el-form-item label="赛事状态" prop="status">
          <el-select v-model="form.status" placeholder="选择状态" style="width: 100%">
            <el-option label="报名中" value="报名中" />
            <el-option label="已截止" value="已截止" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已结束" value="已结束" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '创建赛事' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const router = useRouter()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const searchKeyword = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const events = ref([])

const form = reactive({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  status: '报名中'
})

const formRules = {
  name: [{ required: true, message: '请输入赛事名称', trigger: 'blur' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  status: [{ required: true, message: '请选择赛事状态', trigger: 'change' }]
}

const filteredEvents = computed(() => {
  let list = events.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(e => e.name.toLowerCase().includes(kw))
  }
  if (filterStatus.value) {
    list = list.filter(e => e.status === filterStatus.value)
  }
  return list
})

const pagedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEvents.value.slice(start, start + pageSize.value)
})

function getStatusType(status) {
  const map = {
    '报名中': 'success',
    '已截止': 'info',
    '进行中': 'warning',
    '已结束': 'danger'
  }
  return map[status] || 'info'
}

async function loadEvents() {
  loading.value = true
  try {
    const res = await request.get('/events')
    events.value = res.data || []
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEdit.value = false
  editId.value = null
  dialogVisible.value = true
}

function openEditDialog(row) {
  isEdit.value = true
  editId.value = row.id
  form.name = row.name
  form.description = row.description || ''
  form.startDate = row.startDate
  form.endDate = row.endDate
  form.location = row.location || ''
  form.status = row.status
  dialogVisible.value = true
}

function resetForm() {
  form.name = ''
  form.description = ''
  form.startDate = ''
  form.endDate = ''
  form.location = ''
  form.status = '报名中'
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      if (isEdit.value) {
        await request.put(`/events/${editId.value}`, form)
        ElMessage.success('赛事更新成功')
      } else {
        await request.post('/events', form)
        ElMessage.success('赛事创建成功')
      }
      dialogVisible.value = false
      loadEvents()
    } catch (err) {
      // 错误已在拦截器中处理
    } finally {
      submitLoading.value = false
    }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除赛事"${row.name}"吗？删除后该赛事下的所有项目、分组和报名数据都将被删除，此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    await request.delete(`/events/${row.id}`)
    ElMessage.success('赛事删除成功')
    loadEvents()
  } catch (err) {
    // 用户取消或错误
  }
}

function goToCategories(eventId) {
  router.push(`/events/${eventId}/categories`)
}

function goToGroups(eventId) {
  router.push(`/events/${eventId}/groups`)
}

function goToRegistrations(eventId) {
  router.push(`/events/${eventId}/registrations`)
}

onMounted(() => {
  loadEvents()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-tag {
  font-weight: normal;
}
</style>
