export interface Patient {
  id: number
  name: string
  date_of_birth: string | null
  phone: string | null
  email: string | null
  address: string | null
  medical_history: string | null
  created_at: string | null
}

export interface Doctor {
  id: number
  name: string
  specialization: string
  phone: string | null
  email: string | null
  created_at: string | null
}

export interface Appointment {
  id: number
  patient_id: number
  doctor_id: number
  appointment_date: string
  reason: string | null
  status: string
  notes: string | null
  created_at: string | null
}
