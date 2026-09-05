export type LeadLine = "life" | "home-auto";

export type Communication = {
  id?: string;
  providerId?: string;
  direction?: string;
  channel?: string;
  body?: string;
  text?: string;
  subject?: string;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  at?: string;
  sentAt?: string;
};

export type Lead = {
  id: number;
  name: string;
  phone: string;
  city: string;
  status: string;
  email: string;
  stage: string;
  outcome: string;
  notes: string;
  followUp: string;
  doNotCall: boolean;
  lastContact: string;
  line: LeadLine;
  source: string;
  leadCost: number;
  product: string;
  sourceDisposition: string;
  importedAt: string;
  address?: string;
  state?: string;
  zip?: string;
  dateOfBirth?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: string;
  policyNumber?: string;
  policyEffectiveDate?: string;
  policyExpirationDate?: string;
  renewalDate?: string;
  vin?: string;
  vehicle?: string;
  smsConsent?: boolean;
  smsOptOut?: boolean;
  emailConsent?: boolean;
  emailOptOut?: boolean;
  communications?: Communication[];
  attempts?: number;
  lastAttemptAt?: string;
  lastConnectedAt?: string;
  priorityOverride?: "auto" | "high" | "low";
  assignedTo?: string;
  estimatedValue?: number;
  closedRevenue?: number;
  closedAt?: string;
  lastInboundAt?: string;
  clientStatus?: "active" | "inactive";
  [key: string]: unknown;
};

export type CallLog = {
  id: string;
  name: string;
  phone: string;
  startedAt: string;
  duration: number;
  outcome: string;
  status: string;
  campaign: string;
  source: string;
  errorCode?: string;
  callSid?: string;
  recordingUrl?: string;
  recordingSid?: string;
  recordingStatus?: string;
  transcript?: string;
  aiSummary?: string;
};

export type WorkspaceProfile = Record<string, unknown>;

export type LiveCallSession = {
  leadId: number | null;
  name: string;
  phone: string;
  line: LeadLine;
  status: "dialing" | "connected";
  startedAt: string;
  updatedAt: string;
};

export type Workspace = {
  found?: boolean;
  leads: Lead[];
  callLogs: CallLog[];
  profile: WorkspaceProfile;
};
