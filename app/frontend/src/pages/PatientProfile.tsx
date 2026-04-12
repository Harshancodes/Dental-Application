import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, CalendarDays, Phone, Mail, MapPin, ClipboardList,
  Stethoscope, Receipt, Clock, Download, AlertCircle,
} from 'lucide-react'
import client from '../api/client'
import { getTreatments } from '../api/treatments'
import { getInvoices } from '../api/billing'
import type { Patient, Appointment, Treatment, Invoice, Doctor } from '../types'

const STATUS_APPT: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
const STATUS_INV: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-orange-100 text-orange-700',
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const patientId = Number(id)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'appointments' | 'treatments' | 'billing'>('appointments')

  useEffect(() => {
    Promise.all([
      client.get<Patient>(`/patients/${patientId}`),
      client.get<Appointment[]>(`/appointments/?patient_id=${patientId}&limit=100`),
      getTreatments({ patient_id: patientId }),
      getInvoices({ patient_id: patientId }),
      client.get<Doctor[]>('/doctors/'),
    ]).then(([pat, appts, treats, invs, docs]) => {
      setPatient(pat.data)
      setAppointments(appts.data.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()))
      setTreatments(treats.data)
      setInvoices(invs.data)
      setDoctors(docs.data)
      setLoading(false)
    })
  }, [patientId])

  const doctorName = (id: number) => doctors.find(d => d.id === id)?.name ?? `Doctor #${id}`

  const handleDownloadPdf = (invoiceId: number) => {
    const token = localStorage.getItem('token')
    fetch(`/api/billing/${invoiceId}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `INV-${String(invoiceId).padStart(4, '0')}.pdf`
        a.click()
      })
  }

  const totalSpend = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total_amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-20 text-slate-400">
        <AlertCircle size={40} className="mx-auto mb-3 opacity-40" />
        <p>Patient not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Patient header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0">
              {patient.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
              <p className="text-slate-400 text-sm mt-0.5">Patient ID #{patient.id}</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {patient.date_of_birth && <InfoItem icon={CalendarDays} label="Date of Birth" value={patient.date_of_birth} />}
                {patient.phone && <InfoItem icon={Phone} label="Phone" value={patient.phone} />}
                {patient.email && <InfoItem icon={Mail} label="Email" value={patient.email} />}
                {patient.address && <InfoItem icon={MapPin} label="Address" value={patient.address} />}
              </div>
            </div>
          </div>
          {/* Quick stats */}
          <div className="flex gap-3 text-center sm:shrink-0">
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-xl font-bold text-slate-800">{appointments.length}</p>
              <p className="text-xs text-slate-400">Visits</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-xl font-bold text-emerald-600">${totalSpend.toFixed(0)}</p>
              <p className="text-xs text-slate-400">Paid</p>
            </div>
            {outstanding > 0 && (
              <div className="bg-red-50 rounded-xl px-3 py-2">
                <p className="text-xl font-bold text-red-600">${outstanding.toFixed(0)}</p>
                <p className="text-xs text-red-400">Owing</p>
              </div>
            )}
          </div>
        </div>

        {/* Medical history */}
        {patient.medical_history && (
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <ClipboardList size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Medical History / Conditions</p>
              <p className="text-sm text-amber-800">{patient.medical_history}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['appointments', 'treatments', 'billing'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'appointments' && `Appointments (${appointments.length})`}
            {tab === 'treatments' && `Treatments (${treatments.length})`}
            {tab === 'billing' && `Invoices (${invoices.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {appointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No appointments yet.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Doctor</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {appointments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" />{new Date(a.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-700">Dr. {doctorName(a.doctor_id)}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">{a.reason ?? '—'}</td>
                        <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_APPT[a.status]}`}>{a.status}</span></td>
                        <td className="px-5 py-3 text-sm text-slate-400 italic">{a.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-100">
                {appointments.map(a => (
                  <div key={a.id} className="p-4 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{new Date(a.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        <p className="text-xs text-slate-500">Dr. {doctorName(a.doctor_id)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_APPT[a.status]}`}>{a.status}</span>
                    </div>
                    {a.reason && <p className="text-xs text-slate-400">{a.reason}</p>}
                    {a.notes && <p className="text-xs text-slate-400 italic">"{a.notes}"</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'treatments' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {treatments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No treatments recorded yet.</div>
          ) : (
            <>
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Treatment History</span>
                <span className="text-sm font-semibold text-slate-700">
                  Total: ${treatments.reduce((s, t) => s + t.cost, 0).toFixed(2)}
                </span>
              </div>
              <table className="w-full">
                <thead className="border-b border-slate-100">
                  <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Procedure</th>
                    <th className="px-5 py-3">Tooth #</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Cost</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {treatments.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <Stethoscope size={13} className="text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-800">{t.procedure_type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">{t.tooth_number ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{t.description ?? '—'}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">${t.cost.toFixed(2)}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No invoices yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Paid At</th>
                  <th className="px-5 py-3">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Receipt size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">INV-{String(inv.id).padStart(4, '0')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-800">${inv.total_amount.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_INV[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{inv.due_date ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDownloadPdf(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  )
}
