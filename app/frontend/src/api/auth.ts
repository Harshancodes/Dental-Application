import client from './client'
import type { AuthUser } from '../types'

export const login = (username: string, password: string) =>
  client.post<{ access_token: string; token_type: string }>(
    '/auth/login',
    new URLSearchParams({ username, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

export const getMe = () => client.get<AuthUser>('/auth/me')
