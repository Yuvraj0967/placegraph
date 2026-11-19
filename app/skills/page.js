'use client';
import CrudPage from '@/components/CrudPage';

const columns = [
  { key: 'skill_id', label: 'ID' },
  { key: 'name', label: 'Skill' },
  { key: 'students', label: 'Students with skill' },
  { key: 'jobs', label: 'Jobs requiring it' },
];
const fields = [{ name: 'name', label: 'Skill name', required: true }];

export default function SkillsPage() {
  return (
    <CrudPage
      resource="skills" idKey="skill_id" singular="skill" title="Skills"
      blurb="The link between students and jobs. Skills drive the Neo4j job recommendations and skill-gap analysis."
      columns={columns} fields={fields} createLabel="Add skill"
    />
  );
}
