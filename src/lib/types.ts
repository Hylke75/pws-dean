export type Role = "student" | "ouder" | "begeleider";
export type PhaseStatus = "te_doen" | "bezig" | "klaar";
export type ReviewStatus = "concept" | "ingediend" | "goedgekeurd" | "wijzigingen_nodig";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
};

export type Phase = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  deadline: string | null;
  order_index: number;
  status: PhaseStatus;
  is_milestone: boolean;
  notes: string | null;
  veld_data: Record<string, string> | null;
  review_status: ReviewStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ToetsCriterium = {
  id: string;
  phase_id: string;
  text: string;
  order_index: number;
  done: boolean;
};

export type AiVerdict = "klaar" | "bijna" | "nog_niet";

export type AiFeedbackData = {
  verdict: AiVerdict;
  samenvatting: string;
  sterke_punten: string[];
  aandachtspunten: string[];
  volgende_stap: string;
};

export type AiFeedback = {
  id: string;
  phase_id: string;
  verdict: string | null;
  data: AiFeedbackData | null;
  model: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  phase_id: string;
  status: "goedgekeurd" | "wijzigingen_nodig" | "opmerking";
  feedback: string | null;
  created_by: string | null;
  created_at: string;
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  concept: "Concept",
  ingediend: "Ingediend",
  goedgekeurd: "Goedgekeurd",
  wijzigingen_nodig: "Wijzigingen nodig",
};

export type ChecklistItem = {
  id: string;
  phase_id: string;
  text: string;
  done: boolean;
  order_index: number;
};

export type LogEntry = {
  id: string;
  log_date: string;
  begin_tijd: string | null;
  eind_tijd: string | null;
  activity: string;
  minutes: number;
  next_step: string | null;
  phase_id: string | null;
  created_at: string;
};

export type Source = {
  id: string;
  source_type: "website" | "boek" | "artikel" | "video" | "interview" | "overig";
  authors: string | null;
  title: string;
  year: string | null;
  publisher: string | null;
  url: string | null;
  accessed_on: string | null;
  notes: string | null;
  summary: string | null;
  quotes: string | null;
  reliability: Record<string, boolean> | null;
  relevance: string | null;
  phase_id: string | null;
  subquestion_id: string | null;
  document_path: string | null;
  document_name: string | null;
  created_at: string;
};

export type Subquestion = {
  id: string;
  text: string;
  order_index: number;
  created_at: string;
};

export type SurveyStatus = "concept" | "open" | "gesloten";
export type QuestionType = "open" | "meerkeuze" | "meerdere" | "schaal" | "stellingen" | "janee";

export type Voorwaarde = { vraag: string; waarden: string[] };

export type QuestionConfig = {
  /** meerdere: maximaal aantal keuzes */
  max?: number;
  /** meerdere: opties die alle andere keuzes wissen (bv. "Ik gebruik geen AI") */
  exclusief?: string[];
  /** schaal/stellingen: vijf antwoordlabels, van 1 t/m 5 */
  labels?: string[];
  /** schaal/stellingen: extra knop "Weet ik niet" */
  weetNiet?: boolean;
  /** schaal/stellingen: andere tekst voor die extra knop */
  weetNietLabel?: string;
  /** stellingen: de stellingen zelf */
  items?: string[];
  /** stellingen: korte namen voor grafieken */
  kort?: string[];
  /** open: maximaal aantal tekens */
  maxLengte?: number;
  /** meerkeuze: opties hangen af van het antwoord op een eerdere vraag */
  afhankelijkVan?: string;
  groepen?: { als: string[]; opties: string[] }[];
  /** meerkeuze/meerdere: vaste antwoordcodes, parallel aan options. Opgeslagen wordt de code, getoond het label. */
  codes?: string[];
  /** korte uitleg onder de vraag */
  toelichting?: string;
  /** meerdere/meerkeuze: bij "Anders" mag de invuller zelf iets typen */
  andersTekst?: boolean;
  /** opgeslagen waarde van de "Anders"-optie (standaard "Anders") */
  andersWaarde?: string;
  /** vervolgvraag: krijgt geen eigen vraagnummer */
  vervolg?: boolean;
  /** vraag alleen tonen bij bepaalde antwoorden op een eerdere vraag; bij een lijst volstaat één voorwaarde */
  toonAls?: Voorwaarde | Voorwaarde[];
  /** extra toelichting die alleen bij een bepaalde route verschijnt */
  extraToelichting?: { als: Voorwaarde | Voorwaarde[]; tekst: string };
  /** sleutel om dezelfde vraag over enquêtes heen te vergelijken */
  vergelijk?: string;
};

export type Survey = {
  id: string;
  title: string;
  intro: string | null;
  status: SurveyStatus;
  share_token: string;
  slug: string | null;
  afsluiting: string | null;
  verborgen: boolean;
  phase_id: string | null;
  created_at: string;
};

export type SurveyQuestion = {
  id: string;
  survey_id: string;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  order_index: number;
  section: string | null;
  config: QuestionConfig;
  actief: boolean;
  versie: number;
};

export type Interview = {
  id: string;
  respondent: string | null;
  rol: string | null;
  datum: string | null;
  phase_id: string | null;
  created_at: string;
};

export type InterviewItem = {
  id: string;
  interview_id: string;
  vraag: string | null;
  antwoord: string | null;
  order_index: number;
};

export type VerslagSectie = {
  section_key: string;
  status: "te_doen" | "bezig" | "klaar";
  notes: string | null;
  updated_at: string;
};

export type Attachment = {
  id: string;
  phase_id: string | null;
  kind: "link" | "file";
  label: string;
  url: string | null;
  storage_path: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: "deadline_change" | "reminder" | "system";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type DeadlineChange = {
  id: string;
  phase_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
};

export const STATUS_LABELS: Record<PhaseStatus, string> = {
  te_doen: "Te doen",
  bezig: "Bezig",
  klaar: "Klaar",
};

export type Opmerking = {
  id: string;
  hoofdstuk: string;
  tekst: string;
  auteur: string | null;
  auteur_naam: string | null;
  verwerkt: boolean;
  verwerkt_op: string | null;
  created_at: string;
};

export type AnalyseDocument = {
  id: string;
  titel: string;
  soort: "eigen" | "extern";
  auteur: string | null;
  jaar: string | null;
  deelvraag_id: string | null;
  bestand_pad: string;
  bestand_naam: string;
  samenvatting: string | null;
  status: "bezig" | "klaar" | "fout";
  /** automatisch aangemaakte bron bij een analyse door anderen */
  bron_id: string | null;
  created_at: string;
};
