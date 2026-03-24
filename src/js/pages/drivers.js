import { requireAuth } from '../auth.js'
import { renderNav } from '../nav.js'

if (!requireAuth()) { location.href = '/login' }
renderNav('drivers')

document.getElementById('loading').style.display = 'none'
document.getElementById('pageContent').style.display = 'block'
