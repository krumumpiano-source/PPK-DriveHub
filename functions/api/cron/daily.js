import { dbAll, sendTelegramMessage } from '../../_helpers.js';

export async function onRequest(context) {
  const { env, request } = context;
  
  // Verify secret to prevent unauthorized execution
  const authHeader = request.headers.get('Authorization');
  const cronSecret = env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const today = new Date();
  today.setDate(today.getDate() + 30);
  const targetDate30Days = today.toISOString().substr(0, 10);
  
  let messages = [];

  try {
    // 1. Check for expiring tax/registration within 30 days
    const expiringCars = await dbAll(env.DB, 
      `SELECT license_plate, brand, registration_expiry 
       FROM cars 
       WHERE registration_expiry IS NOT NULL 
       AND registration_expiry != '' 
       AND registration_expiry <= ? 
       AND status != 'retired'`, 
      [targetDate30Days]
    );

    if (expiringCars && expiringCars.length > 0) {
      messages.push('<b>⚠️ แจ้งเตือน: ภาษี/พรบ. ใกล้หมดอายุ (ภายใน 30 วัน)</b>');
      expiringCars.forEach(c => {
        messages.push(`- ${c.license_plate} ${c.brand || ''} (หมดอายุ: ${c.registration_expiry})`);
      });
      messages.push(''); // blank line
    }

    // 2. Check for maintenance (e.g., oil change approaching)
    // Assume maintenance interval logic: if (next_km - current_mileage) <= 500
    const maintenanceCars = await dbAll(env.DB, 
      `SELECT license_plate, brand, current_mileage, next_km 
       FROM cars 
       WHERE next_km IS NOT NULL 
       AND (next_km - current_mileage) <= 500 
       AND status != 'retired'`
    );

    if (maintenanceCars && maintenanceCars.length > 0) {
      messages.push('<b>🔧 แจ้งเตือน: ใกล้ถึงระยะเช็คบำรุงรักษา (ภายใน 500 กม.)</b>');
      maintenanceCars.forEach(c => {
        messages.push(`- ${c.license_plate} ${c.brand || ''} (ไมล์ปัจจุบัน: ${c.current_mileage}, ระยะถัดไป: ${c.next_km})`);
      });
      messages.push(''); // blank line
    }

    // 3. Check for driver license expiry within 30 days
    const expiringDrivers = await dbAll(env.DB,
      `SELECT name, license_expiry
       FROM drivers
       WHERE license_expiry IS NOT NULL
       AND license_expiry != ''
       AND license_expiry <= ?
       AND status = 'active'`,
      [targetDate30Days]
    );

    if (expiringDrivers && expiringDrivers.length > 0) {
      messages.push('<b>⚠️ แจ้งเตือน: ใบขับขี่ใกล้หมดอายุ (ภายใน 30 วัน)</b>');
      expiringDrivers.forEach(d => {
        messages.push(`- ${d.name} (หมดอายุ: ${d.license_expiry})`);
      });
    }

    if (messages.length > 0) {
      const fullMessage = messages.join('\n');
      // await sendTelegramMessage(env, fullMessage);
      return new Response('Cron executed (Telegram notifications disabled).', { status: 200 });
    } else {
      return new Response('Cron executed. No notifications needed.', { status: 200 });
    }
  } catch (error) {
    return new Response(`Cron failed: ${error.message}`, { status: 500 });
  }
}
