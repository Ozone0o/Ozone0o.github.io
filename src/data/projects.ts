export interface ProjectTimelineItem {
  date: string;
  title: string;
  description: string;
}

export interface ProjectRecord {
  title: string;
  shortDescription: string;
  year: string;
  status: string;
  slug: string;
  fixture: boolean;
  summary: string;
  timeline: ProjectTimelineItem[];
}

// These names and descriptions mirror the supplied Figma visual fixtures.
// They are deliberately marked as fixtures until real project data is provided.
export const projects: ProjectRecord[] = [
  {
    title: 'Axiom',
    shortDescription: 'robot capability documentation',
    year: '2026 — current',
    status: 'draft fixture',
    slug: 'axiom',
    fixture: true,
    summary: 'A visual fixture for a documentation layer that turns notes into something inspectable.',
    timeline: [
      { date: 'TBD', title: 'Started', description: 'Real project milestones will be added here.' },
      { date: 'TBD', title: 'First grounding', description: 'A placeholder for the first meaningful project note.' },
      { date: 'TBD', title: 'Schema redesign', description: 'A placeholder for a change in structure or direction.' },
      { date: 'TBD', title: 'Validation', description: 'Evidence and links will be attached when the project is real.' },
      { date: 'NOW', title: 'Current', description: 'This is a design fixture, not a factual project record.' },
    ],
  },
  {
    title: 'Aegis',
    shortDescription: 'fault injection + validation',
    year: '2026',
    status: 'draft fixture',
    slug: 'aegis',
    fixture: true,
    summary: 'A visual fixture for a project entry with room for notes, evidence, and a timeline.',
    timeline: [],
  },
  {
    title: 'Gauntlet',
    shortDescription: 'real-robot closed-loop tests',
    year: '2026',
    status: 'draft fixture',
    slug: 'gauntlet',
    fixture: true,
    summary: 'A visual fixture only. No project facts are asserted by this page.',
    timeline: [],
  },
  {
    title: 'Roscope',
    shortDescription: 'ROS observability corpus',
    year: '2026',
    status: 'draft fixture',
    slug: 'roscope',
    fixture: true,
    summary: 'A visual fixture only. Real project content will be added separately.',
    timeline: [],
  },
  {
    title: 'MiniVocab',
    shortDescription: 'small macOS vocabulary tool',
    year: '2026',
    status: 'draft fixture',
    slug: 'minivocab',
    fixture: true,
    summary: 'A visual fixture only. Real project content will be added separately.',
    timeline: [],
  },
  {
    title: 'VLA Notes',
    shortDescription: 'real-robot learning experiments',
    year: 'next',
    status: 'draft fixture',
    slug: 'vla-notes',
    fixture: true,
    summary: 'A visual fixture only. Real project content will be added separately.',
    timeline: [],
  },
];
