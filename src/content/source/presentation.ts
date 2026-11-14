import type { Locale } from '../model.ts';

// Storage taxonomy stays unchanged. Website headings describe the actual skills,
// without turning an inherited category name into an unsupported competence claim.
const headings: Record<string, [string, string]> = {
  'Programming & Scripting': ['Programming', 'Programmierung'],
  'DevOps & Infrastructure': ['DevOps & Infrastructure', 'DevOps und Infrastruktur'],
  'Software & Web Development': ['Software & Web Development', 'Software- und Webentwicklung'],
  'Databases & Data Engineering': ['Databases & Data Engineering', 'Datenbanken und Data Engineering'],
  'Data Visualization & Reporting': ['Software & reporting', 'Software und Berichterstellung'],
  'Bioinformatics Domains': ['Bioinformatics', 'Bioinformatik'],
  'Laboratory Techniques': ['Laboratory methods', 'Labormethoden'],
  'Soft Skills': ['Soft skills', 'Persönliche Kompetenzen'],
  'Programming Languages': ['Programming languages', 'Programmiersprachen'],
  'Machine Learning & Data Science': ['Machine Learning & Data Science', 'Maschinelles Lernen und Data Science'],
  'Scripting & Automation Tools': ['Scripting & Automation Tools', 'Skripting und Automatisierungswerkzeuge'],
  'Scientific Python Libraries': ['Scientific Python Libraries', 'Wissenschaftliche Python-Bibliotheken'],
  'Networking & Protocols': ['Networking & Protocols', 'Netzwerke und Protokolle'],
  'DevOps Tools & CI/CD Pipelines': ['DevOps Tools & CI/CD Pipelines', 'DevOps-Werkzeuge und CI/CD-Pipelines'],
  'Cloud Platforms & Authentication': ['Cloud Platforms & Authentication', 'Cloud-Plattformen und Authentifizierung'],
  'Containerization & Orchestration': ['Containerization & Orchestration', 'Containerisierung und Orchestrierung'],
  'System Administration & Linux Tools': ['System Administration & Linux Tools', 'Systemadministration und Linux-Werkzeuge'],
  'Frontend Frameworks & UI Technologies': ['Frontend Frameworks & UI Technologies', 'Frontend-Frameworks und UI-Technologien'],
  'Backend Development & APIs': ['Backend Development & APIs', 'Backend-Entwicklung und APIs'],
  'Database Modeling & Optimization': ['Database Modeling & Optimization', 'Datenbankmodellierung und -optimierung'],
  'SQL Databases': ['SQL Databases', 'SQL-Datenbanken'],
  'NoSQL Databases': ['NoSQL Databases', 'NoSQL-Datenbanken'],
  'Data Pipelines & ETL Systems': ['Data Pipelines & ETL Systems', 'Datenpipelines und ETL-Systeme'],
  'Scientific Plotting Tools': ['Scientific Plotting Tools', 'Wissenschaftliche Visualisierung'],
  'Dashboarding & Reporting Platforms': ['Office & design software', 'Office- und Designsoftware'],
  'Visual Analytics & Network Tools': ['Visual Analytics & Network Tools', 'Visuelle Analyse und Netzwerkwerkzeuge'],
  'Spreadsheet Automation': ['Spreadsheet Automation', 'Automatisierung von Tabellenkalkulationen'],
  'Statistical Modeling & Machine Learning in Bioinformatics': ['Statistical Modeling & Machine Learning', 'Statistische Modellierung und maschinelles Lernen'],
  'Genomics & Genome Assembly': ['Sequence analysis & databases', 'Sequenzanalyse und Datenbanken'],
  'Transcriptomics & Single-Cell Analysis': ['Transcriptomics & Single-Cell Analysis', 'Transkriptomik und Einzelzellanalyse'],
  'Metagenomics & Microbial Ecology': ['Metagenomics & Microbial Ecology', 'Metagenomik und mikrobielle Ökologie'],
  'Functional Annotation & Systems Biology': ['Functional Annotation & Systems Biology', 'Funktionelle Annotation und Systembiologie'],
  'Protein Structure & Structural Bioinformatics': ['Protein bioinformatics', 'Proteinbioinformatik'],
  'Phylogeny & Comparative Genomics': ['Phylogeny & Comparative Genomics', 'Phylogenie und vergleichende Genomik'],
  'Molecular & Microbial Biology Techniques': ['Molecular biology, microbiology & diagnostics', 'Molekularbiologie, Mikrobiologie und Diagnostik'],
  'In Vivo & Ex Vivo Experimental Protocols': ['In Vivo & Ex Vivo Experimental Protocols', 'In-vivo- und Ex-vivo-Versuchsprotokolle'],
  'Experimental Design & Laboratory Documentation': ['Laboratory experiments & documentation', 'Laborversuche und Dokumentation'],
  'Analytical Instruments & Chromatography': ['Laboratory methods & instrumentation', 'Labormethoden und Geräte'],
  'Bioprocess & Bioreactor Engineering': ['Bioprocess & Bioreactor Engineering', 'Bioprozess- und Bioreaktortechnik'],
  'Lab Safety, Compliance & Regulatory Practices': ['Lab Safety, Compliance & Regulatory Practices', 'Laborsicherheit und regulatorische Praxis'],
  'Core Soft Skills': ['Personal skills', 'Persönliche Kompetenzen'],
};

export function skillHeading(key: string, locale: Locale): string {
  return headings[key]?.[locale === 'de' ? 1 : 0] ?? key;
}
export function displayDate(value: string, locale: Locale): string {
  return value.toLowerCase() === 'present' && locale === 'de' ? 'heute' : value;
}
