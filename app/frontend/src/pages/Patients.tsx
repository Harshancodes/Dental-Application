import { useEffect, useState } from 'react'
import { UserPlus, Pencil, Trash2, Search } from 'lucide-react'
import { getPatients, createPatient, updatePatient, deletePatient } from '../api/patients'
import type { Patient } from '../types'
import Modal from '../components/Modal'

const EMPTY_FORM = {
  name: '',
  date_of_birth: '',
  phone: '',
  email: '',
  address: '',
  medical_history: '',
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await getPatients()
    setPatients(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (p: Patient) => {
    setEditing(p)
    setForm({
      name: p.name,
      date_of_birth: p.date_of_birth ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      medical_history: p.medical_history ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      date_of_birth: form.date_of_birth || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      medical_history: form.medical_history || null,
    }
    try {
      if (editing) {
        await updatePatient(editing.id, payload)
      } else {
        await createPatient(payload)
      }
      setShowModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this patient? This cannot be undone.')) return
    await deletePatient(id)
    load()
  }

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
          <p className="text-slate-500 mt-0.5">{patients.length} total patients</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus size={16} />
          Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {search ? 'No patients match your search.' : 'No patients yet. Add one to get started.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Date of Birth</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">ID #{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.date_of_birth ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.phone ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.email ?? '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Patient' : 'Add Patient'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name *">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="John Doe"
              />
            </Field>
            <Field label="Date of Birth">
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className={inputCls}
              />
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
                  placeholder="john@example.com"
                />
              </Field>
            </div>
            <Field label="Address">
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputCls}
                placeholder="123 Main St, City"
              />
            </Field>
            <Field label="Medical History">
              <textarea
                rows={3}
                value={form.medical_history}
                onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
                className={inputCls}
                placeholder="Allergies, conditions, medications..."
              />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className={cancelBtn}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={submitBtn}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Patient'}
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
