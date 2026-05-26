<template>
  <div id="app-wrapper">
    <!-- 顶部导航栏 -->
    <el-header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <el-icon :size="28" color="#409EFF"><Trophy /></el-icon>
          <span class="app-title" @click="$router.push('/')">跳绳赛事报名系统</span>
        </div>
        <div class="header-right">
          <template v-if="authStore.isLoggedIn">
            <el-button type="primary" text @click="$router.push('/profile')">
              <el-icon><User /></el-icon>
              <span>{{ authStore.userInfo?.realName || '个人中心' }}</span>
            </el-button>
            <el-button type="danger" text @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </el-button>
          </template>
          <template v-else>
            <el-button type="primary" @click="$router.push('/login')">登录</el-button>
            <el-button @click="$router.push('/register')">注册</el-button>
          </template>
        </div>
      </div>
    </el-header>

    <!-- 主内容区域 -->
    <el-main class="app-main">
      <router-view />
    </el-main>

    <!-- 底部 -->
    <el-footer class="app-footer">
      <p>跳绳赛事报名系统 &copy; {{ new Date().getFullYear() }}</p>
    </el-footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background-color: #f5f7fa;
  color: #303133;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

#app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0 20px;
  height: 60px !important;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 20px !important;
}

.app-footer {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 20px 0 !important;
  background: #fff;
  border-top: 1px solid #ebeef5;
}
</style>
