// Site content. Kept free of dates, employers and product names: the career reads as chapters.

const NOW = new Date();
export const since = (year: number) => NOW.getFullYear() - year;

export const profile = {
  name: 'Arjun T Raj',
  role: 'Engineering Leader, Digital & AI Architect',
  location: 'Dubai, UAE',
  timezone: 'Asia/Dubai',
  email: 'mail@arjuntraj.in',
  intro: 'I design, code, and build things for the Internet & Mobile.',
  description:
    'Arjun T Raj, agentic AI engineer and React Native developer in Dubai, UAE. AI agents, LLM apps, iOS, Android and web. 15+ years, 70+ apps delivered.',
  // Topics for search engines (schema.org knowsAbout); keep them true to the skills below.
  knowsAbout: [
    'Agentic engineering', 'Agentic AI', 'AI agents', 'Generative AI', 'Large language models (LLMs)', 'Retrieval-augmented generation (RAG)',
    'Forward deployed engineering', 'AI-assisted software development', 'AI automation', 'Model Context Protocol', 'GitHub Copilot', 'Claude',
    'React Native', 'Mobile app development', 'Mobile architecture', 'iOS development', 'Swift', 'Android development',
    'React', 'Next.js', 'JavaScript', 'TypeScript', 'Node.js', 'Micro-frontends', 'Mobile security', 'CI/CD', 'Digital banking', 'Fintech',
  ],
  links: [
    { label: 'LinkedIn', href: 'https://in.linkedin.com/pub/arjun-t-raj/59/45/836' },
  ],
};

export const facts = [
  { value: `${since(2011)}+`, label: 'years building digital platforms' },
  { value: '70+', label: 'apps delivered' },
];

export type Release = {
  role: string;
  title: string;
  groups: { label: string; items: string[] }[];
};

// The current role in full.
export const releases: Release[] = [
  {
    role: 'Principal Engineer / Vice President',
    title: 'AI-driven engineering & platform leadership',
    groups: [
      {
        label: 'Lead',
        items: [
          'Mobile and web engineering for digital banking in a regulated environment, from strategy and architecture to delivery.',
          'Technical roadmaps and architecture governance across distributed web, mobile and full-stack teams.',
        ],
      },
      {
        label: 'Build with AI',
        items: [
          'Co-architected an agentic SDLC: GitHub Copilot and custom agents in spec-driven workflows.',
          'Less manual boilerplate, and security compliance checked automatically before every deployment.',
        ],
      },
      {
        label: 'Modernise',
        items: [
          'Legacy mobile and web apps moving onto one React Native architecture: faster releases, less technical debt.',
          'End-to-end mobile release pipelines, automated with GitHub Actions.',
        ],
      },
      {
        label: 'Empower engineers',
        items: ['A custom CLI suite, VS Code extensions, shared design systems and reusable component libraries.'],
      },
      {
        label: 'Ship',
        items: [
          'AI assistant, payments, onboarding, MFA and employee platforms.',
          'SDKs for facial recognition, OCR, live chat, fraud detection and national ID verification.',
        ],
      },
    ],
  },
];

// Earlier roles, folded into one line under the current one.
export const earlier = {
  role: 'Tech Lead & Engineer',
  title: 'Tech lead, senior engineer, mobile developer',
  summary:
    "Offshore delivery for a global entertainment brand's mobile apps, features for a major US telecom's iOS and Android app, native apps for media and enterprise clients, and first mobile and web builds for small businesses. B.Tech in Information Technology.",
};

// A curated few per group, not everything ever used.
export const skillGroups = [
  { name: 'Agentic AI engineering', skills: ['Agentic SDLC', 'AI agents & MCP', 'LLM apps & RAG', 'Forward deployed engineering (FDE)', 'Spec-driven development', 'GitHub Copilot & Claude'] },
  { name: 'Mobile', skills: ['React Native', 'iOS · Swift', 'Android', 'Mobile security (OWASP MASVS)'] },
  { name: 'Web & platform', skills: ['JavaScript & TypeScript', 'React & Next.js', 'Micro-frontends', 'Node.js & BFF', 'Spring Boot microservices'] },
  { name: 'Delivery & leadership', skills: ['Release automation', 'Developer experience', 'Architecture governance', 'Team leadership'] },
];

// The person behind the work. Keep it light.
export const offClock = {
  lines: [
    { icon: 'coffee', text: 'Coffee first, code second.' },
    { icon: 'family', text: 'Father of two.' },
    { icon: 'farm', text: 'Farmer at heart, happiest with my hands in the soil.' },
  ],
  links: [
    { kicker: 'Website', label: "Adveka's website", note: 'My daughter has her own corner of the internet.', href: 'https://advekatarjun.com/', cta: 'advekatarjun.com' },
    { kicker: 'Book', label: 'Life of Doom', note: 'Written by Adveka. Her story, now a published book.', href: 'https://www.amazon.com/dp/B0HPYB4HGS', cta: 'Buy on Amazon' },
  ],
};
