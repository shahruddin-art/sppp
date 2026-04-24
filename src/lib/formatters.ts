import { APPLICATION_TYPES, WORKFLOW_STEPS, APPLICATION_STATUSES, STAFF_ROLES, PO_DECISIONS } from './constants';

export function formatApplicationType(type: string): string {
  return (APPLICATION_TYPES as any)[type]?.label || type;
}

export function formatStepName(step: string): string {
  return (WORKFLOW_STEPS as any)[step]?.label || step;
}

export function formatStatus(status: string): string {
  return (APPLICATION_STATUSES as any)[status]?.label || status;
}

export function formatStaffRole(role: string): string {
  return (STAFF_ROLES as any)[role]?.label || role;
}

export function formatPoDecision(decision: string): string {
  return (PO_DECISIONS as any)[decision]?.label || decision;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING_PT: 'bg-amber-100 text-amber-800 border-amber-200',
    PT_PROCESSING: 'bg-sky-100 text-sky-800 border-sky-200',
    PPKP_PROCESSING: 'bg-violet-100 text-violet-800 border-violet-200',
    PPL_REVIEW: 'bg-teal-100 text-teal-800 border-teal-200',
    PO_DECISION: 'bg-orange-100 text-orange-800 border-orange-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getStepStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
    IN_PROGRESS: 'bg-sky-100 text-sky-700 border-sky-200',
    COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    OVERDUE: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getZoneColor(zone: string): string {
  const colors: Record<string, string> = {
    A: 'bg-rose-100 text-rose-700 border-rose-200',
    B: 'bg-amber-100 text-amber-700 border-amber-200',
    C: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    D: 'bg-sky-100 text-sky-700 border-sky-200',
    E: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  return colors[zone] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('ms-MY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('ms-MY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getRemainingTime(deadline: string | Date | null): { text: string; isOverdue: boolean; isWarning: boolean } {
  if (!deadline) return { text: '-', isOverdue: false, isWarning: false };

  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();

  if (diff < 0) {
    const overdueDays = Math.abs(diff) / (1000 * 60 * 60 * 24);
    if (overdueDays >= 1) {
      return { text: `Lewat ${Math.floor(overdueDays)} hari`, isOverdue: true, isWarning: false };
    }
    const overdueHours = Math.abs(diff) / (1000 * 60 * 60);
    return { text: `Lewat ${Math.floor(overdueHours)} jam`, isOverdue: true, isWarning: false };
  }

  const days = diff / (1000 * 60 * 60 * 24);
  if (days >= 1) {
    return { text: `${Math.floor(days)} hari lagi`, isOverdue: false, isWarning: days <= 1 };
  }

  const hours = diff / (1000 * 60 * 60);
  if (hours >= 1) {
    return { text: `${Math.floor(hours)} jam lagi`, isOverdue: false, isWarning: true };
  }

  const minutes = diff / (1000 * 60);
  return { text: `${Math.floor(minutes)} minit lagi`, isOverdue: false, isWarning: true };
}

export function getDuration(start: string | Date | null, end: string | Date | null): string {
  if (!start) return '-';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const diff = e.getTime() - s.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days >= 1) return `${Math.round(days * 10) / 10} hari`;
  const hours = diff / (1000 * 60 * 60);
  return `${Math.round(hours * 10) / 10} jam`;
}
