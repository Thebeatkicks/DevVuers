import { post } from './api'
import type { LoginResponse } from '../../../shared/src/types'

export const login = (email: string, password: string) =>
  post<LoginResponse>('/auth/login', { email, password })