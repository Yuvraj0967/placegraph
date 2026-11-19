'use client';
import CrudPage from '@/components/CrudPage';

const pill = { PENDING: 'warn', PASSED: 'ok', FAILED: 'bad' };
const today = () => new Date().toISOString().slice(0, 10);

const filters = [{ name: 'result', label: 'Result', options: ['PENDING', 'PASSED', 'FAILED'] }];
const columns = [
  { key: 'key', label: 'Round id' },
  { key: 'student_name', label: 'Student' },
  { key: 'job_title', label: 'Role' },
  { key: 'company_name', label: 'Company' },
  { key: 'round_no', label: 'Round #' },
  { key: 'round_type', label: 'Type' },
  { key: 'scheduled_on', label: 'Scheduled' },
  { key: 'application_status', label: 'Application' },
  { key: 'result', label: 'Result', render: (r) => <span className={`pill ${pill[r.result]}`}>{r.result}</span> },
];

const fields = [
  {
    name: 'application_id', label: 'Application (shortlisted / interviewing)', type: 'select', from: 'applications', value: 'application_id',
    filter: (o) => ['SHORTLISTED', 'INTERVIEW'].includes(o.status),
    optionLabel: (o) => `#${o.application_id} ${o.student_name} - ${o.job_title} @ ${o.company_name} [${o.status}]`, required: true,
  },
  { name: 'round_type', label: 'Round type', type: 'select', choices: ['APTITUDE', 'TECHNICAL', 'HR'], required: true },
  { name: 'scheduled_on', label: 'Date', type: 'date', default: today(), required: true },
];

const rowActions = [
  { label: 'Mark PASSED', body: { result: 'PASSED' }, show: (r) => r.result === 'PENDING', message: 'Round marked PASSED (sp_set_round_result ran)' },
  { label: 'Mark FAILED', body: { result: 'FAILED' }, show: (r) => r.result === 'PENDING', message: 'Round marked FAILED: the trigger rejected the application' },
];

export default function InterviewsPage() {
  return (
    <CrudPage
      resource="rounds" idKey="key" singular="interview round" title="Interview rounds"
      blurb="interview_rounds is the WEAK entity: its key is (application_id, round_no). Scheduling calls sp_schedule_round (round number generated); a FAILED result makes a trigger reject the application."
      columns={columns} fields={fields} canEdit={false} rowActions={rowActions} createLabel="Schedule round" searchable filters={filters}
    />
  );
}
