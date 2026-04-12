import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Stethoscope, Calendar, User, Bot, Send, Sparkles, X } from 'lucide-react'
import { getDoctors } from '../api/doctors'
import { getPatients } from '../api/patients'
import { updateAppointment } from '../api/appointments'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Doctor, Patient, Appointment } from '../types'
import SearchableSelect from '../components/SearchableSelect'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

// ── AI Chat ────────────────────────────────────────────────────────────────────

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function AiAssistant({ patients }: { patients: Patient[] }) {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim() || !selectedPatientId || loading) return
    const question = input.trim()
    setInput('')
    setError(null)

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages(newHistory)
    setLoading(true)

    try {
      const { data } = await client.post('/ai/ask', {
        patient_id: selectedPatientId,
        question,
        conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
      })
      setMessages([...newHistory, { role: 'assistant', content: data.answer }])
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Something went wrong. Check that ANTHROPIC_API_KEY is set.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    if (!selectedPatientId || summaryLoading) return
    setError(null)
    setSummaryLoading(true)
    setMessages([])

    try {
      const { data } = await client.get(`/ai/summary/${selectedPatientId}`)
      setMessages([
        {
          role: 'assistant',
          content: `**Pre-appointment briefing for ${data.patient_name}**\n\n${data.summary}`,
        },
      ])
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to load summary.'
      setError(msg)
    } finally {
      setSummaryLoading(false)
    }
  }

  const handlePatientChange = (id: string) => {
    setSelectedPatientId(id ? Number(id) : null)
    setMessages([])
    setError(null)
  }

  const formatContent = (text: string) => {
    // Simple markdown-like rendering for bold and bullets
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n- /g, '\n• ')
      .replace(/\n/g, '<br />')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">AI Clinical Assistant</h3>
            <p className="text-white/70 text-xs">Powered by Claude · Ask anything about your patient</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Patient picker + Summary button */}
        <div className="flex gap-2">
          <select
            value={selectedPatientId ?? ''}
            onChange={e => handlePatientChange(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 bg-white"
          >
            <option value="">— Select a patient —</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={loadSummary}
            disabled={!selectedPatientId || summaryLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed text-violet-700 rounded-xl text-sm font-medium transition-colors"
          >
            <Sparkles size={14} />
            {summaryLoading ? 'Loading…' : 'Brief me'}
          </button>
        </div>

        {/* Chat window */}
        <div className="h-72 overflow-y-auto rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-3 flex flex-col">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Bot size={28} className="opacity-40" />
              <p className="text-sm">Select a patient and ask a question, or click <strong>Brief me</strong> for a pre-appointment summary.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2">
                  <Bot size={12} className="text-violet-600" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                }`}
                dangerouslySetInnerHTML={{ __html: formatContent(m.content) }}
              />
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2">
                <Bot size={12} className="text-violet-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={!selectedPatientId || loading}
            placeholder={selectedPatientId ? 'Ask about this patient…' : 'Select a patient first'}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !selectedPatientId || loading}
            className="w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Send size={15} />
          </button>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DoctorPortal() {
  const { user } = useAuth()
  const isDoctorRole = user?.role === 'doctor' && user?.doctor_id != null

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [notesModal, setNotesModal] = useState<{ id: number; notes: string } | null>(null)

  useEffect(() => {
    if (isDoctorRole) {
      setLoading(true)
      Promise.all([
        getDoctors(),
        getPatients(),
        client.get<Appointment[]>(`/appointments/?doctor_id=${user!.doctor_id}`),
      ]).then(([allDoctors, allPatients, appts]) => {
        const me = allDoctors.data.find(d => d.id === user!.doctor_id) ?? null
        setDoctors(allDoctors.data)
        setPatients(allPatients.data)
        setSelected(me)
        setAppointments(appts.data.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()))
        setLoading(false)
      })
    } else {
      getDoctors().then(({ data }) => setDoctors(data))
      getPatients().then(({ data }) => setPatients(data))
    }
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
        <p className="text-slate-500">View your schedule, manage appointments, and use your AI assistant.</p>
      </div>

      {/* Doctor Selector — hidden when logged in as doctor */}
      {!isDoctorRole && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">Select Doctor</label>
          <SearchableSelect
            options={doctors.map(d => ({ value: d.id, label: `Dr. ${d.name} — ${d.specialization}` }))}
            value={selected?.id ?? ''}
            onChange={handleSelect}
            placeholder="Search doctors..."
          />
        </div>
      )}

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
                              <Link to={`/patients/${a.patient_id}`} className="hover:text-blue-600 transition-colors">
                                {patientName(a.patient_id)}
                              </Link>
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
                          <td className="px-5 py-3 text-sm font-medium text-slate-700">
                            <Link to={`/patients/${a.patient_id}`} className="hover:text-blue-600 transition-colors">
                              {patientName(a.patient_id)}
                            </Link>
                          </td>
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

      {/* AI Assistant — always visible */}
      <AiAssistant patients={patients} />

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
            <Link to={`/patients/${a.patient_id}`} className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors">
              {patientName}
            </Link>
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
