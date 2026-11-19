'use client';
import CrudPage from '@/components/CrudPage';

const columns = [
  { key: 'company_id', label: 'ID' },
  { key: 'name', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'location', label: 'Location' },
  { key: 'jobs', label: 'Job postings' },
];
const fields = [
  { name: 'name', label: 'Company name', required: true },
  { name: 'industry', label: 'Industry' },
  { name: 'location', label: 'Location' },
];

export default function CompaniesPage() {
  return (
    <CrudPage
      resource="companies" idKey="company_id" singular="company" title="Companies"
      blurb="Deleting a company that still has job postings is blocked by the foreign key (ON DELETE RESTRICT) - try it."
      columns={columns} fields={fields} createLabel="Add company" searchable
    />
  );
}
