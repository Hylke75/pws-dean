export type Role = "student" | "begeleider";
export type PhaseStatus = "te_doen" | "bezig" | "klaar";

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
  created_at: string;
  updated_at: string;
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
  phase_id: string | null;
  created_at: string;
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
