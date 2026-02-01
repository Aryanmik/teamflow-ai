export const AUTH_STORAGE_KEY = 'teamflow:auth'
export const USERNAME_STORAGE_KEY = 'teamflow:user'

export const DEMO_CREDENTIALS = {
  username: 'laraib',
  password: 'admin',
}

export const isAuthenticated = () =>
  localStorage.getItem(AUTH_STORAGE_KEY) === 'true'

export const setAuthenticated = (username) => {
  localStorage.setItem(AUTH_STORAGE_KEY, 'true')
  if (username) {
    localStorage.setItem(USERNAME_STORAGE_KEY, username)
  }
}

export const clearAuthenticated = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(USERNAME_STORAGE_KEY)
}

export const validateCredentials = (username, password) =>
  username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password
