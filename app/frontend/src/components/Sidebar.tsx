import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Stethoscope, CalendarDays, User, UserCog, Syringe, Receipt, LogOut, CalendarRange, X } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'

const adminNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/doctors', icon: Stethoscope, label: 'Doctors' },
  { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
  { to: '/calendar', icon: CalendarRange, label: 'Calendar' },
  { to: '/treatments', icon: Syringe, label: 'Treatments' },
  { to: '/billing', icon: Receipt, label: 'Billing' },
]

const portalNav = [
  { to: '/patient-portal', icon: User, label: 'Patient Portal' },
  { to: '/doctor-portal', icon: UserCog, label: 'Doctor Portal' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <aside
      className={clsx(
        'w-64 bg-slate-900 flex flex-col shrink-0 z-50',
        // Desktop: always visible, static
        'md:relative md:translate-x-0',
        // Mobile: fixed drawer, slides in/out
        'fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Stethoscope size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Dental Clinic</p>
            <p className="text-slate-400 text-xs">Management System</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {user?.role === 'admin' && (
          <>
            <div>
              <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-widest">Admin</p>
              <div className="space-y-1">
                {adminNav.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
                    <Icon size={18} />{label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div>
              <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-widest">Portals</p>
              <div className="space-y-1">
                {portalNav.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
                    <Icon size={18} />{label}
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}

        {user?.role === 'doctor' && (
          <div>
            <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-widest">My Portal</p>
            <div className="space-y-1">
              <NavLink to="/doctor-portal" onClick={onClose} className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
                <UserCog size={18} />My Schedule
              </NavLink>
            </div>
          </div>
        )}

        {user?.role === 'patient' && (
          <div>
            <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-widest">My Portal</p>
            <div className="space-y-1">
              <NavLink to="/patient-portal" onClick={onClose} className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
                <User size={18} />My Appointments
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.username?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.username ?? 'Admin'}</p>
            <p className="text-slate-500 text-xs capitalize">{user?.role ?? 'admin'}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
