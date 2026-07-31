import { dbAll, dbFirst, sendTelegramMessage } from '../../_helpers.js';

export async function onRequest(context) {
  const { env, request } = context;

  // Verify secret to prevent unauthorized execution
  const authHeader = request.headers.get('Authorization');
  const cronSecret = env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  
  const todayStr = today.toISOString().substring(0, 10);
  const lastWeekStr = lastWeek.toISOString().substring(0, 10);

  try {
    // 1. Total queues/trips
    const queues = await dbFirst(env.DB, 
      `SELECT COUNT(*) as count FROM queue WHERE date >= ? AND date <= ? AND status IN ('completed', 'done', 'running', 'active')`,
      [lastWeekStr, todayStr]
    );
    const totalTrips = queues ? queues.count : 0;

    // 2. Total fuel cost
    const fuels = await dbFirst(env.DB, 
      `SELECT SUM(cost) as total_cost FROM fuel_records WHERE date >= ? AND date <= ?`,
      [lastWeekStr, todayStr]
    );
    const totalFuelCost = fuels && fuels.total_cost ? fuels.total_cost : 0;

    // 3. Total repair cost
    const repairs = await dbFirst(env.DB, 
      `SELECT SUM(cost) as total_cost FROM repair_records WHERE repair_date >= ? AND repair_date <= ?`,
      [lastWeekStr, todayStr]
    );
    const totalRepairCost = repairs && repairs.total_cost ? repairs.total_cost : 0;

    const message = `📊 <b>สรุปรายงานประจำสัปดาห์ (${lastWeekStr} ถึง ${todayStr})</b>\n\n` +
                    `🚗 จำนวนการใช้รถ: ${totalTrips} เที่ยว\n` +
                    `⛽ ค่าใช้จ่ายน้ำมัน: ฿${totalFuelCost.toLocaleString('th-TH')}\n` +
                    `🔧 ค่าซ่อมบำรุง: ฿${totalRepairCost.toLocaleString('th-TH')}\n\n` +
                    `📌 กรุณาตรวจสอบรายละเอียดเพิ่มเติมในระบบ`;

    // await sendTelegramMessage(env, message);
    return new Response('Weekly report generated (Telegram disabled)', { status: 200 });
  } catch (error) {
    return new Response(`Cron failed: ${error.message}`, { status: 500 });
  }
}
