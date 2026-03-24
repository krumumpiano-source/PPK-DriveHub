// API Configuration
const API_BASE_URL = 'YOUR_GAS_WEB_APP_URL'; // ต้องแทนที่ด้วย URL ของ Google Apps Script Web App

// Helper function สำหรับเรียก API
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'เกิดข้อผิดพลาด' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Auth API
async function login(email, password) {
    // GAS uses query parameters or path
    const params = new URLSearchParams({ email, password });
    return await apiCall(`?path=login&${params.toString()}`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

// Scores API
async function listPublicScores() {
    const result = await apiCall('?path=scores/public');
    return result.scores || [];
}

async function listRestrictedScores() {
    const result = await apiCall('?path=scores/restricted');
    return result.scores || [];
}

async function getScoreById(scoreId) {
    return await apiCall(`?path=scores/get&id=${scoreId}`);
}

async function addScore(scoreData) {
    return await apiCall('?path=scores/add', {
        method: 'POST',
        body: JSON.stringify(scoreData)
    });
}

// License API
async function grantLicense(userId, scoreId) {
    return await apiCall('?path=licenses/grant', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, score_id: scoreId })
    });
}

async function checkLicense(scoreId) {
    const result = await apiCall(`?path=licenses/check&id=${scoreId}`);
    return result.hasLicense || false;
}

// Takedown API
async function reportCopyright(reportData) {
    return await apiCall('?path=takedown/report', {
        method: 'POST',
        body: JSON.stringify(reportData)
    });
}

// Cache สำหรับ public scores (ลดโหลด GAS)
const cache = {
    publicScores: null,
    cacheTime: null,
    cacheDuration: 5 * 60 * 1000 // 5 นาที
};

async function getCachedPublicScores() {
    const now = Date.now();
    
    if (cache.publicScores && cache.cacheTime && (now - cache.cacheTime) < cache.cacheDuration) {
        return cache.publicScores;
    }
    
    const scores = await listPublicScores();
    cache.publicScores = scores;
    cache.cacheTime = now;
    
    return scores;
}

// Helper: Get score file URL with access logging
async function getScoreFileUrl(scoreId) {
    const score = await getScoreById(scoreId);
    if (score && score.hasAccess && score.score) {
        // Log access for restricted scores
        if (score.score.visibility === 'restricted') {
            const userId = localStorage.getItem('user_id');
            if (userId) {
                // Log access (call backend)
                try {
                    await fetch(`${API_BASE_URL}?path=scores/${scoreId}/access`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.error('Log access error:', error);
                }
            }
        }
        return score.score.file_url;
    }
    return null;
}

// Clear cache
function clearCache() {
    cache.publicScores = null;
    cache.cacheTime = null;
}
