// All portfolio content lives here. Replace the placeholders with your own details.

export interface Job {
  period: string;
  role: string;
  employer: string;
  note: string;
}

export interface Project {
  code: string;
  name: string;
  summary: string;
  url: string;
}

export const profile = {
  name: "YOUR NAME",
  role: "Software Developer",
  location: "City, Country",
  fileNo: "CV-0001",
  summary:
    "Placeholder summary. Two or three sentences on what you build, what you care about, and what you are looking for next.",
  email: "you@example.com",
  links: [
    { label: "GitHub", url: "https://github.com/" },
    { label: "LinkedIn", url: "https://www.linkedin.com/" },
  ],
};

export const jobs: Job[] = [
  {
    period: "2024 — now",
    role: "Role title",
    employer: "Company name",
    note: "One line on what you shipped or owned.",
  },
  {
    period: "2022 — 2024",
    role: "Role title",
    employer: "Company name",
    note: "One line on what you shipped or owned.",
  },
  {
    period: "2020 — 2022",
    role: "Role title",
    employer: "Company name",
    note: "One line on what you shipped or owned.",
  },
];

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "Python", "SQL"] },
  { group: "Frontend", items: ["HTML/CSS", "React", "Vite"] },
  { group: "Other", items: ["Git", "Testing", "CI/CD"] },
];

export const projects: Project[] = [
  {
    code: "EXHIBIT A",
    name: "Project one",
    summary: "What it is and why it mattered, in one sentence.",
    url: "#",
  },
  {
    code: "EXHIBIT B",
    name: "Project two",
    summary: "What it is and why it mattered, in one sentence.",
    url: "#",
  },
  {
    code: "EXHIBIT C",
    name: "Project three",
    summary: "What it is and why it mattered, in one sentence.",
    url: "#",
  },
];
