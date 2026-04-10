import { useEffect, useState } from 'react'
import { Users, Stethoscope, CalendarDays, CalendarCheck } from 'lucide-react'
import { getPatients } from '../api/patients'
import { getDoctors } from '../api/doctors'
import { getAppointments } from '../api/appointments'
import type { Appointment } from '../types'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  bg: string
}

function StatCard({ label, value, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5">
      <div className={`w-14 h-14 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={26} className={color} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function Dashboard() {
  const [patientCount, setPatientCount] = useState(0)
  const [doctorCount, setDoctorCount] = useState(0)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getPatients(), getDoctors(), getAppointments()]).then(
      ([p, d, a]) => {
        setPatientCount(p.data.length)
        setDoctorCount(d.data.length)
        setAppointments(a.data)
        setLoading(false)
      }
    )
  }, [])

  const today = new Date().toDateString()
  const todayCount = appointments.filter(
    (a) => new Date(a.appointment_date).toDateString() === today
  ).length

  const recent = [...appointments]
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
    .slice(0, 6)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total Patients" value={patientCount} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Total Doctors" value={doctorCount} icon={Stethoscope} color="text-purple-600" bg="bg-purple-50" />
        <StatCard label="Total Appointments" value={appointments.length} icon={CalendarDays} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Today's Appointments" value={todayCount} icon={CalendarCheck} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent Appointments</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">No appointments yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Doctor</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recent.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">#{a.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">Patient #{a.patient_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">Doctor #{a.doctor_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(a.appointment_date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{a.reason ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
