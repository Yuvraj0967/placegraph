'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './Auth';

const OFFICER = [
  ['/', 'Dashboard'], ['/students', 'Students'], ['/companies', 'Companies'], ['/jobs', 'Jobs'],
  ['/applications', 'Applications'], ['/interviews', 'Interviews'], ['/placements', 'Placements'],
  ['/skills', 'Skills'], ['/departments', 'Departments'], ['/graph', 'Graph'], ['/queries', 'Queries'],
  ['/lab', 'Trigger Lab'], ['/inspector', 'DB Inspector'],
];
const STUDENT = [
  ['/', 'My dashboard'], ['/jobs', 'Jobs'], ['/companies', 'Companies'], ['/applications', 'My applications'],
  ['/interviews', 'My interviews'], ['/placements', 'My placement'], ['/graph', 'Job matches'],
];

export default function Nav() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const links = user.role === 'officer' ? OFFICER : STUDENT;
  return (
    <nav className="top">
      <span className="logo">🎓 PlaceGraph</span>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className={'link' + (path === href ? ' active' : '')}>{label}</Link>
      ))}
      <span className="right muted" style={{ fontSize: 13 }}>
        {user.email} <span className={`pill ${user.role === 'officer' ? 'violet' : 'neo'}`}>{user.role}</span>{' '}
        <button onClick={logout}>Sign out</button>
      </span>
    </nav>
  );
}
