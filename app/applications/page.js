'use client';
import CrudPage from '@/components/CrudPage';

const pill = { APPLIED: 'neo', SHORTLISTED: 'violet', INTERVIEW: 'violet', OFFERED: 'warn', ACCEPTED: 'ok', REJECTED: 'bad', WITHDRAWN: 'bad' };

const filters = [{ name: 'status', label: 'Status', options: Object.keys(pill) }];
const columns = [
  { key: 'application_id', label: 'ID' },
  { key: 'student_name', label: 'Student' },
  { key: 'cgpa', label: 'CGPA' },
  { key: 'job_title', label: 'Role' },
  { key: 'company_name', label: 'Company' },
  { key: 'package_lpa', label: 'LPA' },
  { key: 'applied_on', label: 'Applied' },
  { key: 'rounds', label: 'Rounds' },
  { key: 'status', label: 'Status', render: (r) => <span className={`pill ${pill[r.status]}`}>{r.status}</span> },
];

const fields = [
  { name: 'student_id', label: 'Student', type: 'select', officerOnly: true, from: 'students', value: 'student_id', optionLabel: (o) => `${o.name} (CGPA ${o.cgpa}${o.is_placed ? ', placed' : ''})`, required: true },
  { name: 'job_id', label: 'Job', type: 'select', from: 'jobs', value: 'job_id', optionLabel: (o) => `${o.title} @ ${o.company_name} (min ${o.min_cgpa})`, required: true },
];

const rowActions = [
  { label: 'Shortlist', body: { action: 'shortlist' }, show: (r) => r.status === 'APPLIED', message: 'Shortlisted (sp_update_application_status ran)' },
  { label: 'Make offer', body: { action: 'offer' }, show: (r) => r.status === 'INTERVIEW', message: 'Offer made (sp_update_application_status ran)' },
  { label: 'Accept offer', body: { action: 'accept' }, show: (r) => r.status === 'OFFERED', message: 'Offer accepted: sp_accept_offer ran, the trigger created the placement' },
  { label: 'Reject', body: { action: 'reject' }, show: (r) => ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'].includes(r.status), message: 'Application rejected' },
];

export default function ApplicationsPage() {
  return (
    <CrudPage
      resource="applications" idKey="application_id" singular="application" title="Applications"
      blurb="Apply → CALL sp_apply (eligibility trigger checks CGPA, deadline, openings). Row buttons call the status procedures; accepting an offer makes a trigger create the placement. Neo4j gets an APPLIED_TO edge."
      columns={columns} fields={fields} canEdit={false} rowActions={rowActions} createLabel="New application" searchable filters={filters} studentCanCreate
    />
  );
}
