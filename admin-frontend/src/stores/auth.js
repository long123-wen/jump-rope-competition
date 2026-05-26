import { reactive } from 'vue'

const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null')
})

export function getToken() {
  return state.token
}

export function setToken(token) {
  state.token = token
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  state.token = ''
  state.user = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function setUser(user) {
  state.user = user
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser() {
  return state.user
}

export function isLoggedIn() {
  return !!state.token
}

export default state
