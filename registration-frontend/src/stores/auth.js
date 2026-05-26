import { reactive, computed } from 'vue'

const state = reactive({
  token: localStorage.getItem('token') || '',
  userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null')
})

export function useAuthStore() {
  const isLoggedIn = computed(() => !!state.token)

  function setLogin(token, userInfo) {
    state.token = token
    state.userInfo = userInfo
    localStorage.setItem('token', token)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
  }

  function updateUserInfo(userInfo) {
    state.userInfo = userInfo
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
  }

  function logout() {
    state.token = ''
    state.userInfo = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    token: computed(() => state.token),
    userInfo: computed(() => state.userInfo),
    isLoggedIn,
    setLogin,
    updateUserInfo,
    logout
  }
}
