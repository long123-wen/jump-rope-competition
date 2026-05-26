<template>
  <div class="register-page">
    <el-page-header @back="$router.push(`/event/${eventId}`)" :title="'赛事详情'">
      <template #content>
        <span class="page-title">赛事报名</span>
      </template>
    </el-page-header>

    <div v-loading="loading" class="register-content">
      <!-- 步骤条 -->
      <el-steps :active="currentStep" finish-status="success" align-center style="margin: 30px 0">
        <el-step title="选择项目" icon="Grid" />
        <el-step title="选择分组" icon="Files" />
        <el-step title="选择运动员" icon="User" />
        <el-step title="确认提交" icon="CircleCheck" />
      </el-steps>

      <!-- 步骤1：选择项目 -->
      <el-card v-show="currentStep === 0" class="step-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>选择要报名的项目（可多选）</span>
          </div>
        </template>

        <el-empty v-if="categories.length === 0" description="暂无可报名项目" />

        <el-checkbox-group v-model="selectedCategoryIds">
          <div class="category-select-list">
            <el-card
              v-for="cat in categories"
              :key="cat.id"
              class="category-select-card"
              :class="{ 'selected': selectedCategoryIds.includes(cat.id) }"
              shadow="hover"
            >
              <div class="category-select-content">
                <el-checkbox :label="cat.id" :value="cat.id">
                  <div class="category-info">
                    <h3>{{ cat.name }}</h3>
                    <p v-if="cat.description">{{ cat.description }}</p>
                    <el-tag size="small" type="primary">{{ cat.type || '个人赛' }}</el-tag>
                  </div>
                </el-checkbox>
              </div>
            </el-card>
          </div>
        </el-checkbox-group>

        <div class="step-actions">
          <el-button type="primary" @click="nextStep" :disabled="selectedCategoryIds.length === 0">
            下一步
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </el-card>

      <!-- 步骤2：选择分组 -->
      <el-card v-show="currentStep === 1" class="step-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>为每个项目选择分组</span>
          </div>
        </template>

        <div v-for="catId in selectedCategoryIds" :key="catId" class="group-select-section">
          <h3 class="group-category-name">{{ getCategoryName(catId) }}</h3>

          <el-radio-group
            v-model="selectedGroups[catId]"
            class="group-radio-group"
          >
            <div class="group-options">
              <el-card
                v-for="group in getCategoryGroups(catId)"
                :key="group.id"
                class="group-option-card"
                :class="{ 'selected': selectedGroups[catId] === group.id, 'disabled': group.remainingQuota <= 0 }"
                shadow="hover"
              >
                <el-radio
                  :value="group.id"
                  :disabled="group.remainingQuota <= 0"
                >
                  <div class="group-option-info">
                    <div class="group-option-name">{{ group.name }}</div>
                    <div class="group-option-details">
                      <span>{{ group.gender === 'male' ? '男' : group.gender === 'female' ? '女' : '不限' }}</span>
                      <span v-if="group.ageMin || group.ageMax">
                        {{ group.ageMin || '-' }}~{{ group.ageMax || '-' }}岁
                      </span>
                    </div>
                    <div class="group-quota">
                      <span :class="{ 'quota-full': group.remainingQuota <= 0 }">
                        剩余名额: {{ group.remainingQuota !== undefined ? group.remainingQuota : '不限' }}/{{ group.maxQuota || '不限' }}
                      </span>
                    </div>
                  </div>
                </el-radio>
              </el-card>
            </div>
          </el-radio-group>

          <el-divider />
        </div>

        <div class="step-actions">
          <el-button @click="prevStep">
            <el-icon><ArrowLeft /></el-icon>
            上一步
          </el-button>
          <el-button
            type="primary"
            @click="nextStep"
            :disabled="!allGroupsSelected"
          >
            下一步
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </el-card>

      <!-- 步骤3：选择运动员 -->
      <el-card v-show="currentStep === 2" class="step-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>为每个项目+分组选择运动员</span>
            <el-button type="primary" text style="margin-left: auto" @click="loadAthletes">
              <el-icon><Refresh /></el-icon> 刷新运动员列表
            </el-button>
          </div>
        </template>

        <el-alert
          v-if="athletes.length === 0"
          title="暂无运动员信息"
          description="请先在个人中心添加运动员后再进行报名"
          type="warning"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        >
          <template #default>
            <el-button type="primary" size="small" @click="$router.push('/profile')">
              前往添加运动员
            </el-button>
          </template>
        </el-alert>

        <div v-for="catId in selectedCategoryIds" :key="catId" class="athlete-select-section">
          <h3 class="athlete-section-title">
            {{ getCategoryName(catId) }} - {{ getGroupName(selectedGroups[catId]) }}
          </h3>

          <el-input
            v-model="athleteSearch[catId]"
            placeholder="搜索运动员姓名..."
            prefix-icon="Search"
            clearable
            style="margin-bottom: 12px; max-width: 300px"
          />

          <el-checkbox-group v-model="selectedAthletes[catId]" class="athlete-checkbox-group">
            <el-table
              :data="filteredAthletes(catId)"
              border
              size="small"
              style="width: 100%"
              max-height="300"
            >
              <el-table-column width="50">
                <template #default="{ row }">
                  <el-checkbox
                    :label="row.id"
                    :value="row.id"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="name" label="姓名" width="100" />
              <el-table-column prop="gender" label="性别" width="70">
                <template #default="{ row }">
                  {{ row.gender === 'male' ? '男' : '女' }}
                </template>
              </el-table-column>
              <el-table-column prop="birthDate" label="出生日期" width="120" />
              <el-table-column prop="idCard" label="身份证号" />
            </el-table>
          </el-checkbox-group>

          <el-divider />
        </div>

        <div class="step-actions">
          <el-button @click="prevStep">
            <el-icon><ArrowLeft /></el-icon>
            上一步
          </el-button>
          <el-button
            type="primary"
            @click="nextStep"
            :disabled="!allAthletesSelected || athletes.length === 0"
          >
            下一步
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </el-card>

      <!-- 步骤4：确认提交 -->
      <el-card v-show="currentStep === 3" class="step-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>确认报名信息</span>
          </div>
        </template>

        <div class="confirm-list">
          <el-card
            v-for="catId in selectedCategoryIds"
            :key="catId"
            class="confirm-item"
            shadow="hover"
          >
            <h3>{{ getCategoryName(catId) }}</h3>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="分组">
                {{ getGroupName(selectedGroups[catId]) }}
              </el-descriptions-item>
              <el-descriptions-item label="运动员人数">
                {{ (selectedAthletes[catId] || []).length }} 人
              </el-descriptions-item>
              <el-descriptions-item label="运动员" :span="2">
                <el-tag
                  v-for="athleteId in selectedAthletes[catId]"
                  :key="athleteId"
                  size="small"
                  style="margin: 2px 4px"
                >
                  {{ getAthleteName(athleteId) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </div>

        <el-alert
          title="请仔细核对以上报名信息，提交后将无法修改"
          type="warning"
          show-icon
          :closable="false"
          style="margin: 16px 0"
        />

        <div class="step-actions">
          <el-button @click="prevStep">
            <el-icon><ArrowLeft /></el-icon>
            上一步
          </el-button>
          <el-button
            type="success"
            size="large"
            @click="submitRegistration"
            :loading="submitting"
          >
            <el-icon><CircleCheck /></el-icon>
            确认提交报名
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const route = useRoute()
const router = useRouter()
const eventId = computed(() => route.params.eventId)
const loading = ref(false)
const submitting = ref(false)
const currentStep = ref(0)

// 数据
const event = ref(null)
const categories = ref([])
const athletes = ref([])

// 选择状态
const selectedCategoryIds = ref([])
const selectedGroups = reactive({})
const selectedAthletes = reactive({})
const athleteSearch = reactive({})

onMounted(() => {
  loadEventData()
  loadAthletes()
})

async function loadEventData() {
  loading.value = true
  try {
    const res = await request.get(`/events/${eventId.value}`)
    const data = res.data || res
    event.value = data.event || data
    categories.value = data.categories || []
  } catch (err) {
    console.error('加载赛事数据失败:', err)
  } finally {
    loading.value = false
  }
}

async function loadAthletes() {
  try {
    const res = await request.get('/users/profile')
    const data = res.data || res
    athletes.value = data.athletes || []
  } catch (err) {
    console.error('加载运动员失败:', err)
  }
}

function getCategoryName(catId) {
  const cat = categories.value.find(c => c.id === catId)
  return cat ? cat.name : '未知项目'
}

function getCategoryGroups(catId) {
  const cat = categories.value.find(c => c.id === catId)
  return cat ? (cat.groups || []) : []
}

function getGroupName(groupId) {
  for (const cat of categories.value) {
    const group = (cat.groups || []).find(g => g.id === groupId)
    if (group) return group.name
  }
  return '未选择'
}

function getAthleteName(athleteId) {
  const athlete = athletes.value.find(a => a.id === athleteId)
  return athlete ? athlete.name : '未知'
}

function filteredAthletes(catId) {
  const keyword = (athleteSearch[catId] || '').toLowerCase()
  if (!keyword) return athletes.value
  return athletes.value.filter(a => a.name.toLowerCase().includes(keyword))
}

const allGroupsSelected = computed(() => {
  return selectedCategoryIds.value.every(catId => selectedGroups[catId])
})

const allAthletesSelected = computed(() => {
  return selectedCategoryIds.value.every(catId =>
    selectedAthletes[catId] && selectedAthletes[catId].length > 0
  )
})

function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function submitRegistration() {
  try {
    await ElMessageBox.confirm(
      '确定要提交以上报名信息吗？提交后将进入待确认状态。',
      '确认提交',
      {
        confirmButtonText: '确定提交',
        cancelButtonText: '再想想',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  submitting.value = true
  let successCount = 0
  let failCount = 0

  try {
    for (const catId of selectedCategoryIds.value) {
      const athleteIds = selectedAthletes[catId] || []
      for (const athleteId of athleteIds) {
        try {
          await request.post('/registrations', {
            eventId: eventId.value,
            categoryId: catId,
            groupId: selectedGroups[catId],
            athleteId: athleteId
          })
          successCount++
        } catch (err) {
          failCount++
          console.error('报名失败:', err)
        }
      }
    }

    if (failCount === 0) {
      ElMessage.success(`报名成功！共提交 ${successCount} 条报名记录`)
      router.push(`/event/${eventId.value}/my-registrations`)
    } else {
      ElMessage.warning(`报名完成：成功 ${successCount} 条，失败 ${failCount} 条`)
    }
  } catch (err) {
    ElMessage.error('报名提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.register-page {
  padding-bottom: 40px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.register-content {
  margin-top: 20px;
}

.step-card {
  border-radius: 8px;
  min-height: 300px;
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 步骤1：项目选择 */
.category-select-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.category-select-card {
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.category-select-card.selected {
  border-color: #409EFF;
  background: #ecf5ff;
}

.category-select-content {
  width: 100%;
}

.category-select-content :deep(.el-checkbox) {
  width: 100%;
  height: auto;
}

.category-select-content :deep(.el-checkbox__label) {
  width: 100%;
  white-space: normal;
}

.category-info h3 {
  font-size: 16px;
  color: #303133;
  margin-bottom: 4px;
}

.category-info p {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

/* 步骤2：分组选择 */
.group-select-section {
  margin-bottom: 8px;
}

.group-category-name {
  font-size: 16px;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #409EFF;
}

.group-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.group-option-card {
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.group-option-card.selected {
  border-color: #409EFF;
  background: #ecf5ff;
}

.group-option-card.disabled {
  opacity: 0.6;
  background: #f5f7fa;
}

.group-option-card :deep(.el-radio) {
  width: 100%;
  height: auto;
}

.group-option-card :deep(.el-radio__label) {
  width: 100%;
  white-space: normal;
}

.group-option-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.group-option-details {
  font-size: 13px;
  color: #909399;
  display: flex;
  gap: 12px;
}

.group-quota {
  font-size: 13px;
  margin-top: 4px;
}

.quota-full {
  color: #f56c6c;
  font-weight: 600;
}

/* 步骤3：运动员选择 */
.athlete-select-section {
  margin-bottom: 8px;
}

.athlete-section-title {
  font-size: 15px;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #67c23a;
}

.athlete-checkbox-group {
  width: 100%;
}

/* 步骤4：确认 */
.confirm-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.confirm-item {
  border-radius: 8px;
}

.confirm-item h3 {
  font-size: 16px;
  color: #303133;
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .category-select-list,
  .group-options {
    grid-template-columns: 1fr;
  }

  .step-actions {
    flex-direction: column;
  }

  .step-actions .el-button {
    width: 100%;
  }
}
</style>
