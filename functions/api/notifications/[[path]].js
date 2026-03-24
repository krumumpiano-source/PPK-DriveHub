// User notifications
import {
  dbAll, dbFirst, dbRun, success, error
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/notifications/read-all' && method === 'PUT') {
    await dbRun(env.DB,
      `UPDATE notifications SET is_read = 1, read_at = ? WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
      [new Date().toISOString(), user.id]
    );
    return success({ message: 'อ่านการแจ้งเตือนทั้งหมดแล้ว' });
  }

  if (path === '/api/notifications' && method === 'GET') {
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50'));
    const where = unreadOnly
      ? '(user_id = ? OR user_id IS NULL) AND is_read = 0'
      : '(user_id = ? OR user_id IS NULL)';
    const rows = await dbAll(env.DB,
      `SELECT * FROM notifications WHERE ${where}
       ORDER BY created_at DESC LIMIT ?`,
      [user.id, limit]
    );
    const unreadCount = await dbFirst(env.DB,
      `SELECT COUNT(*) as cnt FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
      [user.id]
    );
    return success({ notifications: rows, unread_count: unreadCount?.cnt || 0 });
  }

  if (path.match(/\/api\/notifications\/[^/]+\/read/) && method === 'PUT') {
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [new Date().toISOString(), id, user.id]
    );
    return success({ message: 'อ่านการแจ้งเตือนแล้ว' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}