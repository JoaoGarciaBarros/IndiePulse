function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function getSessionId(): string {
  let id = sessionStorage.getItem('rage_session_id')
  if (!id) {
    id = generateId()
    sessionStorage.setItem('rage_session_id', id)
  }
  return id
}

export function getUserId(): string | null {
  return localStorage.getItem('rage_user_id')
}

export function setUserId(id: string) {
  localStorage.setItem('rage_user_id', id)
}
