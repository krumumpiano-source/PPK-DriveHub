export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const clientId = env.LINE_CHANNEL_ID; // Must be set in Cloudflare dashboard
  
  if (!clientId) {
    return new Response('LINE_CHANNEL_ID is not configured.', { status: 500 });
  }

  // Use the origin from the request URL as the redirect base
  const redirectUri = encodeURIComponent(`${url.origin}/api/auth/line/callback`);
  const state = crypto.randomUUID();
  const scope = 'profile%20openid%20email';

  // Store state in a cookie for CSRF protection
  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl,
      'Set-Cookie': `line_auth_state=${state}; Path=/; HttpOnly; Max-Age=300; Secure; SameSite=Lax`
    }
  });
}
