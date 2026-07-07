import { dbFirst, dbRun, generateUUID, generateToken, now } from '../../../_helpers.js';

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code) {
    return new Response('No authorization code provided.', { status: 400 });
  }

  const clientId = env.LINE_CHANNEL_ID;
  const clientSecret = env.LINE_CHANNEL_SECRET;
  
  if (!clientId || !clientSecret) {
    return new Response('LINE App credentials are not configured.', { status: 500 });
  }

  const redirectUri = `${url.origin}/api/auth/line/callback`;

  // Exchange code for access token
  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'authorization_code');
  tokenParams.append('code', code);
  tokenParams.append('redirect_uri', redirectUri);
  tokenParams.append('client_id', clientId);
  tokenParams.append('client_secret', clientSecret);

  let tokenData;
  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    return new Response('Failed to get token from LINE.', { status: 500 });
  }

  if (!tokenData.access_token) {
    return new Response('Invalid token response from LINE.', { status: 400 });
  }

  // Get user profile
  let profileData;
  try {
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    profileData = await profileRes.json();
  } catch (err) {
    return new Response('Failed to get user profile from LINE.', { status: 500 });
  }

  if (!profileData.userId) {
    return new Response('Invalid profile response from LINE.', { status: 400 });
  }

  // Find user by line_user_id
  const lineUserId = profileData.userId;
  let user = await dbFirst(env.DB, 'SELECT * FROM users WHERE line_user_id = ? AND active = 1', [lineUserId]);

  if (!user) {
    // If not found, check if they are trying to link from an existing logged-in session?
    // Since this is a simple callback, we'll just redirect to an error page or login with error.
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/login.html?error=line_not_linked`
      }
    });
  }

  // Create session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await dbRun(env.DB,
    'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [generateUUID(), user.id, token, expiresAt, now()]
  );

  // Update last login
  await dbRun(env.DB, 'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
    [now(), now(), user.id]);

  // Encode user data to pass via URL (frontend will save to localStorage)
  const userData = encodeURIComponent(JSON.stringify({
    user_id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    permissions: JSON.parse(user.permissions || '{}'),
    must_change_password: user.must_change_password === 1,
    pdpa_accepted: user.pdpa_accepted === 1
  }));

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `/login.html?token=${token}&user=${userData}`
    }
  });
}
