'use client';
import CrudPage from '@/components/CrudPage';

const filters = [{ name: 'placed', label: 'Status', options: [{ value: '1', label: 'Placed' }, { value: '0', label: 'Unplaced' }] }];
const columns = [
  { key: 'student_id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'dept_code', label: 'Dept' },
  { key: 'cgpa', label: 'CGPA' },
  { key: 'grad_year', label: 'Batch' },
  { key: 'skills', label: 'Skills' },
  { key: 'applications', label: 'Applications' },
  { key: 'is_placed', label: 'Status', render: (r) => (r.is_placed ? <span className="pill ok">Placed</span> : <span className="pill warn">Unplaced</span>) },
];

const fields = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'dept_id', label: 'Department', type: 'select', from: 'departments', value: 'dept_id', optionLabel: (o) => `${o.code} - ${o.name}`, required: true },
  { name: 'cgpa', label: 'CGPA (0-10)', type: 'number', step: '0.01', min: 0, max: 10, required: true },
  { name: 'grad_year', label: 'Graduation year', type: 'number', min: 2000, max: 2100, default: 2026, required: true },
  { name: 'skill_ids', label: 'Skills', type: 'multi', from: 'skills', value: 'skill_id', optionLabel: (o) => o.name },
];

export default function StudentsPage() {
  return (
    <CrudPage
      resource="students" idKey="student_id" singular="student" title="Students"
      blurb="students + student_skills in MySQL (audit triggers on every change); mirrored to Neo4j as (:Student) with IN_DEPT and HAS_SKILL edges."
      columns={columns} fields={fields} createLabel="Add student" searchable filters={filters}
    />
  );
}
