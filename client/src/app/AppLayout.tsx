import { format } from 'date-fns'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Breadcrumbs } from './Breadcrumbs'
import { Icon, type IconName } from '../shared/components/Icon'
import { initialsOf } from '../shared/utils/initials'
import { useAuth } from '../features/auth/AuthContext'
import { usePendingEvents } from '../features/events/useEventActions'
import './AppLayout.css'

interface SideLinkProps {
  to: string
  icon: IconName
  label: string
  badge?: number
}

function SideLink({ to, icon, label, badge }: SideLinkProps) {
  const hasBadge = badge !== undefined && badge > 0
  return (
    <NavLink to={to} end={to === '/'} className={`side-link${hasBadge ? ' has-badge' : ''}`}>
      <Icon name={icon} />
      <span>{label}</span> {/* the space keeps the link's name "Approvals 3", not "Approvals3" */}
      {hasBadge && <b>{badge}</b>}
    </NavLink>
  )
}

/**
 * Sidebar, breadcrumb bar and page content for every signed-in page. Page actions (like New event) live in
 * each page's heading.
 */
export function AppLayout() {
  const { user, signOut } = useAuth()
  const isApprover = user?.isApprover ?? false
  const { data: pending } = usePendingEvents({ enabled: isApprover })
  const [today] = useState(() => new Date()) // read the clock once, not on every render

  return (
    <div className="app-shell">
      <nav className="sidebar" aria-label="Main">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Icon name="calendar" size={20} />
          </span>
          <span className="brand-text">
            <strong>School Name</strong>
            <span>School calendar</span>
          </span>
        </Link>

        <p className="nav-label">Workspace</p>
        <div className="side-links">
          <SideLink to="/" icon="calendar" label="Calendar" />
          {isApprover && (
            <>
              <SideLink to="/approvals" icon="check" label="Approvals" badge={pending?.length} />
              <SideLink to="/events" icon="list" label="Events" />
              <SideLink to="/users" icon="people" label="Users" />
            </>
          )}
        </div>

        <div className="profile">
          <span className="avatar" aria-hidden="true">
            {user ? initialsOf(user.displayName) : ''}
          </span>
          <div className="profile-text">
            <strong>{user?.displayName}</strong>
            <span>{isApprover ? 'Approver' : 'User'}</span>
          </div>
          <button type="button" className="sign-out" onClick={signOut} aria-label="Sign out" title="Sign out">
            <Icon name="logout" size={17} />
          </button>
        </div>
      </nav>

      <main className="app-main">
        <header className="topbar">
          <Breadcrumbs />
          <p className="topbar-date">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
