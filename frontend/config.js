/**
 * PPK DriveHub Frontend Configuration
 * Cloudflare Pages + D1 backend
 */
const CONFIG = {
    // Cloudflare Pages Functions handle /api on the same origin
    // Leave empty string — Pages Function at /api handles all requests
    API_BASE_URL: '/api',

    // System Info
    SYSTEM_NAME: 'PPK DriveHub',
    SYSTEM_VERSION: '2.0.0',

    // Timeout settings
    REQUEST_TIMEOUT: 30000 // 30 seconds
};
