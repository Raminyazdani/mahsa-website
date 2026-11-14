import type { Locale } from '../content/model.ts';

/**
 * Interface copy only. Nothing here is a CV fact: every name, date, skill, project and contact
 * detail comes from WebsiteContent. Keep both languages in step.
 */
const en = {
  skip: 'Skip to content',
  brandSub: 'Lab notes & portfolio',
  sections: {
    start: 'Start', profile: 'Profile', methods: 'Methods', journey: 'Journey', projects: 'Projects',
    training: 'Training', languages: 'Languages', publications: 'Publications', references: 'References',
    interests: 'Interests', contact: 'Contact',
  } as Record<string, string>,
  channels: {
    start: 'UV · 302 nm', profile: 'DAPI · em 461 nm', methods: 'SYBR · em 522 nm', journey: 'CFP · em 475 nm',
    projects: 'YFP · em 527 nm', training: 'H&E · brightfield', languages: 'pH · indicator', publications: 'Cy5 · em 670 nm',
    references: 'Cy5 · em 670 nm', interests: 'Cy5 · em 670 nm', contact: 'UV · 365 nm',
  } as Record<string, string>,
  // Titles are interface headings for each section, not claims.
  titles: {
    profile: 'In focus', methods: 'The bench', journey: 'Growth, in time-lapse', projects: 'Experiments',
    training: 'The slide box', languages: 'Language strips', publications: 'Publications', references: 'References',
    interests: 'Interests', contact: 'Send a message',
  } as Record<string, string>,
  intros: {
    profile: 'Turn the focus knob by scrolling. The specimen label below collects the essentials.',
    methods: 'Every method and tool listed in the CV. Shine the UV lamp on the bench by searching, or pick one item to inspect it.',
    journey: 'Education and experience grow from one stem. Each branch starts and ends at the dates in the CV.',
    projects: 'Each project has its own small, conceptual apparatus. The text beside it is the full CV record.',
    training: 'Training courses as slides. Put one under the microscope to read its label.',
    languages: 'Each strip develops up to the level given in the CV, on the CEFR reference scale.',
    contact: 'Email is the direct line. Copy it, write, call, or take the complete CV with you.',
  } as Record<string, string>,
  mode: { label: 'Experience', portfolio: 'Portfolio', lab: 'Laboratory', toLab: 'Enter the laboratory', toPortfolio: 'Read as portfolio' },
  theme: { label: 'Lighting', system: 'System', light: 'Daylight', dark: 'Darkroom', toggle: 'Switch lighting' },
  motion: { label: 'Motion', full: 'Full', gentle: 'Gentle', off: 'Off' },
  focus: { label: 'Focus mode', on: 'On', off: 'Off', hint: 'Calm reading: quieter effects, wider text, static scenes.' },
  language: { label: 'Language', en: 'English', de: 'Deutsch', switchTo: 'Deutsch', short: 'DE' },
  settings: { open: 'Settings', title: 'Environment', clear: 'Clear saved items and settings', cleared: 'Saved items and settings cleared', replay: 'Replay the intro', storage: 'Settings are kept in this browser only.' },
  search: { open: 'Search', title: 'Search the lab', placeholder: 'Methods, projects, records, actions…', empty: 'Nothing matches. Try a shorter word.', hint: 'Enter to open · Esc to close', groups: { sections: 'Sections', projects: 'Projects', methods: 'Methods', records: 'Journey', training: 'Training', languages: 'Languages', actions: 'Actions' } as Record<string, string> },
  saved: { open: 'Saved items', title: 'Saved collection', empty: 'Nothing saved yet. Use the star on a method, project or record.', save: 'Save', unsave: 'Remove from saved', remove: 'Remove', go: 'Open', storageFail: 'This browser blocks storage — saved items last until you close the tab.' },
  actions: { menu: 'Menu', close: 'Close', cv: 'CV', fullCv: 'Full CV', explore: 'Explore the work', copy: 'Copy', copied: 'Copied', copyFail: 'Copy failed — select the text instead', email: 'Write an email', call: 'Call', download: 'Download PDF', print: 'Print CV', prev: 'Previous', next: 'Next', reset: 'Reset', play: 'Play', pause: 'Pause', open: 'Open', back: 'Back', showAll: 'Show everything', copyLink: 'Copy link', linkCopied: 'Link copied' },
  intro: { skip: 'Skip intro', boot: 'UV lamp warming up' },
  hero: {
    based: 'Based in', scroll: 'Scroll to the next station', instrument: 'Conceptual instrument: an agarose gel run with a built-in illuminator. Bands are illustrative, not experimental data.',
    run: 'Run', pause: 'Pause', uv: 'UV lamp', stain: 'Stain', voltage: 'Voltage', progress: 'Run progress', view: 'View', view3d: '3D', viewTop: 'Top', reset: 'Reset',
    etbr: 'EtBr', sybr: 'SYBR', ladder: 'L', lane: 'Lane', cathode: '− cathode', anode: '+ anode',
    status: { idle: 'Ready · samples in the wells', running: 'Running · DNA moves toward +', paused: 'Paused', done: 'Dye front near the end · run complete' },
    uvNote: 'UV only reveals the bands. Migration comes from the electric field.',
    dyeNote: 'Blue tracking dye stays visible without UV.',
    badge: 'Lab access', badgeHint: 'Drag the badge',
    fallback: 'Static view: your browser could not start the 3D scene. All controls still work.',
  },
  profile: { label: 'Specimen label', name: 'Name', study: 'Programme', focus: 'Focus', location: 'Location', languages: 'Languages', contact: 'Contact', profiles: 'Profiles', field: 'Field of view', brightfield: 'Brightfield · stained cells', fluorescence: 'Fluorescence · DAPI + GFP', cellsNote: 'Live cells drift by — an illustration, not data.' },
  methods: {
    workbench: 'Workbench', instruments: 'Group instruments', view: 'Bench view', search: 'Search methods', searchPlaceholder: 'Find a method or tool…',
    all: 'All', clear: 'Clear', count: (shown: number, total: number) => `${shown} / ${total} methods`, none: 'No method matches this search and filter.',
    select: 'Pick a method to inspect it.', selected: 'Selected method', inCv: 'Listed in the CV under', group: 'Group', category: 'Category',
    related: 'Linked projects', relatedNone: 'The CV does not link this method to a specific project.', uvHint: 'UV lamp on: matches glow.',
    keyboard: 'Arrow keys move between items. Enter selects.',
  },
  journey: {
    all: 'All', education: 'Education', experience: 'Experience', play: 'Time-lapse', pause: 'Pause', year: 'Year', present: 'present',
    note: 'Branch growth is a visual metaphor for time. Dates follow the CV; year-only dates fade across that year.',
    grade: 'Grade', location: 'Location', open: 'Show record', recordList: 'All records', ongoing: 'ongoing',
  },
  projects: {
    record: 'Project record', open: 'Open project page', back: 'All projects', conceptual: 'Conceptual apparatus — illustrates the method, not project results.',
    noLinks: 'No public links are listed for this project.', links: 'Links', methodsNote: 'Methods linked in the CV',
    synth: { cycle: 'Cycle', expose: 'Expose UV', couple: 'Couple', base: 'Base', pattern: 'Mask', efficiency: 'Deprotection yield', errors: 'Strands with a missing base', inspect: 'Strand at spot', patterns: { checker: 'Checker', ring: 'Ring', diagonal: 'Diagonal', all: 'All' } as Record<string, string>, hint: 'Light removes the protecting group only where the mirrors point. Then one base couples to every unprotected strand.', reset: 'Reset chip' },
    expr: { induce: 'Induce', grow: 'Grow', reset: 'Reset', cells: 'Cells', protein: 'Expressed protein', hint: 'Plasmid-carrying E. coli divide; after induction they start making the recombinant protein.', on: 'on', off: 'off' },
    generic: 'Specimen view',
  },
  training: { slide: 'Slide', microscope: 'Under the microscope', pick: 'Pick a slide to view it.', course: 'Training', certificate: 'Certificate evidence supplied', issuer: 'Issuer', date: 'Date', duration: 'Duration' },
  languages: { native: 'Native', scale: 'CEFR reference scale', levels: { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate', C1: 'Advanced', C2: 'Proficient' } as Record<string, string>, range: 'range' },
  contact: { headline: 'Start a conversation', sub: 'For research groups and biotech teams.', email: 'Email', phone: 'Phone', location: 'Location', profiles: 'Profiles', barcode: 'Code 128 barcode of the email address', printing: 'Printing label', print: 'Reprint label' },
  lab: { map: 'Lab map', station: 'Station', stations: 'Stations', openMap: 'Map', here: 'You are here', hint: 'Every station is also in this list — no hidden hotspots.' },
  console: { label: 'Station controls', station: 'Station', next: 'Next station', prev: 'Previous station' },
  footer: { made: 'Built from the CV data.', cv: 'Complete CV', top: 'Back to top', fonts: 'Type: Bricolage Grotesque, Inter, Martian Mono (OFL).' },
  project: { page: 'Project', prev: 'Previous project', next: 'Next project', description: 'Description' },
  notFound: { title: 'Sample not found', body: 'This page is not on the bench.', home: 'Go to the start' },
};

type Labels = typeof en;

const de: Labels = {
  skip: 'Zum Inhalt springen',
  brandSub: 'Laborbuch & Portfolio',
  sections: {
    start: 'Start', profile: 'Profil', methods: 'Methoden', journey: 'Werdegang', projects: 'Projekte',
    training: 'Weiterbildung', languages: 'Sprachen', publications: 'Publikationen', references: 'Referenzen',
    interests: 'Interessen', contact: 'Kontakt',
  },
  channels: en.channels,
  titles: {
    profile: 'Scharfgestellt', methods: 'Die Laborbank', journey: 'Wachstum im Zeitraffer', projects: 'Experimente',
    training: 'Der Objektträgerkasten', languages: 'Sprach-Teststreifen', publications: 'Publikationen', references: 'Referenzen',
    interests: 'Interessen', contact: 'Nachricht senden',
  },
  intros: {
    profile: 'Beim Scrollen dreht sich der Fokusknopf. Das Probenetikett darunter fasst das Wichtigste zusammen.',
    methods: 'Alle Methoden und Werkzeuge aus dem Lebenslauf. Die Suche schaltet die UV-Lampe über der Bank ein – oder wählen Sie einen Eintrag aus.',
    journey: 'Studium und Berufserfahrung wachsen aus einem Stamm. Jeder Zweig beginnt und endet an den Daten aus dem Lebenslauf.',
    projects: 'Jedes Projekt hat einen eigenen, konzeptionellen Versuchsaufbau. Daneben steht der vollständige Eintrag aus dem Lebenslauf.',
    training: 'Weiterbildungen als Objektträger. Legen Sie einen unter das Mikroskop, um das Etikett zu lesen.',
    languages: 'Jeder Streifen färbt sich bis zum Niveau aus dem Lebenslauf – auf der GER-Referenzskala.',
    contact: 'E-Mail ist der direkte Weg. Kopieren, schreiben, anrufen – oder den vollständigen Lebenslauf mitnehmen.',
  },
  mode: { label: 'Ansicht', portfolio: 'Portfolio', lab: 'Labor', toLab: 'Ins Labor', toPortfolio: 'Als Portfolio lesen' },
  theme: { label: 'Beleuchtung', system: 'System', light: 'Tageslicht', dark: 'Dunkelraum', toggle: 'Beleuchtung wechseln' },
  motion: { label: 'Bewegung', full: 'Voll', gentle: 'Sanft', off: 'Aus' },
  focus: { label: 'Fokusmodus', on: 'An', off: 'Aus', hint: 'Ruhiges Lesen: weniger Effekte, breiterer Text, stehende Szenen.' },
  language: { label: 'Sprache', en: 'English', de: 'Deutsch', switchTo: 'English', short: 'EN' },
  settings: { open: 'Einstellungen', title: 'Umgebung', clear: 'Gespeicherte Einträge und Einstellungen löschen', cleared: 'Gespeicherte Einträge und Einstellungen gelöscht', replay: 'Intro erneut abspielen', storage: 'Einstellungen bleiben nur in diesem Browser.' },
  search: { open: 'Suche', title: 'Im Labor suchen', placeholder: 'Methoden, Projekte, Stationen, Aktionen…', empty: 'Keine Treffer. Versuchen Sie ein kürzeres Wort.', hint: 'Enter öffnet · Esc schließt', groups: { sections: 'Bereiche', projects: 'Projekte', methods: 'Methoden', records: 'Werdegang', training: 'Weiterbildung', languages: 'Sprachen', actions: 'Aktionen' } },
  saved: { open: 'Gemerkt', title: 'Gemerkte Einträge', empty: 'Noch nichts gemerkt. Nutzen Sie den Stern bei Methoden, Projekten oder Einträgen.', save: 'Merken', unsave: 'Nicht mehr merken', remove: 'Entfernen', go: 'Öffnen', storageFail: 'Dieser Browser blockiert den Speicher – gemerkte Einträge bleiben nur bis zum Schließen des Tabs.' },
  actions: { menu: 'Menü', close: 'Schließen', cv: 'CV', fullCv: 'Vollständiger Lebenslauf', explore: 'Arbeiten entdecken', copy: 'Kopieren', copied: 'Kopiert', copyFail: 'Kopieren fehlgeschlagen – bitte Text markieren', email: 'E-Mail schreiben', call: 'Anrufen', download: 'PDF herunterladen', print: 'Lebenslauf drucken', prev: 'Zurück', next: 'Weiter', reset: 'Zurücksetzen', play: 'Abspielen', pause: 'Pause', open: 'Öffnen', back: 'Zurück', showAll: 'Alles anzeigen', copyLink: 'Link kopieren', linkCopied: 'Link kopiert' },
  intro: { skip: 'Intro überspringen', boot: 'UV-Lampe wärmt auf' },
  hero: {
    based: 'Wohnort', scroll: 'Zur nächsten Station scrollen', instrument: 'Konzeptionelles Gerät: ein Agarosegel-Lauf mit eingebauter Beleuchtung. Die Banden sind illustrativ, keine Versuchsdaten.',
    run: 'Starten', pause: 'Pause', uv: 'UV-Lampe', stain: 'Färbung', voltage: 'Spannung', progress: 'Laufstrecke', view: 'Ansicht', view3d: '3D', viewTop: 'Aufsicht', reset: 'Zurücksetzen',
    etbr: 'EtBr', sybr: 'SYBR', ladder: 'M', lane: 'Spur', cathode: '− Kathode', anode: '+ Anode',
    status: { idle: 'Bereit · Proben in den Taschen', running: 'Läuft · DNA wandert zum Pluspol', paused: 'Pausiert', done: 'Farbstofffront fast am Ende · Lauf beendet' },
    uvNote: 'UV macht die Banden nur sichtbar. Die Wanderung entsteht durch das elektrische Feld.',
    dyeNote: 'Der blaue Laufmarker bleibt auch ohne UV sichtbar.',
    badge: 'Laborausweis', badgeHint: 'Ausweis ziehen',
    fallback: 'Statische Ansicht: Der Browser konnte die 3D-Szene nicht starten. Alle Regler funktionieren trotzdem.',
  },
  profile: { label: 'Probenetikett', name: 'Name', study: 'Studium', focus: 'Schwerpunkte', location: 'Ort', languages: 'Sprachen', contact: 'Kontakt', profiles: 'Profile', field: 'Sichtfeld', brightfield: 'Hellfeld · gefärbte Zellen', fluorescence: 'Fluoreszenz · DAPI + GFP', cellsNote: 'Lebende Zellen treiben vorbei – eine Illustration, keine Daten.' },
  methods: {
    workbench: 'Laborbank', instruments: 'Gerätegruppen', view: 'Ansicht', search: 'Methoden durchsuchen', searchPlaceholder: 'Methode oder Werkzeug finden…',
    all: 'Alle', clear: 'Zurücksetzen', count: (shown: number, total: number) => `${shown} / ${total} Methoden`, none: 'Keine Methode passt zu Suche und Filter.',
    select: 'Wählen Sie eine Methode aus.', selected: 'Ausgewählte Methode', inCv: 'Im Lebenslauf unter', group: 'Gruppe', category: 'Bereich',
    related: 'Verknüpfte Projekte', relatedNone: 'Der Lebenslauf verknüpft diese Methode mit keinem bestimmten Projekt.', uvHint: 'UV-Lampe an: Treffer leuchten.',
    keyboard: 'Pfeiltasten wechseln zwischen Einträgen. Enter wählt aus.',
  },
  journey: {
    all: 'Alle', education: 'Studium', experience: 'Erfahrung', play: 'Zeitraffer', pause: 'Pause', year: 'Jahr', present: 'heute',
    note: 'Das Wachstum der Zweige ist eine Metapher für Zeit. Die Daten folgen dem Lebenslauf; reine Jahresangaben verblassen über dieses Jahr.',
    grade: 'Note', location: 'Ort', open: 'Eintrag anzeigen', recordList: 'Alle Einträge', ongoing: 'laufend',
  },
  projects: {
    record: 'Projekteintrag', open: 'Projektseite öffnen', back: 'Alle Projekte', conceptual: 'Konzeptioneller Aufbau – zeigt die Methode, nicht Projektergebnisse.',
    noLinks: 'Für dieses Projekt sind keine öffentlichen Links angegeben.', links: 'Links', methodsNote: 'Im Lebenslauf verknüpfte Methoden',
    synth: { cycle: 'Zyklus', expose: 'UV belichten', couple: 'Koppeln', base: 'Base', pattern: 'Maske', efficiency: 'Entschützungsausbeute', errors: 'Stränge mit fehlender Base', inspect: 'Strang an Spot', patterns: { checker: 'Schach', ring: 'Ring', diagonal: 'Diagonale', all: 'Alle' }, hint: 'Licht entfernt die Schutzgruppe nur dort, wohin die Spiegel zeigen. Danach koppelt eine Base an jeden ungeschützten Strang.', reset: 'Chip zurücksetzen' },
    expr: { induce: 'Induzieren', grow: 'Wachsen', reset: 'Zurücksetzen', cells: 'Zellen', protein: 'Exprimiertes Protein', hint: 'E. coli mit Plasmid teilen sich; nach der Induktion bilden sie das rekombinante Protein.', on: 'an', off: 'aus' },
    generic: 'Probenansicht',
  },
  training: { slide: 'Objektträger', microscope: 'Unter dem Mikroskop', pick: 'Wählen Sie einen Objektträger.', course: 'Weiterbildung', certificate: 'Zertifikatsnachweis vorhanden', issuer: 'Anbieter', date: 'Datum', duration: 'Dauer' },
  languages: { native: 'Muttersprache', scale: 'GER-Referenzskala', levels: { A1: 'Anfänger', A2: 'Grundlegende Kenntnisse', B1: 'Fortgeschrittene Sprachverwendung', B2: 'Selbständige Sprachverwendung', C1: 'Fachkundige Sprachkenntnisse', C2: 'Annähernd muttersprachlich' }, range: 'Bereich' },
  contact: { headline: 'Ins Gespräch kommen', sub: 'Für Forschungsgruppen und Biotech-Teams.', email: 'E-Mail', phone: 'Telefon', location: 'Ort', profiles: 'Profile', barcode: 'Code-128-Strichcode der E-Mail-Adresse', printing: 'Etikett wird gedruckt', print: 'Etikett neu drucken' },
  lab: { map: 'Laborplan', station: 'Station', stations: 'Stationen', openMap: 'Plan', here: 'Sie sind hier', hint: 'Jede Station steht auch in dieser Liste – keine versteckten Hotspots.' },
  console: { label: 'Stationsregler', station: 'Station', next: 'Nächste Station', prev: 'Vorherige Station' },
  footer: { made: 'Aus den Lebenslaufdaten gebaut.', cv: 'Vollständiger Lebenslauf', top: 'Nach oben', fonts: 'Schrift: Bricolage Grotesque, Inter, Martian Mono (OFL).' },
  project: { page: 'Projekt', prev: 'Vorheriges Projekt', next: 'Nächstes Projekt', description: 'Beschreibung' },
  notFound: { title: 'Probe nicht gefunden', body: 'Diese Seite liegt nicht auf der Laborbank.', home: 'Zum Start' },
};

export const labels: Record<Locale, Labels> = { en, de };
export type { Labels };
