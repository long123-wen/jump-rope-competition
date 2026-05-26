<template>
  <div class="profile-page">
    <el-page-header @back="$router.push('/')" title="返回首页">
      <template #content>
        <span class="page-title">个人中心</span>
      </template>
    </el-page-header>

    <div class="profile-content" v-loading="loading">
      <!-- 用户基本信息 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>基本信息</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="机构类型">
            {{ authStore.userInfo?.organizationType === 'club' ? '俱乐部' : '学校' }}
          </el-descriptions-item>
          <el-descriptions-item label="机构名称">
            {{ authStore.userInfo?.organizationName }}
          </el-descriptions-item>
          <el-descriptions-item label="真实姓名">
            {{ authStore.userInfo?.realName }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ authStore.userInfo?.phone }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 领队信息 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><UserFilled /></el-icon>
            <span>领队信息</span>
          </div>
        </template>
        <el-form :model="leaderForm" label-width="90px" size="default">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="领队姓名">
                <el-input v-model="leaderForm.name" placeholder="请输入领队姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="leaderForm.phone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <el-button type="primary" @click="saveLeader" :loading="savingLeader">
              保存领队信息
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 教练员信息 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Avatar /></el-icon>
            <span>教练员信息</span>
          </div>
        </template>

        <el-table :data="coaches" border stripe style="width: 100%; margin-bottom: 16px">
          <el-table-column prop="name" label="姓名" width="150" />
          <el-table-column prop="phone" label="电话" width="150" />
          <el-table-column prop="level" label="级别" width="150" />
          <el-table-column label="操作" width="120">
            <template #default="{ row, $index }">
              <el-button type="danger" text size="small" @click="removeCoach($index)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-divider content-position="left">添加教练员</el-divider>
        <el-form :model="coachForm" label-width="70px" size="default" inline>
          <el-form-item label="姓名">
            <el-input v-model="coachForm.name" placeholder="姓名" style="width: 120px" />
          </el-form-item>
          <el-form-item label="电话">
            <el-input v-model="coachForm.phone" placeholder="电话" style="width: 140px" />
          </el-form-item>
          <el-form-item label="级别">
            <el-select v-model="coachForm.level" placeholder="选择级别" style="width: 120px">
              <el-option label="初级" value="初级" />
              <el-option label="中级" value="中级" />
              <el-option label="高级" value="高级" />
              <el-option label="国家级" value="国家级" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="addCoach">添加</el-button>
          </el-form-item>
        </el-form>

        <el-form-item style="margin-top: 16px">
          <el-button type="success" @click="saveCoaches" :loading="savingCoaches">
            保存教练员列表
          </el-button>
        </el-form-item>
      </el-card>

      <!-- 运动员管理 -->
      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Medal /></el-icon>
            <span>运动员管理</span>
            <el-button type="primary" text style="margin-left: auto" @click="showBatchAdd = !showBatchAdd">
              {{ showBatchAdd ? '单个添加' : '批量添加' }}
            </el-button>
          </div>
        </template>

        <!-- 单个添加运动员 -->
        <div v-if="!showBatchAdd">
          <el-form :model="athleteForm" label-width="90px" size="default" inline>
            <el-form-item label="姓名">
              <el-input v-model="athleteForm.name" placeholder="姓名" style="width: 120px" />
            </el-form-item>
            <el-form-item label="性别">
              <el-select v-model="athleteForm.gender" placeholder="性别" style="width: 80px">
                <el-option label="男" value="male" />
                <el-option label="女" value="female" />
              </el-select>
            </el-form-item>
            <el-form-item label="出生日期">
              <el-date-picker
                v-model="athleteForm.birthDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 160px"
              />
            </el-form-item>
            <el-form-item label="身份证号">
              <el-input v-model="athleteForm.idCard" placeholder="身份证号" style="width: 180px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="addAthlete">添加运动员</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 批量添加运动员 -->
        <div v-if="showBatchAdd">
          <el-alert
            title="批量添加说明"
            description="每行一个运动员，格式：姓名,性别(男/女),出生日期(YYYY-MM-DD),身份证号"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
          />
          <el-input
            v-model="batchText"
            type="textarea"
            :rows="6"
            placeholder="张三,男,2010-05-15,110101201005150011&#10;李四,女,2011-08-20,110101201108200022"
            style="margin-bottom: 12px"
          />
          <el-button type="primary" @click="batchAddAthletes">批量添加</el-button>
        </div>

        <!-- 运动员列表 -->
        <el-table :data="athletes" border stripe style="width: 100%; margin-top: 16px" max-height="400">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="gender" label="性别" width="70">
            <template #default="{ row }">
              {{ row.gender === 'male' ? '男' : '女' }}
            </template>
          </el-table-column>
          <el-table-column prop="birthDate" label="出生日期" width="120" />
          <el-table-column prop="idCard" label="身份证号" width="200" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row, $index }">
              <el-button type="primary" text size="small" @click="editAthlete(row, $index)">
                编辑
              </el-button>
              <el-button type="danger" text size="small" @click="removeAthlete($index)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 16px">
          <el-button type="success" @click="saveAthletes" :loading="savingAthletes">
            保存运动员列表
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 编辑运动员对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑运动员" width="450px">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model="editForm.gender" style="width: 100%">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
          </el-select>
        </el-form-item>
        <el-form-item label="出生日期">
          <el-date-picker
            v-model="editForm.birthDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="editForm.idCard" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEditAthlete">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import request from '../utils/request'

