import { useEffect, useState } from 'react'
import { CalendarPlus, Trash2, XCircle, Search } from 'lucide-react'
import {
  getAppointments,
  createAppointment,
  cancelAppointment,
  deleteAppointment,
} from '../api/appointments'
import { getPatients } from '../api/patients'
import { getDoctors } from '../api/doctors'
import type { Appointment, Patient, Doctor } from '../types'
import Modal from '../components/Modal'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const EMPTY_FORM = {
  patient_id: '',
  doctor_id: '',
  appointment_date: '',
  reason: '',
  notes: '',
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [a, p, d] = await Promise.all([getAppointments(), getPatients(), getDoctors()])
    setAppointments(a.data)
    setPatients(p.data)
    setDoctors(d.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const patientName = (id: number) => patients.find((p) => p.id === id)?.name ?? `#${id}`
  const doctorName = (id: number) => doctors.find((d) => d.id === id)?.name ?? `#${id}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createAppointment({
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        appointment_date: new Date(form.appointment_date).toISOString(),
        reason: form.reason || null,
        notes: form.notes || null,
      })
      setShowModal(false)
      setForm(EMPTY_FORM)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this appointment?')) return
    await cancelAppointment(id)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this appointment permanently?')) return
    await deleteAppointment(id)
    load()
  }

  const filtered = appointments.filter((a) => {
    const pName = patientName(a.patient_id).toLowerCase()
    const dName = doctorName(a.doctor_id).toLowerCase()
    const q = search.toLowerCase()
    return pName.includes(q) || dName.includes(q) || a.status.includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-slate-500 mt-0.5">{appointments.length} total appointments</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <CalendarPlus size={16} />
          Book Appointment
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by patient, doctor, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {search ? 'No appointments match your search.' : 'No appointments yet. Book one to get started.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Doctor</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">
                    {patientName(a.patient_id)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    Dr. {doctorName(a.doctor_id)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(a.appointment_date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{a.reason ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {a.status === 'scheduled' && (
                        <button
                          onClick={() => handleCancel(a.id)}
                          className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Cancel appointment"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title="Book Appointment" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Patient *">
              <select
                required
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Select patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Doctor *">
              <select
                required
                value={form.doctor_id}
                onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Select doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>Dr. {d.name} — {d.specialization}</option>
                ))}
              </select>
            </Field>
            <Field label="Date & Time *">
              <input
                required
                type="datetime-local"
                value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Reason">
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className={inputCls}
                placeholder="Checkup, cleaning, pain..."
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputCls}
                placeholder="Additional notes..."
              />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className={cancelBtn}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={submitBtn}>
                {saving ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800'
const submitBtn =
  'flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors'
const cancelBtn =
  'flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition-colors'
