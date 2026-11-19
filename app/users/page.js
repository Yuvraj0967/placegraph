'use client';
import CrudPage from '@/components/CrudPage';

const filters = [{ name: 'role', label: 'Role', options: ['officer', 'student'] }];
const columns = [
  { key: 'user_id', label: 'ID' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (r) => <span className={`pill ${r.role === 'officer' ? 'violet' : 'neo'}`}>{r.role}</span> },
  { key: 'student_name', label: 'Linked student' },
];
const fields = [
  { name: 'username', label: 'Username', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Password (min 8; leave blank to keep when editing)', type: 'password' },
  { name: 'role', label: 'Role', type: 'select', choices: ['officer', 'student'], required: true },
  { name: 'student_id', label: 'Linked student (students only)', type: 'select', from: 'students', value: 'student_id', optionLabel: (o) => `${o.name} (${o.dept_code})` },
];

export default function UsersPage() {
  return (
    <CrudPage
      resource="users" idKey="user_id" singular="account" title="Users"
      blurb="Login accounts. Passwords are stored only as bcrypt hashes. A student account must be linked to a student record and an officer account must not be (a database trigger enforces this). You cannot delete yourself or the last officer."
      columns={columns} fields={fields} createLabel="Add account" searchable filters={filters}
    />
  );
}
