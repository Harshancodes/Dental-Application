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

export interface Treatment {
  id: number
  appointment_id: number
  tooth_number: number | null
  procedure_type: string
  description: string | null
  cost: number
  created_at: string | null
}

export interface Invoice {
  id: number
  patient_id: number
  appointment_id: number | null
  total_amount: number
  status: string
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string | null
}

export interface AuthUser {
  id: number
  username: string
  role: string
  full_name: string | null
}
