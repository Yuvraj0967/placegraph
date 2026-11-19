'use client';
import CrudPage from '@/components/CrudPage';

const columns = [
  { key: 'job_id', label: 'ID' },
  { key: 'title', label: 'Role' },
  { key: 'company_name', label: 'Company' },
  { key: 'package_lpa', label: 'Package (LPA)' },
  { key: 'min_cgpa', label: 'Min CGPA' },
  { key: 'openings', label: 'Openings' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'skills', label: 'Required skills' },
  { key: 'applications', label: 'Applications' },
  {
    key: 'state', label: 'State',
    render: (r) => (r.expired ? <span className="pill bad">Closed</span> : r.openings <= 0 ? <span className="pill warn">Filled</span> : <span className="pill ok">Open</span>),
  },
];

const fields = [
  { name: 'company_id', label: 'Company', type: 'select', from: 'companies', value: 'company_id', optionLabel: (o) => o.name, required: true },
  { name: 'title', label: 'Role / title', required: true },
  { name: 'package_lpa', label: 'Package (LPA)', type: 'number', step: '0.01', min: 0.01, required: true },
  { name: 'min_cgpa', label: 'Minimum CGPA', type: 'number', step: '0.01', min: 0, max: 10, default: 0 },
  { name: 'openings', label: 'Openings', type: 'number', min: 0, default: 1 },
  { name: 'deadline', label: 'Application deadline', type: 'date', required: true },
  { name: 'skill_ids', label: 'Required skills', type: 'multi', from: 'skills', value: 'skill_id', optionLabel: (o) => o.name },
];

export default function JobsPage() {
  return (
    <CrudPage
      resource="jobs" idKey="job_id" singular="job posting" title="Job postings"
      blurb="jobs + job_skills in MySQL; mirrored to Neo4j as (:Job) with POSTED and REQUIRES edges. Openings are reduced automatically by a trigger when an offer is accepted."
      columns={columns} fields={fields} createLabel="Add job posting" searchable
    />
  );
}
