import { useEffect, useRef, useState } from 'react'
import { CalendarDays, User, Phone, Mail, MapPin, ClipboardList, Clock, XCircle, Bot, Send, Sparkles, X, Paperclip, Trash2, FileText, Upload } from 'lucide-react'
import { getPatients } from '../api/patients'
import { cancelAppointment } from '../api/appointments'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
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

// ── Patient AI Chat ──────────────────────────────────────────────────────────

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function PatientAiChat({ patientId }: { patientId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setError(null)
    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages(newHistory)
    setLoading(true)
    try {
      const { data } = await client.post('/ai/ask', {
        patient_id: patientId,
        question,
        conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
      })
      setMessages([...newHistory, { role: 'assistant', content: data.answer }])
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    setError(null)
    setMessages([])
    setLoading(true)
    try {
      const { data } = await client.get(`/ai/summary/${patientId}`)
      setMessages([{ role: 'assistant', content: `**Your health summary**\n\n${data.summary}` }])
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to load summary.')
    } finally {
      setLoading(false)
    }
  }

  const formatContent = (text: string) =>
    text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n- /g, '\n• ').replace(/\n/g, '<br />')

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">AI Health Assistant</h3>
          <p className="text-white/70 text-xs">Ask questions about your appointments or health records</p>
        </div>
        <button onClick={loadSummary} disabled={loading} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
          <Sparkles size={13} />
          {loading && messages.length === 0 ? 'Loading…' : 'My Summary'}
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="h-56 overflow-y-auto rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-3 flex flex-col">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Bot size={24} className="opacity-40" />
              <p className="text-sm">Ask a question or tap <strong>My Summary</strong> for an overview of your health records.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2"><Bot size={12} className="text-blue-600" /></div>}
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'}`}
                dangerouslySetInnerHTML={{ __html: formatContent(m.content) }} />
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2"><Bot size={12} className="text-blue-600" /></div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" /><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" /><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" /></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm"><span className="flex-1">{error}</span><button onClick={() => setError(null)}><X size={13} /></button></div>}
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} disabled={loading} placeholder="Ask about your appointments, treatments…" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" />
          <button onClick={sendMessage} disabled={!input.trim() || loading} className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"><Send size={14} /></button>
        </div>
        {messages.length > 0 && <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-slate-600">Clear conversation</button>}
      </div>
    </div>
  )
}

// ── File Uploads ─────────────────────────────────────────────────────────────

interface FileInfo { name: string; size: number; url: string }

function PatientFiles({ patientId }: { patientId: number }) {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const { data } = await client.get<FileInfo[]>(`/uploads/patients/${patientId}`)
    setFiles(data)
  }

  useEffect(() => { load() }, [patientId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      await client.post(`/uploads/patients/${patientId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      load()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return
    await client.delete(`/uploads/patients/${patientId}/${name}`)
    load()
  }

  const handleDownload = (f: FileInfo) => {
    const token = localStorage.getItem('token')
    fetch(`/api${f.url}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = f.name
        a.click()
      })
  }

  const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-slate-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Documents & Files</h3>
        </div>
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
          <Upload size={13} />
          {uploading ? 'Uploading…' : 'Upload'}
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
      {files.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No files uploaded yet. Upload X-rays, prescriptions, or documents.</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText size={15} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                <p className="text-xs text-slate-400">{formatSize(f.size)}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDownload(f)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><FileText size={14} /></button>
                <button onClick={() => handleDelete(f.name)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PatientPortal() {
  const { user } = useAuth()
  const isPatientRole = user?.role === 'patient' && user?.patient_id != null

  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isPatientRole) {
      setLoading(true)
      Promise.all([
        getPatients(),
        client.get<Appointment[]>(`/appointments/?patient_id=${user!.patient_id}`),
      ]).then(([allPatients, appts]) => {
        const me = allPatients.data.find(p => p.id === user!.patient_id) ?? null
        setPatients(allPatients.data)
        setSelected(me)
        setAppointments(appts.data.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()))
        setLoading(false)
      })
    } else {
      getPatients().then(({ data }) => setPatients(data))
    }
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
        <p className="text-slate-500">Your appointments, files, and AI health assistant.</p>
      </div>

      {!isPatientRole && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">Select Patient</label>
          <select onChange={(e) => handleSelect(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white">
            <option value="">— Choose your name —</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

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
            {selected.date_of_birth && <InfoRow icon={CalendarDays} label="Date of Birth" value={selected.date_of_birth} />}
            {selected.phone && <InfoRow icon={Phone} label="Phone" value={selected.phone} />}
            {selected.email && <InfoRow icon={Mail} label="Email" value={selected.email} />}
            {selected.address && <InfoRow icon={MapPin} label="Address" value={selected.address} />}
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

      {selected && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming Appointments ({upcoming.length})</h3>
                {upcoming.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">No upcoming appointments.</div>
                ) : (
                  <div className="space-y-3">{upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} onCancel={() => handleCancel(a.id)} />)}</div>
                )}
              </section>
              {past.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Past Appointments ({past.length})</h3>
                  <div className="space-y-3">{past.map((a) => <AppointmentCard key={a.id} appointment={a} />)}</div>
                </section>
              )}
            </>
          )}

          {/* Files */}
          <PatientFiles patientId={selected.id} />

          {/* AI Chat */}
          <PatientAiChat patientId={selected.id} />
        </>
      )}
    </div>
  )
}

function AppointmentCard({ appointment: a, onCancel }: { appointment: Appointment; onCancel?: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg shrink-0">{STATUS_ICONS[a.status] ?? '?'}</div>
        <div>
          <p className="font-medium text-slate-800">{a.reason ?? 'Appointment'}</p>
          <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-sm"><Clock size={13} />{new Date(a.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
          {a.notes && <p className="mt-2 text-sm text-slate-500 italic">"{a.notes}"</p>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[a.status]}`}>{a.status}</span>
        {onCancel && a.status === 'scheduled' && (
          <button onClick={onCancel} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
            <XCircle size={13} />Cancel
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
      <div><p className="text-xs text-slate-400">{label}</p><p className="text-sm text-slate-700">{value}</p></div>
    </div>
  )
}
