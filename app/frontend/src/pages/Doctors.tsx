import { useEffect, useState } from 'react'
import { UserPlus, Pencil, Trash2, Search } from 'lucide-react'
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from '../api/doctors'
import type { Doctor } from '../types'
import Modal from '../components/Modal'

const EMPTY_FORM = { name: '', specialization: '', phone: '', email: '' }

const SPECIALIZATIONS = [
  'General Dentistry',
  'Orthodontics',
  'Periodontics',
  'Endodontics',
  'Oral Surgery',
  'Pediatric Dentistry',
  'Prosthodontics',
  'Cosmetic Dentistry',
]

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await getDoctors()
    setDoctors(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (d: Doctor) => {
    setEditing(d)
    setForm({
      name: d.name,
      specialization: d.specialization,
      phone: d.phone ?? '',
      email: d.email ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      specialization: form.specialization,
      phone: form.phone || null,
      email: form.email || null,
    }
    try {
      if (editing) {
        await updateDoctor(editing.id, payload)
      } else {
        await createDoctor(payload)
      }
      setShowModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this doctor?')) return
    await deleteDoctor(id)
    load()
  }

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Doctors</h1>
          <p className="text-slate-500 mt-0.5">{doctors.length} total doctors</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus size={16} />
          Add Doctor
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search doctors..."
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
            {search ? 'No doctors match your search.' : 'No doctors yet. Add one to get started.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Specialization</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Dr. {d.name}</p>
                        <p className="text-xs text-slate-400">ID #{d.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                      {d.specialization}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{d.phone ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{d.email ?? '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <Modal title={editing ? 'Edit Doctor' : 'Add Doctor'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name *">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="Jane Smith"
              />
            </Field>
            <Field label="Specialization *">
              <select
                required
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className={inputCls}
              >
                <option value="">Select specialization...</option>
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                  placeholder="+1 555 0000"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="dr@clinic.com"
                />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className={cancelBtn}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={submitBtn}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Doctor'}
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
