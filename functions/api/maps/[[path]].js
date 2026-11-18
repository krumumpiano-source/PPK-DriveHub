import { success, error } from '../../_helpers.js';

function extractThaiAddress(addr = {}) {
  const tambon = addr.suburb || addr.quarter || addr.Tambon || addr.subdistrict || addr.village || addr.hamlet || addr.town || '';
  const amphoe = addr.city_district || addr.district || addr.county || addr.municipality || addr.city || '';
  const province = addr.state || addr.province || addr.region || '';
  return {
    tambon: String(tambon).replace(/^(ตำบล|ต\.|แขวง)\s*/i, '').trim(),
    amphoe: String(amphoe).replace(/^(อำเภอ|อ\.|เขต)\s*/i, '').trim(),
    province: String(province).replace(/^(จังหวัด|จ\.)\s*/i, '').trim(),
    road: addr.road || '',
    place_name: addr.amenity || addr.building || addr.office || addr.school || addr.tourism || addr.shop || ''
  };
}

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
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=th&accept-language=th&q=${encodeURIComponent(q)}`, { headers });
      const data = await res.json();
      const enriched = Array.isArray(data) ? data.map(item => ({
        ...item,
        thai_address: extractThaiAddress(item.address || {})
      })) : data;
      return success(enriched);
    }

    if (path.includes('/maps/reverse')) {
      const lat = url.searchParams.get('lat');
      const lng = url.searchParams.get('lng') || url.searchParams.get('lon');
      if (!lat || !lng) return error('Missing lat/lng', 400);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=th&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`, { headers });
      const data = await res.json();
      const parsed = extractThaiAddress(data?.address || {});
      return success({
        display_name: data?.display_name || '',
        name: data?.name || parsed.place_name || '',
        ...parsed,
        raw_address: data?.address || {}
      });
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
