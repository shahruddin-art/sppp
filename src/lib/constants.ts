// Application types and their routing to PPKP
export const APPLICATION_TYPES = {
  PERMOHONAN_BARU: { label: 'Permohonan Baru', ppkpRoute: 'PPKP_L' },
  TUKAR_NAMA_SYARIKAT: { label: 'Tukar Nama Syarikat', ppkpRoute: 'PPKP_L' },
  TAMBAH_KURANG_PREMIS: { label: 'Tambah/Kurang Premis', ppkpRoute: 'PPKP_L' },
  TAMBAH_TUKAR_AKTIVITI: { label: 'Tambah/Tukar Aktiviti', ppkpRoute: 'PPKP_P' },
  PINDAH_MILIK_LESEN: { label: 'Pindah Milik Lesen', ppkpRoute: 'PPKP_L' },
} as const;

export type ApplicationTypeKey = keyof typeof APPLICATION_TYPES;

// Workflow steps in order
export const WORKFLOW_STEPS = {
  KAUNTER_RECEIPT: { label: 'Penerimaan Kaunter', order: 1 },
  PT_FILE_OPENING: { label: 'Pembukaan Fail PT', order: 2, slaDays: 3 },
  PT_FILE_REGISTRATION: { label: 'Pendaftaran No. Fail', order: 3 },
  PPKP_PROCESSING: { label: 'Pemprosesan PPKP', order: 4, slaDays: 4 },
  PPL_REVIEW: { label: 'Ulasan PPL', order: 5, slaDays: 3 },
  PLB_DECISION: { label: 'Keputusan PLB', order: 6 },
} as const;

export type WorkflowStepKey = keyof typeof WORKFLOW_STEPS;

// Application statuses
export const APPLICATION_STATUSES = {
  PENDING_PT: { label: 'Menunggu PT', color: 'amber' },
  PT_PROCESSING: { label: 'PT Memproses', color: 'blue' },
  PPKP_PROCESSING: { label: 'PPKP Memproses', color: 'purple' },
  PPL_REVIEW: { label: 'PPL Mengulas', color: 'teal' },
  PLB_DECISION: { label: 'Keputusan PLB', color: 'orange' },
  COMPLETED: { label: 'Selesai', color: 'green' },
  REJECTED: { label: 'Ditolak', color: 'red' },
} as const;

// Staff roles
export const STAFF_ROLES = {
  KAUNTER: { label: 'Kaunter' },
  PT: { label: 'Pembantu Tadbir (PT)' },
  PPKP_L: { label: 'PPKP(L)' },
  PPKP_P: { label: 'PPKP(P)' },
  PPL_L: { label: 'PPL(L) - Penolong Pengarah Pelesenan' },
  PPL_P: { label: 'PPL(P) - Penolong Pengarah Pelesenan' },
  PLB: { label: 'Pengarah Pelesenan Bandaraya (PLB)' },
} as const;

// Business types (for PERMOHONAN_BARU)
export const BUSINESS_TYPES = [
  'Restoran / Kedai Makan',
  'Kedai Runcit / Minimart',
  'Pasar Malam / Gerak Kerja',
  'Bidan / Klinik',
  'Salun Kecantikan / Pendandan Rambut',
  'Dobi / Cucian',
  'Stesen Minyak',
  'Bengkel Kenderaan',
  'Perkilangan / Kilang',
  'Pengangkutan / Logistik',
  'Pendidikan / Tuisyen',
  'Perkhidmatan Profesional',
  'Pertanian / Akuakultur',
  'Lain-lain',
] as const;

// Zones
export const ZONES = ['A', 'B', 'C', 'D', 'E'] as const;
export type Zone = (typeof ZONES)[number];

// PLB Decisions
export const PLB_DECISIONS = {
  SIMPAN_FAIL: { label: 'Simpan Fail' },
  JABATAN_KESIHATAN: { label: 'Hantar ke Jabatan Kesihatan' },
  JABATAN_PERANCANG_BANDAR: { label: 'Hantar ke Jabatan Perancang Bandar' },
  DITOLAK: { label: 'Ditolak' },
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
