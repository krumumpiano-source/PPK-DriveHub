/**
 * โปรแกรมอ่านโน้ตเพลงเพื่อการศึกษา
 * Main Entry Point - Google Apps Script
 */

// Configuration
const CONFIG = {
  SHEET_ID: 'YOUR_SHEET_ID', // ต้องแทนที่ด้วย Sheet ID จริง
  USERS_SHEET: 'Users',
  SCORES_SHEET: 'Scores',
  LICENSES_SHEET: 'Licenses',
  ACCESS_LOGS_SHEET: 'AccessLogs',
  TAKEDOWN_SHEET: 'TakedownReports'
};

/**
 * HTTP GET Handler
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * HTTP POST Handler
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Main Request Handler
 */
function handleRequest(e, method) {
  try {
    // Parse request data
    let params = {};
    let path = '';
    
    if (method === 'GET') {
      params = e.parameter || {};
      path = params.path || e.pathInfo || '';
    } else if (method === 'POST') {
      // Parse POST data (JSON)
      if (e.postData && e.postData.contents) {
        try {
          params = JSON.parse(e.postData.contents);
        } catch (parseError) {
          // Fallback to parameter if JSON parse fails
          params = e.parameter || {};
        }
      } else {
        params = e.parameter || {};
      }
      path = params.path || e.pathInfo || '';
    }
    
    // Extract Authorization header
    const authHeader = e.parameter?.token || params.token || 
                      (e.headers && e.headers.Authorization ? 
                       e.headers.Authorization.replace('Bearer ', '') : '');
    if (authHeader) {
      params.token = authHeader;
    }
    
    const pathParts = path.split('/').filter(p => p);
    const action = pathParts[0] || '';
    
    // CORS Headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS (CORS preflight)
    if (method === 'OPTIONS') {
      return ContentService.createTextOutput('')
        .setMimeType(ContentService.MimeType.TEXT)
        .setHeaders(headers);
    }
    
    let result;
    
    // Route handling
    switch(action) {
      case 'login':
        result = handleLogin(params);
        break;
      case 'scores':
        result = handleScores(params, method, pathParts);
        break;
      case 'licenses':
        result = handleLicenses(params, method, pathParts);
        break;
      case 'takedown':
        result = handleTakedown(params, method);
        break;
      default:
        result = { success: false, message: 'Invalid endpoint' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
      
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    });
  }
}

/**
 * Handle Login Request
 */
function handleLogin(params) {
  const email = params.email;
  const password = params.password;
  
  if (!email || !password) {
    return { success: false, message: 'Email and password required' };
  }
  
  return AuthService.login(email, password);
}

/**
 * Handle Scores Requests
 */
function handleScores(params, method, pathParts) {
  const user = AuthService.getCurrentUser(params.token);
  if (!user) {
    return { success: false, message: 'Unauthorized' };
  }
  
  const action = pathParts[1] || params.action || '';
  
  switch(action) {
    case 'public':
      return ScoresService.listPublicScores();
    case 'restricted':
      return ScoresService.listRestrictedScores(user.user_id);
    case 'get':
    case '':
      // GET /scores/get?id=xxx or GET /scores?id=xxx
      const scoreId = params.score_id || params.id || pathParts[2];
      if (!scoreId) {
        return { success: false, message: 'Score ID required' };
      }
      return ScoresService.getScoreById(scoreId, user);
    case 'add':
      if (method !== 'POST') {
        return { success: false, message: 'Method not allowed' };
      }
      if (user.role !== 'admin') {
        return { success: false, message: 'Admin only' };
      }
      return ScoresService.addScore(params);
    default:
      return { success: false, message: 'Invalid action' };
  }
}

/**
 * Handle Licenses Requests
 */
function handleLicenses(params, method, pathParts) {
  const user = AuthService.getCurrentUser(params.token);
  if (!user) {
    return { success: false, message: 'Unauthorized' };
  }
  
  const action = pathParts[1] || params.action || '';
  
  switch(action) {
    case 'grant':
      if (method !== 'POST') {
        return { success: false, message: 'Method not allowed' };
      }
      if (user.role !== 'admin') {
        return { success: false, message: 'Admin only' };
      }
      return LicenseService.grantLicense(params.user_id, params.score_id);
    case 'check':
      const scoreId = params.score_id || params.id || pathParts[2];
      if (!scoreId) {
        return { success: false, message: 'Score ID required' };
      }
      return { 
        success: true, 
        hasLicense: LicenseService.userHasLicense(user.user_id, scoreId) 
      };
    default:
      return { success: false, message: 'Invalid action' };
  }
}

/**
 * Handle Takedown Requests
 */
function handleTakedown(params, method) {
  if (method !== 'POST') {
    return { success: false, message: 'Method not allowed' };
  }
  
  return TakedownService.reportCopyright(params);
}
