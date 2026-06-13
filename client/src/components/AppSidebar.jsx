import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import { Kanban, Calendar, FileText, BarChart2, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/pipeline', label: 'Pipeline', Icon: Kanban },
  { path: '/interviews', label: 'Interviews', Icon: Calendar, soon: true },
  { path: '/resumes', label: 'Resumes', Icon: FileText, soon: true },
  { path: '/analytics', label: 'Analytics', Icon: BarChart2, soon: true },
]

export default function AppSidebar({ onSignOut }) {
  const location = useLocation()

  return (
    <div className="w-[220px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-40">
      {/* Logo */}
      <div className="px-4 h-[60px] flex items-center gap-2.5 border-b border-slate-100 shrink-0">
        <Logo size={26} />
        <span className="font-bold text-[15px] text-slate-900">InterviewerOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        {NAV_ITEMS.map(({ path, label, Icon, soon }) => {
          if (soon) {
            return (
              <div
                key={path}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-[13px] font-medium text-slate-300 cursor-default select-none"
              >
                <Icon size={15} className="text-slate-300 shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] text-slate-300 font-medium">Soon</span>
              </div>
            )
          }
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-[13px] font-medium transition-colors no-underline ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={15} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-slate-100 shrink-0">
        <button
          onClick={onSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer"
        >
          <LogOut size={14} className="text-slate-400 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}
