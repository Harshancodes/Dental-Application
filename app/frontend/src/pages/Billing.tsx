import { useEffect, useState } from 'react'
import { Plus, Trash2, CheckCircle, Search, Download } from 'lucide-react'
import { getInvoices, createInvoice, markPaid, deleteInvoice } from '../api/billing'
import { getPatients } from '../api/patients'
import type { Invoice, Patient } from '../types'
import Modal from '../components/Modal'

const STATUS_STYLES: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700 border border-red-200',
  paid: 'bg-green-100 text-green-700 border border-green-200',
  overdue: 'bg-orange-100 text-orange-700 border border-orange-200',
}

const EMPTY_FORM = {
  patient_id: '',
  total_amount: '',
  status: 'unpaid',
  due_date: '',
  notes: '',
}

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [inv, pat] = await Promise.all([getInvoices(), getPatients()])
    setInvoices(inv.data)
    setPatients(pat.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const patientName = (id: number) => patients.find((p) => p.id === id)?.name ?? `#${id}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createInvoice({
        patient_id: Number(form.patient_id),
        appointment_id: null,
        total_amount: Number(form.total_amount),
        status: form.status,
        due_date: form.due_date || null,
        notes: form.notes || null,
      })
      setShowModal(false)
      setForm(EMPTY_FORM)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (id: number) => {
    await markPaid(id)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this invoice?')) return
    await deleteInvoice(id)
    load()
  }

  const handleDownloadPdf = (id: number) => {
    const token = localStorage.getItem('token')
    const url = `/api/billing/${id}/pdf`
    // Open in new tab — the browser will download it
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `INV-${String(id).padStart(4, '0')}.pdf`
        a.click()
      })
  }

  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
  const totalOutstanding = invoices.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.total_amount, 0)

  const filtered = invoices.filter((inv) => {
    const name = patientName(inv.patient_id).toLowerCase()
    const matchSearch = name.includes(search.toLowerCase())
    const matchStatus = statusFilter ? inv.status === statusFilter : true
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-slate-500 mt-0.5">
            Collected:{' '}
            <span className="font-semibold text-emerald-600">${totalRevenue.toFixed(2)}</span>
            {' · '}Outstanding:{' '}
            <span className="font-semibold text-red-500">${totalOutstanding.toFixed(2)}</span>
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'text-slate-800' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: 'text-emerald-600' },
          { label: 'Unpaid', value: invoices.filter(i => i.status === 'unpaid').length, color: 'text-red-500' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-slate-500 text-sm">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
        >
          <option value="">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No invoices found.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">INV-{String(inv.id).padStart(4, '0')}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{patientName(inv.patient_id)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">${inv.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {inv.due_date ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <CheckCircle size={13} />
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadPdf(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
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
        <Modal title="New Invoice" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Patient *">
              <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
                <option value="">Select patient...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Total Amount ($) *">
                <input
                  required type="number" min="0" step="0.01"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  className={inputCls}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </Field>
            </div>
            <Field label="Due Date">
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Notes">
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Payment notes..." />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className={cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} className={submitBtn}>
                {saving ? 'Creating...' : 'Create Invoice'}
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
