import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '管理员登录' }
  },
  {
    path: '/',
    redirect: '/events'
  },
  {
    path: '/events',
    name: 'EventList',
    component: () => import('../views/EventList.vue'),
    meta: { title: '赛事管理', requireAuth: true }
  },
  {
    path: '/events/:eventId/categories',
    name: 'CategoryList',
    component: () => import('../views/CategoryList.vue'),
    meta: { title: '项目管理', requireAuth: true }
  },
  {
    path: '/events/:eventId/groups',
    name: 'GroupList',
    component: () => import('../views/GroupList.vue'),
    meta: { title: '分组管理', requireAuth: true }
  },
  {
    path: '/events/:eventId/registrations',
    name: 'RegistrationList',
    component: () => import('../views/RegistrationList.vue'),
    meta: { title: '报名管理', requireAuth: true }
  },
  {
    path: '/events/:eventId/orders',
    name: 'OrderManagement',
    component: () => import('../views/OrderManagement.vue'),
    meta: { title: '出场顺序与秩序册', requireAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory('/admin'),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 跳绳赛事管理系统` : '跳绳赛事管理系统'

  if (to.meta.requireAuth && !isLoggedIn()) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && isLoggedIn()) {
    next({ path: '/events' })
  } else {
    next()
  }
})

export default router
