export interface Resume {
  id: number;
  candidate_name: string;
  email: string;
  phone: string;
  skills: string[];
  experience_years: number;
  education: string;
  raw_text: string;
  country?: string;
  city?: string;
  salary_min?: number;
  salary_max?: number;
  birth_date?: string;
  photo_url?: string;
}

export interface Requirement {
  id: number;
  title: string;
  required_skills: string[];
  min_experience_years: number;
  education: string;
  description: string;
}

export interface MatchResult {
  resume_id: number;
  requirement_id: number;
  score: number;
  skill_matches: string[];
  skill_gaps: string[];
  details: {
    skill_score: number;
    experience_score: number;
    education_score: number;
    keyword_score: number;
  };
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[.\-_]/g, "");
}

function skillMatch(candidateSkills: string[], requiredSkills: string[]): {
  matches: string[];
  gaps: string[];
  score: number;
} {
  const normCandidate = candidateSkills.map(normalize);
  const matches: string[] = [];
  const gaps: string[] = [];

  for (const req of requiredSkills) {
    const normReq = normalize(req);
    const found = normCandidate.some(
      (cs) => cs.includes(normReq) || normReq.includes(cs)
    );
    if (found) {
      matches.push(req);
    } else {
      gaps.push(req);
    }
  }

  const score = requiredSkills.length > 0 ? matches.length / requiredSkills.length : 0;
  return { matches, gaps, score };
}

function experienceScore(candidate: number, required: number): number {
  if (required === 0) return 1;
  if (candidate >= required) return 1;
  return candidate / required;
}

function educationScore(candidate: string, required: string): number {
  if (!required) return 1;
  if (!candidate) return 0;
  const normC = normalize(candidate);
  const normR = normalize(required);
  if (normC.includes(normR) || normR.includes(normC)) return 1;
  return 0.3;
}

function keywordScore(rawText: string, description: string): number {
  if (!description) return 0;
  const words = description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (words.length === 0) return 0;
  const text = rawText.toLowerCase();
  const found = words.filter((w) => text.includes(w)).length;
  return found / words.length;
}

export function calculateMatch(resume: Resume, requirement: Requirement): MatchResult {
  const skills = skillMatch(resume.skills, requirement.required_skills);
  const expScore = experienceScore(resume.experience_years, requirement.min_experience_years);
  const eduScore = educationScore(resume.education || "", requirement.education || "");
  const kwScore = keywordScore(resume.raw_text, requirement.description || "");

  // Weighted score: skills 50%, experience 25%, education 10%, keywords 15%
  const totalScore = Math.round(
    (skills.score * 50 + expScore * 25 + eduScore * 10 + kwScore * 15) * 100
  ) / 100;

  return {
    resume_id: resume.id,
    requirement_id: requirement.id,
    score: totalScore,
    skill_matches: skills.matches,
    skill_gaps: skills.gaps,
    details: {
      skill_score: Math.round(skills.score * 100),
      experience_score: Math.round(expScore * 100),
      education_score: Math.round(eduScore * 100),
      keyword_score: Math.round(kwScore * 100),
    },
  };
}

// Simple skill extractor from raw text
const KNOWN_SKILLS = [
  "javascript", "typescript", "python", "java", "c#", "c++", "go", "rust", "ruby", "php", "swift", "kotlin",
  "react", "angular", "vue", "svelte", "next.js", "nuxt", "node.js", "express", "fastapi", "django", "flask", "spring",
  "html", "css", "sass", "tailwind", "bootstrap",
  "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
  "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible",
  "git", "ci/cd", "jenkins", "github actions",
  "rest", "graphql", "grpc", "websocket",
  "linux", "nginx", "apache",
  "figma", "photoshop",
  "agile", "scrum", "kanban",
  "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch",
  "data analysis", "pandas", "numpy", "spark",
  "blockchain", "solidity", "web3",
  "unity", "unreal engine",
  "salesforce", "sap", "1c", "bitrix",
];

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter((skill) => lower.includes(skill));
}

export function parseResumeText(text: string): {
  skills: string[];
  experience_years: number;
  education: string;
} {
  const skills = extractSkills(text);

  // Try to extract years of experience
  let experience_years = 0;
  const expMatch = text.match(/(\d+)\+?\s*(?:лет|год|года|years?|г\.)\s*(?:опыт|experience|работ)/i)
    || text.match(/(?:опыт|experience|стаж)[:\s]*(\d+)/i);
  if (expMatch) {
    experience_years = parseInt(expMatch[1], 10);
  }

  // Try to extract education
  let education = "";
  const eduPatterns = [
    /(?:образование|education)[:\s]*(.*?)(?:\n|$)/i,
    /(бакалавр|магистр|specialist|bachelor|master|phd|кандидат|доктор)/i,
  ];
  for (const pat of eduPatterns) {
    const m = text.match(pat);
    if (m) {
      education = m[1] || m[0];
      break;
    }
  }

  return { skills, experience_years, education };
}
