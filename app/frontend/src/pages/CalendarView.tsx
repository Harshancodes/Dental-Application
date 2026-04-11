import { useEffect, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getAppointments } from '../api/appointments'
import { getPatients } from '../api/patients'
import { getDoctors } from '../api/doctors'
import type { Appointment, Patient, Doctor } from '../types'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
})

const STATUS_BG: Record<string, string> = {
  scheduled: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
}

interface CalEvent {
  title: string
  start: Date
  end: Date
  resource: Appointment
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAppointments(), getPatients(), getDoctors()]).then(([a, p, d]) => {
      setPatients(p.data)
      setDoctors(d.data)
      const evts: CalEvent[] = a.data.map(appt => {
        const patient = p.data.find(x => x.id === appt.patient_id)
        const doctor = d.data.find(x => x.id === appt.doctor_id)
        const start = new Date(appt.appointment_date)
        const end = new Date(start.getTime() + 30 * 60 * 1000) // 30 min slots
        return {
          title: `${patient?.name ?? `Patient #${appt.patient_id}`} → Dr. ${doctor?.name ?? appt.doctor_id}`,
          start,
          end,
          resource: appt,
        }
      })
      setEvents(evts)
      setLoading(false)
    })
  }, [])

  const patientName = (id: number) => patients.find(p => p.id === id)?.name ?? `Patient #${id}`
  const doctorName = (id: number) => doctors.find(d => d.id === id)?.name ?? `Doctor #${id}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Appointment Calendar</h1>
        <p className="text-slate-500 mt-1">All appointments at a glance. Click any event for details.</p>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {[['scheduled', '#3b82f6'], ['completed', '#22c55e'], ['cancelled', '#ef4444']].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-xs text-slate-500 capitalize">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4" style={{ height: 620 }}>
        <Calendar
          localizer={localizer}
          events={events}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          onSelectEvent={e => setSelected(e.resource)}
          eventPropGetter={e => ({
            style: {
              backgroundColor: STATUS_BG[e.resource.status] ?? '#94a3b8',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              padding: '2px 6px',
            },
          })}
          style={{ height: '100%' }}
        />
      </div>

      {/* Event detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Appointment Details</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Patient" value={patientName(selected.patient_id)} />
              <Row label="Doctor" value={`Dr. ${doctorName(selected.doctor_id)}`} />
              <Row label="Date & Time" value={new Date(selected.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} />
              <Row label="Reason" value={selected.reason ?? '—'} />
              <Row label="Status">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  selected.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  selected.status === 'completed' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>{selected.status}</span>
              </Row>
              {selected.notes && <Row label="Notes" value={selected.notes} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-400 shrink-0">{label}</span>
      {children ?? <span className="text-slate-700 font-medium text-right">{value}</span>}
    </div>
  )
}
