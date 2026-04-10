import { useEffect, useState } from 'react'
import { CalendarDays, User, Phone, Mail, MapPin, ClipboardList, Clock, XCircle } from 'lucide-react'
import { getPatients } from '../api/patients'
import { cancelAppointment } from '../api/appointments'
import client from '../api/client'
import type { Patient, Appointment } from '../types'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border border-blue-200',
  completed: 'bg-green-100 text-green-700 border border-green-200',
  cancelled: 'bg-red-100 text-red-700 border border-red-200',
}

const STATUS_ICONS: Record<string, string> = {
  scheduled: '🗓',
  completed: '✓',
  cancelled: '✕',
}

export default function PatientPortal() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getPatients().then(({ data }) => setPatients(data))
  }, [])

  const handleSelect = async (id: string) => {
    if (!id) { setSelected(null); setAppointments([]); return }
    const patient = patients.find((p) => p.id === Number(id))!
    setSelected(patient)
    setLoading(true)
    const { data } = await client.get<Appointment[]>(`/appointments/?patient_id=${id}`)
    setAppointments(data.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()))
    setLoading(false)
  }

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this appointment?')) return
    await cancelAppointment(id)
    if (selected) {
      const { data } = await client.get<Appointment[]>(`/appointments/?patient_id=${selected.id}`)
      setAppointments(data.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()))
    }
  }

  const upcoming = appointments.filter((a) => a.status === 'scheduled' && new Date(a.appointment_date) >= new Date())
  const past = appointments.filter((a) => a.status !== 'scheduled' || new Date(a.appointment_date) < new Date())

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-2">
          <User size={32} className="text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Patient Portal</h1>
        <p className="text-slate-500">Select your name to view your appointments and records.</p>
      </div>

      {/* Patient Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <label className="block text-sm font-medium text-slate-600 mb-2">Select Patient</label>
        <select
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
        >
          <option value="">— Choose your name —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Patient Info Card */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold shrink-0">
              {selected.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{selected.name}</h2>
              <p className="text-slate-400 text-sm">Patient ID #{selected.id}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {selected.date_of_birth && (
              <InfoRow icon={CalendarDays} label="Date of Birth" value={selected.date_of_birth} />
            )}
            {selected.phone && (
              <InfoRow icon={Phone} label="Phone" value={selected.phone} />
            )}
            {selected.email && (
              <InfoRow icon={Mail} label="Email" value={selected.email} />
            )}
            {selected.address && (
              <InfoRow icon={MapPin} label="Address" value={selected.address} />
            )}
          </div>
          {selected.medical_history && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList size={15} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Medical History</span>
              </div>
              <p className="text-sm text-amber-800">{selected.medical_history}</p>
            </div>
          )}
        </div>
      )}

      {/* Appointments */}
      {selected && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Upcoming */}
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Upcoming Appointments ({upcoming.length})
                </h3>
                {upcoming.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                    No upcoming appointments.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((a) => (
                      <AppointmentCard key={a.id} appointment={a} onCancel={() => handleCancel(a.id)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Past */}
              {past.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Past Appointments ({past.length})
                  </h3>
                  <div className="space-y-3">
                    {past.map((a) => (
                      <AppointmentCard key={a.id} appointment={a} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function AppointmentCard({ appointment: a, onCancel }: { appointment: Appointment; onCancel?: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg shrink-0">
          {STATUS_ICONS[a.status] ?? '?'}
        </div>
        <div>
          <p className="font-medium text-slate-800">{a.reason ?? 'Appointment'}</p>
          <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-sm">
            <Clock size={13} />
            {new Date(a.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          {a.notes && <p className="mt-2 text-sm text-slate-500 italic">"{a.notes}"</p>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[a.status]}`}>
          {a.status}
        </span>
        {onCancel && a.status === 'scheduled' && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <XCircle size={13} />
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  )
}
