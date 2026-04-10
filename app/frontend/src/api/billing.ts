import client from './client'
import type { Invoice } from '../types'

export const getInvoices = (params?: { patient_id?: number; status?: string }) =>
  client.get<Invoice[]>('/billing/', { params })
export const createInvoice = (data: Omit<Invoice, 'id' | 'paid_at' | 'created_at'>) =>
  client.post<Invoice>('/billing/', data)
export const updateInvoice = (id: number, data: Partial<Invoice>) =>
  client.patch<Invoice>(`/billing/${id}`, data)
export const markPaid = (id: number) => client.patch<Invoice>(`/billing/${id}/pay`)
export const deleteInvoice = (id: number) => client.delete(`/billing/${id}`)
