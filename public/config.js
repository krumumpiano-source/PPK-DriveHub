/**
 * PPK DriveHub Frontend Configuration
 * Cloudflare Pages + D1 backend
 *
 * This file is served as /config.js via Vite publicDir.
 * It must attach to window so ES modules can read it.
 */
(function () {
    const DEFAULT_CONFIG = {
        // Cloudflare Pages Functions handle /api on the same origin
        // Set to '' only if you intentionally want offline/mock mode.
        API_BASE_URL: '/api',

        // System Info
        SYSTEM_NAME: 'PPK DriveHub',
        SYSTEM_VERSION: '2.0.0',

        // Timeout settings
        REQUEST_TIMEOUT: 30000 // 30 seconds
    }

    window.CONFIG = {
        ...DEFAULT_CONFIG,
        ...(window.CONFIG || {})
    }
})()