const authStore = useAuthStore()
const loading = ref(false)
const savingLeader = ref(false)
const savingCoaches = ref(false)
const savingAthletes = ref(false)
const showBatchAdd = ref(false)
const batchText = ref('')
const editDialogVisible = ref(false)
const editIndex = ref(-1)

// 领队
const leaderForm = reactive({ name: '', phone: '' })

// 教练员
const coaches = ref([])
const coachForm = reactive({ name: '', phone: '', level: '初级' })

// 运动员
const athletes = ref([])
const athleteForm = reactive({
  name: '',
  gender: 'male',
  birthDate: '',
  idCard: ''
})
const editForm = reactive({
  name: '',
  gender: 'male',
  birthDate: '',
  idCard: ''
})

onMounted(() => {
  loadProfile()
})

async function loadProfile() {
  loading.value = true
  try {
    const res = await request.get('/users/profile')
    const data = res.data || res
    if (data.leader) {
      leaderForm.name = data.leader.name || ''
      leaderForm.phone = data.leader.phone || ''
    }
    if (data.coaches) {
      coaches.value = data.coaches
    }
    if (data.athletes) {
      athletes.value = data.athletes
    }
  } catch (err) {
    console.error('加载个人信息失败:', err)
  } finally {
    loading.value = false
  }
}

async function saveLeader() {
  savingLeader.value = true
  try {
    await request.put('/users/profile/leader', leaderForm)
    ElMessage.success('领队信息保存成功')
  } catch (err) {
    console.error('保存领队失败:', err)
  } finally {
    savingLeader.value = false
  }
}

function addCoach() {
  if (!coachForm.name || !coachForm.phone) {
    ElMessage.warning('请填写教练员姓名和电话')
    return
  }
  coaches.value.push({ ...coachForm })
  coachForm.name = ''
  coachForm.phone = ''
  coachForm.level = '初级'
}

function removeCoach(index) {
  coaches.value.splice(index, 1)
}

async function saveCoaches() {
  savingCoaches.value = true
  try {
    await request.put('/users/profile/coaches', { coaches: coaches.value })
    ElMessage.success('教练员列表保存成功')
  } catch (err) {
    console.error('保存教练员失败:', err)
  } finally {
    savingCoaches.value = false
  }
}

function addAthlete() {
  if (!athleteForm.name || !athleteForm.birthDate) {
    ElMessage.warning('请填写运动员姓名和出生日期')
    return
  }
  athletes.value.push({ ...athleteForm })
  athleteForm.name = ''
  athleteForm.gender = 'male'
  athleteForm.birthDate = ''
  athleteForm.idCard = ''
}

function batchAddAthletes() {
  if (!batchText.value.trim()) {
    ElMessage.warning('请输入运动员信息')
    return
  }
  const lines = batchText.value.trim().split('\n')
  let count = 0
  for (const line of lines) {
    const parts = line.split(',').map(s => s.trim())
    if (parts.length >= 3) {
      const gender = parts[1] === '女' ? 'female' : 'male'
      athletes.value.push({
        name: parts[0],
        gender,
        birthDate: parts[2],
        idCard: parts[3] || ''
      })
      count++
    }
  }
  ElMessage.success(`成功添加 ${count} 名运动员`)
  batchText.value = ''
}

function editAthlete(row, index) {
  editIndex.value = index
  editForm.name = row.name
  editForm.gender = row.gender
  editForm.birthDate = row.birthDate
  editForm.idCard = row.idCard
  editDialogVisible.value = true
}

function confirmEditAthlete() {
  if (editIndex.value >= 0) {
    athletes.value[editIndex.value] = { ...editForm }
    ElMessage.success('修改成功')
  }
  editDialogVisible.value = false
}

function removeAthlete(index) {
  ElMessageBox.confirm('确定要删除该运动员吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    athletes.value.splice(index, 1)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

async function saveAthletes() {
  savingAthletes.value = true
  try {
    await request.put('/users/profile/athletes', { athletes: athletes.value })
    ElMessage.success('运动员列表保存成功')
  } catch (err) {
    console.error('保存运动员失败:', err)
  } finally {
    savingAthletes.value = false
  }
}
</script>

<style scoped>
.profile-page {
  padding-bottom: 40px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.profile-content {
  margin-top: 20px;
}

.section-card {
  margin-bottom: 20px;
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
  .el-form--inline .el-form-item {
    margin-right: 0;
    margin-bottom: 12px;
    width: 100%;
  }
}
</style>
