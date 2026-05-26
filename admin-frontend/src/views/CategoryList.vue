<template>
  <div class="category-list-container">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button type="info" link @click="$router.push('/events')">
              <el-icon><ArrowLeft /></el-icon> 返回赛事列表
            </el-button>
            <el-divider direction="vertical" />
            <span>{{ eventName }} - 项目管理</span>
          </div>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon> 新建项目
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索项目名称"
            clearable
            style="width: 200px"
            @clear="loadCategories"
            @keyup.enter="loadCategories"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="filterType" placeholder="筛选类型" clearable style="width: 140px" @change="loadCategories">
            <el-option label="速度赛" value="速度赛" />
            <el-option label="花样赛" value="花样赛" />
            <el-option label="耐力赛" value="耐力赛" />
            <el-option label="团体赛" value="团体赛" />
            <el-option label="接力赛" value="接力赛" />
          </el-select>
        </div>
      </div>

      <!-- 表格 -->
      <el-table :data="pagedCategories" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="项目名称" min-width="180" />
        <el-table-column prop="type" label="项目类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getCategoryTypeTag(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fee" label="报名费(元)" width="110" align="center">
          <template #default="{ row }">
            <span>{{ row.fee > 0 ? row.fee : '免费' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
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
          :total="filteredCategories.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 新建/编辑项目对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑项目' : '新建项目'"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目类型" prop="type">
          <el-select v-model="form.type" placeholder="选择项目类型" style="width: 100%">
            <el-option label="速度赛" value="速度赛" />
            <el-option label="花样赛" value="花样赛" />
            <el-option label="耐力赛" value="耐力赛" />
            <el-option label="团体赛" value="团体赛" />
            <el-option label="接力赛" value="接力赛" />
          </el-select>
        </el-form-item>
        <el-form-item label="报名费" prop="fee">
          <el-input-number
            v-model="form.fee"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '创建项目' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const route = useRoute()
const eventId = computed(() => route.params.eventId)
const eventName = ref('')
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const searchKeyword = ref('')
const filterType = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const categories = ref([])

const form = reactive({
  name: '',
  type: '',
  fee: 0,
  description: ''
})

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择项目类型', trigger: 'change' }]
}

const filteredCategories = computed(() => {
  let list = categories.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(c => c.name.toLowerCase().includes(kw))
  }
  if (filterType.value) {
    list = list.filter(c => c.type === filterType.value)
  }
  return list
})

const pagedCategories = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCategories.value.slice(start, start + pageSize.value)
})

function getCategoryTypeTag(type) {
  const map = {
    '速度赛': 'danger',
    '花样赛': 'warning',
    '耐力赛': 'success',
    '团体赛': 'primary',
    '接力赛': 'info'
  }
  return map[type] || 'info'
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
  loading.value = true
  try {
    const res = await request.get('/categories', { params: { eventId: eventId.value } })
    categories.value = res.data || []
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
  form.type = row.type
  form.fee = row.fee
  form.description = row.description || ''
  dialogVisible.value = true
}

function resetForm() {
  form.name = ''
  form.type = ''
  form.fee = 0
  form.description = ''
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
      const payload = { ...form, eventId: Number(eventId.value) }
      if (isEdit.value) {
        await request.put(`/categories/${editId.value}`, payload)
        ElMessage.success('项目更新成功')
      } else {
        await request.post('/categories', payload)
        ElMessage.success('项目创建成功')
      }
      dialogVisible.value = false
      loadCategories()
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
      `确定要删除项目"${row.name}"吗？删除后该项目的报名数据也将被删除。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    await request.delete(`/categories/${row.id}`)
    ElMessage.success('项目删除成功')
    loadCategories()
  } catch (err) {
    // 用户取消或错误
  }
}

onMounted(() => {
  loadEventName()
  loadCategories()
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
</style>
