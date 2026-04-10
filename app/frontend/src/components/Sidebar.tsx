import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Stethoscope, CalendarDays } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/doctors', icon: Stethoscope, label: 'Doctors' },
  { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <Stethoscope size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Dental Clinic</p>
          <p className="text-slate-400 text-xs">Management System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-slate-500 text-xs">v1.0.0</p>
      </div>
    </aside>
  )
}
