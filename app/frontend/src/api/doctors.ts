import client from './client'
import type { Doctor } from '../types'

export const getDoctors = () => client.get<Doctor[]>('/doctors/')
export const createDoctor = (data: Omit<Doctor, 'id' | 'created_at'>) =>
  client.post<Doctor>('/doctors/', data)
export const updateDoctor = (id: number, data: Partial<Doctor>) =>
  client.patch<Doctor>(`/doctors/${id}`, data)
export const deleteDoctor = (id: number) => client.delete(`/doctors/${id}`)
