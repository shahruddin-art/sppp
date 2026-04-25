import { createHash, createHmac } from 'crypto';

// JWT secret from environment or fallback for dev
const JWT_SECRET = process.env.JWT_SECRET || 'mpsp-dev-secret-key-2024-change-in-production';

export interface UserSession {
  id: string;
  username: string;
  role: string;
  name: string;
  zone: string | null;
}

/**
 * Hash a password using SHA-256
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Create a signed session token (JWT-like)
 * Format: base64url(payload).base64url(signature)
 */
export function createSessionToken(user: UserSession): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    zone: user.zone,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');

  const signature = createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode a session token
 * Returns the user session if valid, null otherwise
 */
export function verifySessionToken(token: string): UserSession | null {
  try {
    const [payloadB64, signature] = token.split('.');

    if (!payloadB64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(payloadB64)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadStr);

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      name: payload.name,
      zone: payload.zone ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Extract and verify session from request cookies
 */
export function getSessionFromRequest(request: Request): UserSession | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, c) => {
    const [key, ...val] = c.trim().split('=');
    acc[key] = val.join('=');
    return acc;
  }, {});

  const sessionToken = cookies['session'];
  if (!sessionToken) return null;

  return verifySessionToken(sessionToken);
}
