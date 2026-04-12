import { useEffect, useState } from 'react'
import { Users, Stethoscope, CalendarDays, CalendarCheck, DollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { getPatients } from '../api/patients'
import { getDoctors } from '../api/doctors'
import { getAppointments } from '../api/appointments'
import client from '../api/client'
import type { Appointment, Invoice } from '../types'

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

const PIE_COLORS = ['#3b82f6', '#22c55e', '#ef4444']

export default function Dashboard() {
  const [patientCount, setPatientCount] = useState(0)
  const [doctorCount, setDoctorCount] = useState(0)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getPatients(),
      getDoctors(),
      getAppointments(),
      client.get<Invoice[]>('/billing/'),
    ]).then(([p, d, a, inv]) => {
      setPatientCount(p.data.length)
      setDoctorCount(d.data.length)
      setAppointments(a.data)
      setInvoices(inv.data)
      setLoading(false)
    })
  }, [])

  const today = new Date().toDateString()
  const todayCount = appointments.filter(a => new Date(a.appointment_date).toDateString() === today).length
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)

  const recent = [...appointments]
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
    .slice(0, 6)

  // Bar chart: appointments per month (last 6 months)
  const monthlyData = (() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const label = d.toLocaleString('default', { month: 'short' })
      const count = appointments.filter(a => {
        const ad = new Date(a.appointment_date)
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear()
      }).length
      return { month: label, appointments: count }
    })
  })()

  // Pie chart: status breakdown
  const statusData = [
    { name: 'Scheduled', value: appointments.filter(a => a.status === 'scheduled').length },
    { name: 'Completed', value: appointments.filter(a => a.status === 'completed').length },
    { name: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length },
  ].filter(d => d.value > 0)

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <StatCard label="Total Patients" value={patientCount} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Total Doctors" value={doctorCount} icon={Stethoscope} color="text-purple-600" bg="bg-purple-50" />
        <StatCard label="Total Appointments" value={appointments.length} icon={CalendarDays} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Today's Appointments" value={todayCount} icon={CalendarCheck} color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={DollarSign} color="text-green-600" bg="bg-green-50" />
        <StatCard label="Unpaid Invoices" value={invoices.filter(i => i.status === 'unpaid').length} icon={TrendingUp} color="text-red-500" bg="bg-red-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Appointments per Month</h2>
          <p className="text-xs text-slate-400 mb-5">Last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="appointments" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Appointment Status</h2>
          <p className="text-xs text-slate-400 mb-5">All time breakdown</p>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent Appointments</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">No appointments yet.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(a.appointment_date).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{a.reason ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-600'}`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {recent.map((a) => (
                <div key={a.id} className="p-4 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-slate-700">Patient #{a.patient_id} · Dr. #{a.doctor_id}</p>
                    <p className="text-xs text-slate-400">{new Date(a.appointment_date).toLocaleString()}</p>
                    {a.reason && <p className="text-xs text-slate-400">{a.reason}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-600'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
