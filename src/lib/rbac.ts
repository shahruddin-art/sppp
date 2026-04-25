/**
 * Centralized RBAC (Role-Based Access Control) utility
 * 
 * Defines role permissions and provides helpers for authorization checks.
 */

import { getSessionFromRequest, UserSession } from './auth';

// ─── Role Definitions ────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'KAUNTER' | 'PT' | 'PPKP_L' | 'PPKP_P' | 'PPL_L' | 'PPL_P' | 'PLB';

export const ALL_ROLES: Role[] = ['ADMIN', 'KAUNTER', 'PT', 'PPKP_L', 'PPKP_P', 'PPL_L', 'PPL_P', 'PLB'];

// ─── Workflow Actions ────────────────────────────────────────────────────────

export type WorkflowAction = 'OPEN_FILE' | 'REGISTER_FILE' | 'PPKP_COMPLETE' | 'PPL_REVIEW_COMPLETE' | 'PLB_DECIDE';

/**
 * Maps each workflow action to the roles that are authorized to perform it.
 */
const ACTION_ROLE_MAP: Record<WorkflowAction, Role[]> = {
  OPEN_FILE: ['PT'],
  REGISTER_FILE: ['PT'],
  PPKP_COMPLETE: ['PPKP_L', 'PPKP_P'],
  PPL_REVIEW_COMPLETE: ['PPL_L', 'PPL_P'],
  PLB_DECIDE: ['PLB'],
};

/**
 * Maps each action to the application status that must be current for the action to be valid.
 */
const ACTION_STATUS_MAP: Record<WorkflowAction, string[]> = {
  OPEN_FILE: ['PENDING_PT'],
  REGISTER_FILE: ['PT_PROCESSING'],
  PPKP_COMPLETE: ['PPKP_PROCESSING'],
  PPL_REVIEW_COMPLETE: ['PPL_REVIEW'],
  PLB_DECIDE: ['PLB_DECISION'],
};

// ─── API Permission Matrix ──────────────────────────────────────────────────

/**
 * Which roles can access POST /api/applications (create new application)
 */
const CAN_CREATE_APPLICATION: Role[] = ['KAUNTER'];

/**
 * Which roles can access GET /api/applications (list applications)
 * All authenticated roles can list, but data will be filtered by role.
 */
const CAN_LIST_APPLICATIONS: Role[] = ['ADMIN', 'KAUNTER', 'PT', 'PPKP_L', 'PPKP_P', 'PPL_L', 'PPL_P', 'PLB'];

/**
 * Which roles can access GET /api/dashboard
 */
const CAN_VIEW_DASHBOARD: Role[] = ['ADMIN', 'KAUNTER', 'PT', 'PPKP_L', 'PPKP_P', 'PPL_L', 'PPL_P', 'PLB'];

/**
 * Which roles can access GET /api/performance
 */
const CAN_VIEW_PERFORMANCE: Role[] = ['ADMIN', 'PLB', 'PPL_L', 'PPL_P'];

/**
 * Which roles can access GET /api/staff
 */
const CAN_VIEW_STAFF: Role[] = ['ADMIN', 'KAUNTER', 'PT', 'PPKP_L', 'PPKP_P', 'PPL_L', 'PPL_P', 'PLB'];

/**
 * Which roles can access POST /api/seed
 */
const CAN_SEED: Role[] = ['ADMIN'];

// ─── Authorization Helpers ──────────────────────────────────────────────────

/**
 * Check if a role is authorized to perform a workflow action.
 */
export function canPerformAction(role: string, action: WorkflowAction): boolean {
  const allowedRoles = ACTION_ROLE_MAP[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as Role);
}

/**
 * Get the allowed actions for a given role.
 */
export function getAllowedActions(role: string): WorkflowAction[] {
  return (Object.entries(ACTION_ROLE_MAP) as [WorkflowAction, Role[]][])
    .filter(([, roles]) => roles.includes(role as Role))
    .map(([action]) => action);
}

/**
 * Check if the application status is valid for the given action.
 */
export function isActionStatusValid(action: WorkflowAction, applicationStatus: string): boolean {
  const validStatuses = ACTION_STATUS_MAP[action];
  if (!validStatuses) return false;
  return validStatuses.includes(applicationStatus);
}

