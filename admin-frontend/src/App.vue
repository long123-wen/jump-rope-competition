<template>
  <el-container class="app-container" v-if="isLoggedIn">
    <!-- 左侧菜单 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="app-aside">
      <div class="logo-container">
        <el-icon :size="24"><Trophy /></el-icon>
        <span v-show="!isCollapse" class="logo-text">赛事管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/events">
          <el-icon><Flag /></el-icon>
          <template #title>赛事管理</template>
        </el-menu-item>
        <el-sub-menu index="event-sub" v-if="currentEventId">
          <template #title>
            <el-icon><Menu /></el-icon>
            <span>当前赛事</span>
          </template>
          <el-menu-item :index="`/events/${currentEventId}/categories`">
            <el-icon><List /></el-icon>
            <template #title>项目管理</template>
          </el-menu-item>
          <el-menu-item :index="`/events/${currentEventId}/groups`">
            <el-icon><Grid /></el-icon>
            <template #title>分组管理</template>
          </el-menu-item>
          <el-menu-item :index="`/events/${currentEventId}/registrations`">
            <el-icon><User /></el-icon>
            <template #title>报名管理</template>
          </el-menu-item>
          <el-menu-item :index="`/events/${currentEventId}/orders`">
            <el-icon><Sort /></el-icon>
            <template #title>出场顺序与秩序册</template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 右侧内容 -->
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header class="app-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse" :size="20">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/events' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title && $route.name !== 'EventList'">
              {{ $route.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              <span>{{ userName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <!-- 登录页不显示布局 -->
  <router-view v-else />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isLoggedIn, getUser, removeToken } from './stores/auth'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const isCollapse = ref(false)

const currentEventId = computed(() => {
  return route.params.eventId || null
})

const activeMenu = computed(() => {
  return route.path
})

const userName = computed(() => {
  const user = getUser()
  return user?.realName || user?.username || '管理员'
})

function handleCommand(command) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      removeToken()
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.app-container {
  height: 100vh;
}

.app-aside {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
  overflow: hidden;
}

.logo-text {
  font-size: 15px;
}

.app-aside .el-menu {
  border-right: none;
}

.app-header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  z-index: 1;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.collapse-btn:hover {
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
}

.user-info:hover {
  color: #409eff;
}

.app-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

/* 面包屑导航样式 */
.el-breadcrumb {
  font-size: 14px;
}

/* 页面通用卡片样式 */
.page-card {
  margin-bottom: 16px;
}

.page-card .el-card__header {
  padding: 16px 20px;
  font-weight: bold;
  font-size: 16px;
}

/* 表格操作栏 */
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.table-toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.table-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 状态标签 */
.status-tag {
  font-weight: normal;
}
</style>
