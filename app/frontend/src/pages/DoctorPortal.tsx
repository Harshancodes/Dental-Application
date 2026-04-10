import { useEffect, useState } from 'react'
import { CheckCircle, Clock, Stethoscope, Calendar, User } from 'lucide-react'
import { getDoctors } from '../api/doctors'
import { getPatients } from '../api/patients'
import { updateAppointment } from '../api/appointments'
import client from '../api/client'
import type { Doctor, Patient, Appointment } from '../types'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function DoctorPortal() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [notesModal, setNotesModal] = useState<{ id: number; notes: string } | null>(null)

  useEffect(() => {
    getDoctors().then(({ data }) => setDoctors(data))
    getPatients().then(({ data }) => setPatients(data))
  }, [])

  const handleSelect = async (id: string) => {
    if (!id) { setSelected(null); setAppointments([]); return }
    const doctor = doctors.find((d) => d.id === Number(id))!
    setSelected(doctor)
    setLoading(true)
    const { data } = await client.get<Appointment[]>(`/appointments/?doctor_id=${id}`)
    setAppointments(data.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()))
    setLoading(false)
  }

  const reload = async () => {
    if (!selected) return
    const { data } = await client.get<Appointment[]>(`/appointments/?doctor_id=${selected.id}`)
    setAppointments(data.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()))
  }

  const markComplete = async (id: number) => {
    await updateAppointment(id, { status: 'completed' })
    reload()
  }

  const saveNotes = async () => {
    if (!notesModal) return
    await updateAppointment(notesModal.id, { notes: notesModal.notes })
    setNotesModal(null)
    reload()
  }

  const patientName = (id: number) => patients.find((p) => p.id === id)?.name ?? `Patient #${id}`

  const today = new Date().toDateString()
  const todayAppts = appointments.filter(
    (a) => new Date(a.appointment_date).toDateString() === today && a.status === 'scheduled'
  )
  const upcoming = appointments.filter(
    (a) => new Date(a.appointment_date) > new Date() && new Date(a.appointment_date).toDateString() !== today && a.status === 'scheduled'
  )
  const past = appointments.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled' ||
      (a.status === 'scheduled' && new Date(a.appointment_date) < new Date())
  )

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-2">
          <Stethoscope size={32} className="text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Doctor Portal</h1>
        <p className="text-slate-500">View your schedule, manage appointments, and update patient notes.</p>
      </div>

      {/* Doctor Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <label className="block text-sm font-medium text-slate-600 mb-2">Select Doctor</label>
        <select
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 bg-white"
        >
          <option value="">— Choose your name —</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>Dr. {d.name} — {d.specialization}</option>
          ))}
        </select>
      </div>

      {/* Doctor Info */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xl font-bold shrink-0">
              {selected.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Dr. {selected.name}</h2>
              <p className="text-slate-500 text-sm">{selected.specialization}</p>
            </div>
            <div className="ml-auto flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-600">{todayAppts.length}</p>
                <p className="text-xs text-slate-400">Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
                <p className="text-xs text-slate-400">Upcoming</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{past.filter(a => a.status === 'completed').length}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule */}
      {selected && (
        loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Today */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-purple-500" />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Today's Schedule ({todayAppts.length})
                </h3>
              </div>
              {todayAppts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                  No appointments scheduled for today.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppts.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appointment={a}
                      patientName={patientName(a.patient_id)}
                      onComplete={() => markComplete(a.id)}
                      onNotes={() => setNotesModal({ id: a.id, notes: a.notes ?? '' })}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Future Schedule */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Future Schedule ({upcoming.length})
                </h3>
              </div>
              {upcoming.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                  No upcoming appointments scheduled.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3">Patient</th>
                        <th className="px-5 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {upcoming
                        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                        .map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-sm font-medium text-slate-700">
                              {new Date(a.appointment_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-500">
                              {new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3 text-sm font-medium text-slate-800">
                              {patientName(a.patient_id)}
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-500">{a.reason ?? '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  History ({past.length})
                </h3>
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        <th className="px-5 py-3">Patient</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Reason</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {past.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-sm font-medium text-slate-700">{patientName(a.patient_id)}</td>
                          <td className="px-5 py-3 text-sm text-slate-500">
                            {new Date(a.appointment_date).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">{a.reason ?? '—'}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[a.status]}`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNotesModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Add / Edit Notes</h3>
            <textarea
              rows={4}
              value={notesModal.notes}
              onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Clinical notes, treatment details..."
            />
            <div className="flex gap-3">
              <button onClick={() => setNotesModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button onClick={saveNotes} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppointmentRow({
  appointment: a,
  patientName,
  onComplete,
  onNotes,
}: {
  appointment: Appointment
  patientName: string
  onComplete: () => void
  onNotes: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
          {patientName.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <User size={12} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-800">{patientName}</p>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{a.reason ?? 'Appointment'}</p>
          <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs">
            <Clock size={11} />
            {new Date(a.appointment_date).toLocaleString([], { timeStyle: 'short' })}
          </div>
          {a.notes && <p className="mt-1.5 text-xs text-slate-400 italic">"{a.notes}"</p>}
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={onComplete}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
        >
          <CheckCircle size={13} />
          Complete
        </button>
        <button
          onClick={onNotes}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors"
        >
          Notes
        </button>
      </div>
    </div>
  )
}
