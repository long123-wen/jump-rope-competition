import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/event/:eventId',
    name: 'EventDetail',
    component: () => import('../views/EventDetail.vue'),
    meta: { title: '赛事详情' }
  },
  {
    path: '/event/:eventId/register',
    name: 'EventRegister',
    component: () => import('../views/RegisterPage.vue'),
    meta: { title: '赛事报名', requiresAuth: true }
  },
  {
    path: '/event/:eventId/my-registrations',
    name: 'MyRegistrations',
    component: () => import('../views/MyRegistrations.vue'),
    meta: { title: '我的报名', requiresAuth: true }
  },
  {
    path: '/event/:eventId/export',
    name: 'ExportPage',
    component: () => import('../views/ExportPage.vue'),
    meta: { title: '导出报名', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 跳绳赛事报名系统` : '跳绳赛事报名系统'

  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }
  next()
})

export default router
