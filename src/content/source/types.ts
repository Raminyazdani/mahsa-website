/** Types for the supplied CV source structure. Keep these inside the content boundary. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface SourceConfig {
  lang: string;
  ID: string;
}

export interface SourcePhone {
  countryCode: string;
  number: string;
  formatted: string;
}

export interface SourceLocation {
  address: string | null;
  postalCode: string;
  city: string;
  region: string;
  country: string;
}

export interface SourcePicture {
  type_of: string;
  URL: string;
}

export interface SourceBasics {
  fname: string;
  lname: string;
  label: string[];
  email: string;
  phone: SourcePhone;
  birthDate: string;
  summary: string;
  location: SourceLocation[];
  Pictures: SourcePicture[];
}

export interface SourceProfile {
  network: string;
  username: string;
  url: string;
  type_key: string[];
  legacy_label?: string;
  display_name?: string;
  public_repository_count?: number;
  public_repository_count_verified_at?: string;
  _verification?: JsonValue;
  uuid?: string;
  label?: string;
  requires_authentication?: boolean;
}

export interface SourceEducation {
  institution: string;
  location: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  gpa: string;
  logo_url: string;
  type_key: string[];
  description?: string;
}

export interface SourceLanguageProficiency {
  level: string;
  CEFR: string | null;
  status: string;
}

export interface SourceLanguageCertification {
  test: string | null;
  organization: string | null;
  overall: number | null;
  reading: number | null;
  listening: number | null;
  writing: number | null;
  speaking: number | null;
  maxScore?: number | null;
  minScore?: number | null;
  examDate: string | null;
  URL: string | null;
}

export interface SourceLanguage {
  language: string;
  proficiency: SourceLanguageProficiency;
  certifications: SourceLanguageCertification[];
  type_key: string[];
}

export interface SourceWorkshopCertification {
  name: string;
  date: string;
  duration: string;
  certificate: boolean;
  URL: string | null;
  type_key: string[];
  date_precision?: string;
}

export interface SourceWorkshopGroup {
  issuer: string;
  certifications: SourceWorkshopCertification[];
}

export interface SourceSkill {
  long_name: string;
  short_name: string;
  type_key: string[];
  _verification?: JsonValue;
}

/** Category and subcategory names are data, rather than fixed UI branches. */
export type SourceSkills = Record<string, Record<string, SourceSkill[]>>;

export interface SourceContractPeriod {
  startDate: string;
  endDate: string;
}

export interface SourceExperience {
  role: string;
  institution: string;
  duration: string;
  description: string;
  type_key: string[];
  _verification?: JsonValue;
  url?: string;
  startDate?: string;
  endDate?: string;
  contract_end_date?: string;
  contract_history?: SourceContractPeriod[];
  profile_url?: string;
  employment_pattern?: string;
}

export interface SourceProjectLink {
  label: string;
  url: string;
}

export interface SourceProject {
  title: string;
  description: string;
  url: string | null;
  type_key: string[];
  _verification?: JsonValue;
  repository_url?: string;
  links?: SourceProjectLink[];
}

export interface SourceAuthor {
  literal: string;
  given?: string;
  family?: string;
}

export interface SourcePublicationIdentifiers {
  doi: string | null;
  isbn: string | null;
  issn: string | null;
  pmid: string | null;
  pmcid: string | null;
  arxiv: string | null;
  manuscript?: string;
  isbn_ebook?: string;
  journal_manuscript?: string;
}

export interface SourcePublication {
  title: string;
  authors: string[];
  authors_structured: SourceAuthor[];
  type: string;
  status: string;
  year: number | null;
  month: number | null;
  day: number | null;
  date: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  article_number: string | null;
  doi: string | null;
  issn: string | null;
  url: string | null;
  access_date: string | null;
  language: string | null;
  publisher: string | null;
  place: string | null;
  editors: string[] | null;
  book_title: string | null;
  chapter_pages: string | null;
  edition: string | null;
  conference: string | null;
  degree_type: string | null;
  repository_url: string | null;
  correspondent: string;
  supervisors: string[] | null;
  institution: string | null;
  faculty: string | null;
  school: string | null;
  isbn: string | null;
  submissionDate: string | null;
  identifiers: SourcePublicationIdentifiers;
  notes: string | null;
  URL: string | null;
  type_key: string[];
  status_verified_at?: string;
  known_coauthors?: string[];
  author_order_verified?: boolean;
  corresponding_author?: string;
  _verification?: JsonValue;
  page_count?: number;
  chapter_number?: number;
  isbn_ebook?: string;
  book_subtitle?: string;
  issn_online?: string;
  publication_date_online?: string;
  publication_date_issue?: string;
  _sources?: string[];
}

export interface SourceReference {
  name: string;
  position: string;
  department: string | null;
  institution: string;
  location: string;
  email: string[];
  phone: SourcePhone[] | null;
  URL: string | null;
  type_key: string[];
}

export interface SourceInterest {
  name: string;
  icon: string;
  description: string;
}

export interface SourceCv {
  config: SourceConfig;
  basics: [SourceBasics];
  profiles: SourceProfile[];
  education: SourceEducation[];
  languages: SourceLanguage[];
  workshop_and_certifications: SourceWorkshopGroup[];
  skills: SourceSkills;
  experiences: SourceExperience[];
  projects: SourceProject[];
  publications: SourcePublication[];
  references: SourceReference[];
  interests: SourceInterest[];
}
