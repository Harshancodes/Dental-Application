import client from './client'
import type { Appointment } from '../types'

export const getAppointments = () => client.get<Appointment[]>('/appointments/')
export const createAppointment = (data: Omit<Appointment, 'id' | 'status' | 'created_at'>) =>
  client.post<Appointment>('/appointments/', data)
export const updateAppointment = (id: number, data: Partial<Appointment>) =>
  client.patch<Appointment>(`/appointments/${id}`, data)
export const cancelAppointment = (id: number) =>
  client.patch<Appointment>(`/appointments/${id}/cancel`)
export const rescheduleAppointment = (id: number, newDate: string) =>
  client.patch<Appointment>(`/appointments/${id}/reschedule`, null, { params: { new_date: newDate } })
export const deleteAppointment = (id: number) => client.delete(`/appointments/${id}`)
