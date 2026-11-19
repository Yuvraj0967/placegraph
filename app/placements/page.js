'use client';
import CrudPage from '@/components/CrudPage';

const fields = [];
const columns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'student_name', label: 'Student' },
  { key: 'dept_code', label: 'Dept' },
  { key: 'company_name', label: 'Company' },
  { key: 'job_title', label: 'Role' },
  { key: 'package_lpa', label: 'Package (LPA)' },
  { key: 'placed_on', label: 'Placed on' },
  { key: 'application_id', label: 'Application' },
];

export default function PlacementsPage() {
  return (
    <CrudPage
      resource="placements" idKey="student_id" singular="placement" title="Placements"
      blurb="Read-only on purpose: a row appears here only when a trigger fires after an offer is accepted (Applications page, or the Trigger Lab)."
      columns={columns} fields={fields} canCreate={false} canEdit={false} canDelete={false} searchable
    />
  );
}
