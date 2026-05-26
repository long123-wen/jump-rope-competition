<template>
  <div class="group-list-container">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button type="info" link @click="$router.push('/events')">
              <el-icon><ArrowLeft /></el-icon> 返回赛事列表
            </el-button>
            <el-divider direction="vertical" />
            <span>{{ eventName }} - 分组管理</span>
          </div>
          <div class="header-right">
            <el-button type="success" @click="openLimitDialog">
              <el-icon><Setting /></el-icon> 设置限报数量
            </el-button>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon> 新建分组
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索分组名称"
            clearable
            style="width: 200px"
            @clear="loadGroups"
            @keyup.enter="loadGroups"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="filterType" placeholder="筛选类型" clearable style="width: 140px" @change="loadGroups">
            <el-option label="性别分组" value="性别分组" />
            <el-option label="类型分组" value="类型分组" />
          </el-select>
        </div>
      </div>

      <!-- 表格 -->
      <el-table :data="pagedGroups" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="分组名称" min-width="180" />
        <el-table-column prop="categoryType" label="分组类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.categoryType === '性别分组' ? 'primary' : 'warning'">
              {{ row.categoryType }}
            </el-tag>
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
          :total="filteredGroups.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 新建/编辑分组对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分组' : '新建分组'"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="分组类型" prop="categoryType">
          <el-select v-model="form.categoryType" placeholder="选择分组类型" style="width: 100%">
            <el-option label="性别分组" value="性别分组" />
            <el-option label="类型分组" value="类型分组" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="分组描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分组描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '创建分组' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 设置限报数量对话框 -->
    <el-dialog
      v-model="limitDialogVisible"
      title="设置限报数量"
      width="680px"
      :close-on-click-modal="false"
      @closed="resetLimitForm"
    >
      <div class="limit-form-header">
        <el-form :inline="true" style="margin-bottom: 16px">
          <el-form-item label="选择项目">
            <el-select v-model="limitCategoryId" placeholder="请选择项目" style="width: 200px" @change="loadGroupLimits">
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="limitList" stripe v-loading="limitLoading" style="width: 100%" v-if="limitCategoryId">
        <el-table-column prop="groupName" label="分组名称" min-width="150" />
        <el-table-column prop="groupCategoryType" label="分组类型" width="120" />
        <el-table-column label="限报人数" width="150">
          <template #default="{ row }">
            <el-input-number
              v-model="row.maxParticipants"
              :min="0"
              :max="9999"
              size="small"
              controls-position="right"
            />
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="limitCategoryId && limitList.length === 0 && !limitLoading" description="暂无分组数据" />

      <template #footer>
        <el-button @click="limitDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="limitSubmitLoading" @click="handleSaveLimits" :disabled="!limitCategoryId">
          保存设置
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

const groups = ref([])
const categories = ref([])

const form = reactive({
  categoryType: '',
  name: '',
  description: ''
})

const formRules = {
  categoryType: [{ required: true, message: '请选择分组类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入分组名称', trigger: 'blur' }]
}

// 限报数量相关
const limitDialogVisible = ref(false)
const limitCategoryId = ref(null)
const limitList = ref([])
const limitLoading = ref(false)
const limitSubmitLoading = ref(false)

const filteredGroups = computed(() => {
  let list = groups.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(g => g.name.toLowerCase().includes(kw))
  }
  if (filterType.value) {
    list = list.filter(g => g.categoryType === filterType.value)
  }
  return list
})

const pagedGroups = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredGroups.value.slice(start, start + pageSize.value)
})

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

async function loadGroups() {
  loading.value = true
  try {
    const res = await request.get('/groups', { params: { eventId: eventId.value } })
    groups.value = res.data || []
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
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

function openCreateDialog() {
  isEdit.value = false
  editId.value = null
  dialogVisible.value = true
}

function openEditDialog(row) {
  isEdit.value = true
  editId.value = row.id
  form.categoryType = row.categoryType
  form.name = row.name
  form.description = row.description || ''
  dialogVisible.value = true
}

function resetForm() {
  form.categoryType = ''
  form.name = ''
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
        await request.put(`/groups/${editId.value}`, payload)
        ElMessage.success('分组更新成功')
      } else {
        await request.post('/groups', payload)
        ElMessage.success('分组创建成功')
      }
      dialogVisible.value = false
      loadGroups()
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
      `确定要删除分组"${row.name}"吗？删除后相关报名数据也将被删除。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    await request.delete(`/groups/${row.id}`)
    ElMessage.success('分组删除成功')
    loadGroups()
  } catch (err) {
    // 用户取消或错误
  }
}

// 限报数量相关方法
function openLimitDialog() {
  limitDialogVisible.value = true
  loadCategories()
}

async function loadGroupLimits() {
  if (!limitCategoryId.value) return
  limitLoading.value = true
  try {
    const res = await request.get('/groups/limits', { params: { categoryId: limitCategoryId.value } })
    const limits = res.data || []
    // 如果没有限报数据，则用所有分组初始化
    if (limits.length === 0) {
      limitList.value = groups.value.map(g => ({
        groupId: g.id,
        groupName: g.name,
        groupCategoryType: g.categoryType,
        maxParticipants: 0
      }))
    } else {
      limitList.value = limits
    }
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    limitLoading.value = false
  }
}

function resetLimitForm() {
  limitCategoryId.value = null
  limitList.value = []
}

async function handleSaveLimits() {
  if (!limitCategoryId.value || limitList.value.length === 0) return
  limitSubmitLoading.value = true
  try {
    const limits = limitList.value.map(item => ({
      categoryId: limitCategoryId.value,
      groupId: item.groupId,
      maxParticipants: item.maxParticipants || 0
    }))
    await request.post('/groups/limits', { limits })
    ElMessage.success('限报数量设置成功')
    limitDialogVisible.value = false
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    limitSubmitLoading.value = false
  }
}

onMounted(() => {
  loadEventName()
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

.limit-form-header {
  margin-bottom: 10px;
}
</style>
