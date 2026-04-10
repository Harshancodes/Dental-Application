import client from './client'
import type { Patient } from '../types'

export const getPatients = () => client.get<Patient[]>('/patients/')
export const createPatient = (data: Omit<Patient, 'id' | 'created_at'>) =>
  client.post<Patient>('/patients/', data)
export const updatePatient = (id: number, data: Partial<Patient>) =>
  client.patch<Patient>(`/patients/${id}`, data)
export const deletePatient = (id: number) => client.delete(`/patients/${id}`)
