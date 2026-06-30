import { success, error } from '../../_helpers.js';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const headers = {
    'User-Agent': 'PPK-DriveHub/1.0 (Contact: admin@ppk.ac.th)'
  };

  try {
    if (path.includes('/maps/search')) {
      const q = url.searchParams.get('q');
      if (!q) return error('Missing query', 400);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&accept-language=th&q=${encodeURIComponent(q)}`, { headers });
      const data = await res.json();
      return success(data);
    }

    if (path.includes('/maps/route')) {
      const coords = url.searchParams.get('coords');
      if (!coords) return error('Missing coords', 400);
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`, { headers });
      const data = await res.json();
      return success(data);
    }

    return error('Not Found', 404);
  } catch (err) {
    return error(err.message, 500);
  }
}
