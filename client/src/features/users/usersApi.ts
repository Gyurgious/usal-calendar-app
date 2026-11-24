import { apiFetch } from '../../api/httpClient'

/** Interfaces match DTO on server*/
export interface User {
  id: number
  firstName: string
  middleName: string | null
  lastName: string
  loginName: string
  displayName: string 
  isApprover: boolean
}

export interface UserRequest {
  firstName: string
  middleName: string | null
  lastName: string
  loginName: string
  password: string | null
  isApprover: boolean
}

/** Approvers only. Sorted by last name, then first name. */
export function getUsers(): Promise<User[]> {
  return apiFetch<User[]>('/api/users')
}

export function createUser(request: UserRequest): Promise<User> {
  return apiFetch<User>('/api/users', { method: 'POST', body: JSON.stringify(request) })
}

export function updateUser(id: number, request: UserRequest): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(request) })
}

export function deleteUser(id: number): Promise<void> {
  return apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' })
}