// Application types and their routing to PPKP
export const APPLICATION_TYPES = {
  G1: { label: 'G1 - Fail Am', ppkpRoute: 'PPKP_L' },
  G1_P: { label: 'G1/P - Permit Hiburan', ppkpRoute: 'PPKP_L' },
  G2: { label: 'G2 - Pasar', ppkpRoute: 'PPKP_P' },
  G3: { label: 'G3 - Penjaja/Kiosk', ppkpRoute: 'PPKP_P' },
  G7: { label: 'G7 - Outdoor Cafe', ppkpRoute: 'PPKP_L' },
  G8: { label: 'G8 - Makanan', ppkpRoute: 'PPKP_L' },
  G9: { label: 'G9 - Komposit', ppkpRoute: 'PPKP_L' },
  G11: { label: 'G11 - Enakmen Hotel', ppkpRoute: 'PPKP_L' },
  PAPAN_IKLAN: { label: 'Papan Iklan', ppkpRoute: 'PPKP_L' },
  PERMIT_SEMENTARA: { label: 'Permit Sementara', ppkpRoute: 'PPKP_P' },
} as const;

export type ApplicationTypeKey = keyof typeof APPLICATION_TYPES;

// Workflow steps in order
export const WORKFLOW_STEPS = {
  KAUNTER_RECEIPT: { label: 'Penerimaan Kaunter', order: 1 },
  PT_FILE_OPENING: { label: 'Pembukaan Fail PT', order: 2, slaDays: 3 },
  PT_FILE_REGISTRATION: { label: 'Pendaftaran No. Fail', order: 3 },
  PPKP_PROCESSING: { label: 'Pemprosesan PPKP', order: 4, slaDays: 4 },
  PPL_REVIEW: { label: 'Ulasan PPL', order: 5, slaDays: 3 },
  PO_DECISION: { label: 'Keputusan PO', order: 6 },
} as const;

export type WorkflowStepKey = keyof typeof WORKFLOW_STEPS;

// Application statuses
export const APPLICATION_STATUSES = {
  PENDING_PT: { label: 'Menunggu PT', color: 'amber' },
  PT_PROCESSING: { label: 'PT Memproses', color: 'blue' },
  PPKP_PROCESSING: { label: 'PPKP Memproses', color: 'purple' },
  PPL_REVIEW: { label: 'PPL Mengulas', color: 'teal' },
  PO_DECISION: { label: 'Keputusan PO', color: 'orange' },
  COMPLETED: { label: 'Selesai', color: 'green' },
  REJECTED: { label: 'Ditolak', color: 'red' },
} as const;

// Staff roles
export const STAFF_ROLES = {
  KAUNTER: { label: 'Kaunter' },
  PT: { label: 'Pegawai Tadbir (PT)' },
  PPKP_L: { label: 'PPKP(L)' },
  PPKP_P: { label: 'PPKP(P)' },
  PPL_L: { label: 'PPL(L)' },
  PPL_P: { label: 'PPL(P)' },
  PO: { label: 'Pegawai Operasi (PO)' },
} as const;

// Zones
export const ZONES = ['A', 'B', 'C', 'D', 'E'] as const;
export type Zone = (typeof ZONES)[number];

// PO Decisions
export const PO_DECISIONS = {
  SIMPAN_FAIL: { label: 'Simpan Fail' },
  JABATAN_KESIHATAN: { label: 'Hantar ke Jabatan Kesihatan' },
  JABATAN_PERANCANG_BANDAR: { label: 'Hantar ke Jabatan Perancang Bandar' },
} as const;

// Helper to determine PPKP type based on application type
export function getPPKPRole(applicationType: string): 'PPKP_L' | 'PPKP_P' {
  const config = APPLICATION_TYPES[applicationType as ApplicationTypeKey];
  if (!config) return 'PPKP_L';
  return config.ppkpRoute as 'PPKP_L' | 'PPKP_P';
}

// Helper to determine PPL type based on PPKP type
export function getPPLRole(ppkpRole: string): 'PPL_L' | 'PPL_P' {
  return ppkpRole === 'PPKP_L' ? 'PPL_L' : 'PPL_P';
}

// Generate reference number
export function generateReferenceNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF/${year}${month}/${random}`;
}
