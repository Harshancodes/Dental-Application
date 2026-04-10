import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { getTreatments, createTreatment, updateTreatment, deleteTreatment } from '../api/treatments'
import { getAppointments } from '../api/appointments'
import type { Treatment, Appointment } from '../types'
import Modal from '../components/Modal'

const PROCEDURES = [
  'Teeth Cleaning', 'X-Ray', 'Filling', 'Root Canal', 'Extraction',
  'Crown', 'Bridge', 'Denture Adjustment', 'Wire Adjustment',
  'Retainer Fitting', 'Whitening', 'Scaling', 'Bone Graft', 'Implant',
]

const EMPTY_FORM = {
  appointment_id: '',
  procedure_type: '',
  tooth_number: '',
  description: '',
  cost: '',
}

export default function Treatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Treatment | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [t, a] = await Promise.all([getTreatments(), getAppointments()])
    setTreatments(t.data)
    setAppointments(a.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (t: Treatment) => {
    setEditing(t)
    setForm({
      appointment_id: String(t.appointment_id),
      procedure_type: t.procedure_type,
      tooth_number: t.tooth_number != null ? String(t.tooth_number) : '',
      description: t.description ?? '',
      cost: String(t.cost),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      appointment_id: Number(form.appointment_id),
      procedure_type: form.procedure_type,
      tooth_number: form.tooth_number ? Number(form.tooth_number) : null,
      description: form.description || null,
      cost: Number(form.cost),
    }
    try {
      if (editing) {
        await updateTreatment(editing.id, payload)
      } else {
        await createTreatment(payload)
      }
      setShowModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this treatment?')) return
    await deleteTreatment(id)
    load()
  }

  const totalRevenue = treatments.reduce((sum, t) => sum + t.cost, 0)

  const filtered = treatments.filter((t) =>
    t.procedure_type.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Treatments</h1>
          <p className="text-slate-500 mt-0.5">
            {treatments.length} procedures · Total revenue:{' '}
            <span className="font-semibold text-emerald-600">${totalRevenue.toFixed(2)}</span>
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Treatment
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search procedures..."
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
          <div className="text-center py-16 text-slate-400">No treatments found.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">Procedure</th>
                <th className="px-6 py-3">Appointment</th>
                <th className="px-6 py-3">Tooth #</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Cost</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      {t.procedure_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">Appt #{t.appointment_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {t.tooth_number != null ? `#${t.tooth_number}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                    {t.description ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                    ${t.cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
        <Modal title={editing ? 'Edit Treatment' : 'Add Treatment'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Appointment *">
              <select required value={form.appointment_id} onChange={(e) => setForm({ ...form, appointment_id: e.target.value })} className={inputCls}>
                <option value="">Select appointment...</option>
                {appointments.filter(a => a.status !== 'cancelled').map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} — {new Date(a.appointment_date).toLocaleDateString()} — {a.reason ?? 'Appointment'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Procedure Type *">
              <select required value={form.procedure_type} onChange={(e) => setForm({ ...form, procedure_type: e.target.value })} className={inputCls}>
                <option value="">Select procedure...</option>
                {PROCEDURES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tooth Number (1–32)">
                <input
                  type="number" min="1" max="32"
                  value={form.tooth_number}
                  onChange={(e) => setForm({ ...form, tooth_number: e.target.value })}
                  className={inputCls}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Cost ($) *">
                <input
                  required type="number" min="0" step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className={inputCls}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
                placeholder="Clinical notes..."
              />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className={cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} className={submitBtn}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Treatment'}
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

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800'
const submitBtn = 'flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors'
const cancelBtn = 'flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition-colors'
