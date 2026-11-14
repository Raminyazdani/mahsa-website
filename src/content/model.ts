/** Public website contract. No names or types from the input schema belong here. */
export type Locale = 'en' | 'de';
export interface Link { label: string; href: string }
export interface Item { id: string; tags: string[] }
export interface Period { start: string | null; end: string | null; label: string }
export interface Education extends Item {
  institution: string; subject: string; qualification: string;
  location: string | null; period: Period; grade: string | null;
  description: string | null; logo: string | null;
}
export interface Experience extends Item {
  title: string; organization: string; period: Period;
  description: string; link: string | null;
}
export interface Project extends Item { title: string; description: string; links: Link[] }
export interface Skill extends Item { name: string; shortName: string }
export interface SkillGroup {
  /** `key` is the stable, untranslated source category name; use it only for appearance metadata. */
  id: string; key: string; title: string;
  groups: { id: string; key: string; title: string; items: Skill[] }[];
}
export interface Language extends Item {
  name: string; level: string | null; frameworkLevel: string | null;
  status: string | null;
  certificates: { name: string; issuer: string | null; date: string | null;
    score: number | null; maximumScore: number | null; link: string | null }[];
}
export interface Training extends Item {
  title: string; issuer: string | null; date: string | null;
  duration: string | null; hasCertificateEvidence: boolean; link: string | null;
}
export interface Publication extends Item {
  title: string; authors: string[]; kind: string; status: string;
  date: string | null; venue: string | null; doi: string | null; links: Link[];
}
export interface Reference extends Item {
  name: string; role: string; organization: string; department: string | null;
  location: string | null; contacts: Link[];
}
export interface Interest { id: string; name: string; description: string; icon: string | null }
export type Section = 'about' | 'education' | 'experience' | 'projects' | 'skills'
  | 'languages' | 'training' | 'publications' | 'references' | 'interests';
export interface WebsiteContent {
  locale: Locale;
  person: {
    id: string; firstName: string; lastName: string; name: string;
    headlines: string[]; summary: string; contacts: Link[];
    birthDate: string | null;
    locations: { address: string | null; postalCode: string | null; city: string | null; region: string | null; country: string | null }[];
    images: { kind: string; src: string }[];
  };
  profiles: Link[];
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: SkillGroup[];
  languages: Language[];
  training: Training[];
  publications: Publication[];
  references: Reference[];
  interests: Interest[];
  visibleSections: Section[];
}