/**
 * Check if a role can create applications.
 */
export function canCreateApplication(role: string): boolean {
  return CAN_CREATE_APPLICATION.includes(role as Role);
}

/**
 * Check if a role can list applications.
 */
export function canListApplications(role: string): boolean {
  return CAN_LIST_APPLICATIONS.includes(role as Role);
}

/**
 * Check if a role can view the dashboard.
 */
export function canViewDashboard(role: string): boolean {
  return CAN_VIEW_DASHBOARD.includes(role as Role);
}

/**
 * Check if a role can view performance data.
 */
export function canViewPerformance(role: string): boolean {
  return CAN_VIEW_PERFORMANCE.includes(role as Role);
}

/**
 * Check if a role can view staff data.
 */
export function canViewStaff(role: string): boolean {
  return CAN_VIEW_STAFF.includes(role as Role);
}

/**
 * Check if a role can seed the database.
 */
export function canSeed(role: string): boolean {
  return CAN_SEED.includes(role as Role);
}

// ─── Session & Auth Helpers ─────────────────────────────────────────────────

/**
 * Require an authenticated session. Returns the user session or an error response.
 */
export function requireAuth(request: Request): { user: UserSession } | { error: Response } {
  const session = getSessionFromRequest(request);
  if (!session) {
    return {
      error: new Response(JSON.stringify({ error: 'Sesi tidak sah. Sila log masuk semula.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  return { user: session };
}

/**
 * Require an authenticated session with one of the specified roles.
 */
export function requireRole(request: Request, roles: Role[]): { user: UserSession } | { error: Response } {
  const authResult = requireAuth(request);
  if ('error' in authResult) return authResult;

  if (!roles.includes(authResult.user.role as Role)) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Anda tidak mempunyai kebenaran untuk melakukan tindakan ini.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return { user: authResult.user };
}

/**
 * Require an authenticated session with a specific role.
 */
export function requireExactRole(request: Request, role: Role): { user: UserSession } | { error: Response } {
  return requireRole(request, [role]);
}

// ─── Zone Validation ────────────────────────────────────────────────────────

/**
 * Validate that a PT user can access applications in the given zone.
 * Returns true if the user has access, false otherwise.
 * Non-PT roles always return true (they don't have zone restrictions).
 */
export function canAccessZone(user: UserSession, zone: string): boolean {
  // ADMIN has access to all zones
  if (user.role === 'ADMIN') return true;

  // PT users can only access their assigned zone
  if (user.role === 'PT') {
    return user.zone === zone;
  }

  // Other roles don't have zone restrictions for viewing
  return true;
}

/**
 * Validate that a PT user is assigned to the application's zone for action.
 */
export function canPerformActionOnZone(user: UserSession, applicationZone: string): boolean {
  // ADMIN bypasses zone check
  if (user.role === 'ADMIN') return true;

  // PT must match zone
  if (user.role === 'PT') {
    return user.zone === applicationZone;
  }

  // Other roles don't have zone restrictions for actions
  return true;
}

// ─── Application Filtering by Role ──────────────────────────────────────────

/**
 * Get the filter conditions for listing applications based on user role.
 * This ensures users only see applications relevant to their role.
 * 
 * Note: Complex role-based filtering (e.g., PPKP only seeing their routed applications)
 * is handled client-side in the dashboard components. This server-side filter
 * primarily enforces zone restrictions for PT users.
 */
export function getApplicationFilterForRole(user: UserSession): Record<string, any> {
  switch (user.role) {
    case 'ADMIN':
      // Admin sees everything
      return {};
    case 'KAUNTER':
      // Kaunter sees all applications (they register them)
      return {};
    case 'PT':
      // PT only sees applications in their zone
      if (user.zone) {
        return { zone: user.zone };
      }
      return {};
    case 'PPKP_L':
    case 'PPKP_P':
    case 'PPL_L':
    case 'PPL_P':
    case 'PLB':
      // PPKP, PPL, and PLB see all applications (client-side dashboards filter by role)
      return {};
    default:
      return {};
  }
}
