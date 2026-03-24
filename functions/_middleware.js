// PPK DriveHub - Middleware
// Parses Bearer token, attaches user to request context

import { verifyJWT, fail, corsHeaders } from './_helpers.js';

export const PUBLIC_ACTIONS = new Set([
  'login', 'register', 'registerUser',
  'forgotPassword', 'resetPasswordConfirm', 'checkEmailVerification',
  'sendEmailVerification', 'verifyEmail',
  'createDailyCheck', 'createUsageRecord', 'createFuelLog',
  'getFuelTypes', 'getVehicleById', 'scanQRForUsageRecord',
  'getPublicLandingStats', 'getDefaultSettings', 'isExecutiveMode',
  'setup'
]);

export async function withAuth(request, env, action) {
  if (PUBLIC_ACTIONS.has(action)) {
    return { user: null, error: null };
  }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return { user: null, error: fail('ต้องล็อกอินก่อนใช้งาน', 'AUTHENTICATION_REQUIRED', 401) };
  }

  const secret = env.JWT_SECRET || 'ppk-drivehub-secret-2569-change-in-production';
  const payload = await verifyJWT(token, secret);
  if (!payload) {
    return { user: null, error: fail('Session หมดอายุหรือไม่ถูกต้อง กรุณาล็อกอินใหม่', 'TOKEN_INVALID', 401) };
  }

  return { user: payload, error: null };
}

export function requireAdmin(user) {
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return fail('ไม่มีสิทธิ์ใช้งานฟังก์ชันนี้ (ต้องเป็น Admin)', 'NO_PERMISSION', 403);
  }
  return null;
}

export function requirePermission(user, module, level) {
  if (!user) return fail('ต้องล็อกอินก่อน', 'AUTHENTICATION_REQUIRED', 401);
  if (user.role === 'admin' || user.role === 'super_admin') return null;

  const levels = { view: 1, create: 2, edit: 3, delete: 4 };
  const perms = user.permissions || {};
  const userLevel = levels[perms[module]] || 0;
  const reqLevel = levels[level] || 0;

  if (userLevel < reqLevel) {
    return fail(`ไม่มีสิทธิ์ระดับ ${level} สำหรับโมดูล ${module}`, 'NO_PERMISSION', 403);
  }
  return null;
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
