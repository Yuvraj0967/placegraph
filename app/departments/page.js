'use client';
import CrudPage from '@/components/CrudPage';

const columns = [
  { key: 'dept_id', label: 'ID' },
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Department' },
  { key: 'students', label: 'Students' },
];
const fields = [
  { name: 'code', label: 'Code (e.g. CSE)', required: true },
  { name: 'name', label: 'Department name', required: true },
];

export default function DepartmentsPage() {
  return (
    <CrudPage
      resource="departments" idKey="dept_id" singular="department" title="Departments"
      blurb="A department that still has students cannot be deleted (ON DELETE RESTRICT)."
      columns={columns} fields={fields} createLabel="Add department"
    />
  );
}
