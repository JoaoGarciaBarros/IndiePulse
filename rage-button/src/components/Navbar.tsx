import { Link, useLocation } from 'react-router-dom'

export function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-black text-red-500 text-lg tracking-widest uppercase">
          <span className="text-2xl">💢</span>
          <span>RageTrigger</span>
        </Link>
        <div className="flex gap-1">
          <NavLink to="/" active={pathname === '/'} label="Botão" />
          <NavLink to="/dashboard" active={pathname.startsWith('/dashboard')} label="Dashboard" />
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      className={`px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${
        active
          ? 'bg-red-700 text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      }`}
    >
      {label}
    </Link>
  )
}
