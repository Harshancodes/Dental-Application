import client from './client'
import type { Treatment } from '../types'

export const getTreatments = (appointment_id?: number) =>
  client.get<Treatment[]>('/treatments/', { params: appointment_id ? { appointment_id } : {} })
export const createTreatment = (data: Omit<Treatment, 'id' | 'created_at'>) =>
  client.post<Treatment>('/treatments/', data)
export const updateTreatment = (id: number, data: Partial<Treatment>) =>
  client.patch<Treatment>(`/treatments/${id}`, data)
export const deleteTreatment = (id: number) => client.delete(`/treatments/${id}`)
