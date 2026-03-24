/**
 * PPK DriveHub Maintenance Schedule Service
 * ระบบแจ้งเตือนการบำรุงรักษาอ้างอิงจากคู่มือรถของโตโยต้าและมาสด้า
 * ตามรุ่นของรถที่เพิ่มเข้าไปในระบบ
 */

/**
 * Maintenance Schedule Database
 * อ้างอิงจากคู่มือรถของโตโยต้าและมาสด้า
 */
var MAINTENANCE_SCHEDULES = {
  'toyota': {
    'vios': {
      brand: 'Toyota',
      model: 'Vios',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    },
    'camry': {
      brand: 'Toyota',
      model: 'Camry',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    },
    'fortuner': {
      brand: 'Toyota',
      model: 'Fortuner',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    },
    'hilux': {
      brand: 'Toyota',
      model: 'Hilux',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    }
  },
  'mazda': {
    'mazda2': {
      brand: 'Mazda',
      model: 'Mazda 2',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    },
    'mazda3': {
      brand: 'Mazda',
      model: 'Mazda 3',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    },
    'cx5': {
      brand: 'Mazda',
      model: 'CX-5',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    },
    'bt50': {
      brand: 'Mazda',
      model: 'BT-50',
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 20000, months: 24, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 40000, months: 48, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 60000, months: 60, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 80000, months: 72, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 100000, months: 84, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'เปลี่ยนไส้กรองแอร์', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'เปลี่ยนถ่ายน้ำมันเบรก', 'เปลี่ยนสายพาน', 'เปลี่ยนน้ำยาหล่อเย็น', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    }
  }
};

/**
 * Get Maintenance Schedule for Vehicle - ดึงตารางการบำรุงรักษาตามรุ่นรถ
 */
function getMaintenanceScheduleForVehicle(brand, model) {
  try {
    // Normalize brand and model
    var brandKey = brand.toLowerCase().replace(/\s+/g, '');
    var modelKey = model.toLowerCase().replace(/\s+/g, '').replace('-', '');
    
    // Check Toyota
    if (brandKey === 'toyota' && MAINTENANCE_SCHEDULES.toyota[modelKey]) {
      return MAINTENANCE_SCHEDULES.toyota[modelKey];
    }
    
    // Check Mazda
    if (brandKey === 'mazda' && MAINTENANCE_SCHEDULES.mazda[modelKey]) {
      return MAINTENANCE_SCHEDULES.mazda[modelKey];
    }
    
    // Default schedule if not found
    return {
      brand: brand,
      model: model,
      schedules: [
        { mileage: 5000, months: 6, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'ตรวจเช็คระบบต่างๆ'] },
        { mileage: 10000, months: 12, items: ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนไส้กรองน้ำมันเครื่อง', 'เปลี่ยนไส้กรองอากาศ', 'ตรวจเช็คระบบต่างๆ'] }
      ],
      default_interval_km: 5000,
      default_interval_months: 6
    };
    
  } catch (error) {
    Logger.log('Get maintenance schedule error: ' + error.toString());
    return null;
  }
}

/**
 * Get Next Maintenance Schedule - ดึงตารางการบำรุงรักษาถัดไปตามเลขไมล์ปัจจุบัน
 */
function getNextMaintenanceSchedule(carId, currentMileage) {
  try {
    var car = getVehicleById(carId);
    if (!car.success) {
      return null;
    }
    
    if (!car.success || !car.data || !car.data.vehicle) {
      return null;
    }
    var vehicle = car.data.vehicle;
    var schedule = getMaintenanceScheduleForVehicle(vehicle.brand, vehicle.model);
    
    if (!schedule || !schedule.schedules) {
      return null;
    }
    
    // Find next maintenance based on current mileage
    var nextSchedule = null;
    for (var i = 0; i < schedule.schedules.length; i++) {
      if (currentMileage < schedule.schedules[i].mileage) {
        nextSchedule = schedule.schedules[i];
        break;
      }
    }
    
    // If past all schedules, use the last one and calculate next
    if (!nextSchedule) {
      var lastSchedule = schedule.schedules[schedule.schedules.length - 1];
      var lastMileage = lastSchedule.mileage;
      var interval = schedule.default_interval_km;
      nextSchedule = {
        mileage: lastMileage + interval,
        months: lastSchedule.months + schedule.default_interval_months,
        items: lastSchedule.items
      };
    }
    
    return {
      schedule: nextSchedule,
      current_mileage: currentMileage,
      remaining_km: nextSchedule.mileage - currentMileage,
      vehicle_info: {
        brand: vehicle.brand,
        model: vehicle.model,
        license_plate: vehicle.license_plate
      }
    };
    
  } catch (error) {
    Logger.log('Get next maintenance schedule error: ' + error.toString());
    return null;
  }
}

/**
 * Get Maintenance Schedule - API endpoint
 */
function getMaintenanceSchedule(brand, model) {
  try {
    var schedule = getMaintenanceScheduleForVehicle(brand, model);
    
    if (!schedule) {
      return errorResponse('ไม่พบตารางการบำรุงรักษาสำหรับรุ่นนี้', 'SCHEDULE_NOT_FOUND');
    }
    
    return successResponse({
      schedule: schedule
    });
    
  } catch (error) {
    Logger.log('Get maintenance schedule error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Next Maintenance for Car - API endpoint
 */
function getNextMaintenanceForCar(carId) {
  try {
    // Get current mileage from latest usage record or fuel log
    var currentMileage = getCurrentMileage(carId);
    
    if (!currentMileage) {
      return errorResponse('ไม่พบเลขไมล์ปัจจุบันของรถ', 'MILEAGE_NOT_FOUND');
    }
    
    var nextMaintenance = getNextMaintenanceSchedule(carId, currentMileage);
    
    if (!nextMaintenance) {
      return errorResponse('ไม่สามารถคำนวณการบำรุงรักษาถัดไปได้', 'CALCULATION_ERROR');
    }
    
    return successResponse({
      next_maintenance: nextMaintenance
    });
    
  } catch (error) {
    Logger.log('Get next maintenance for car error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Current Mileage - ดึงเลขไมล์ปัจจุบันของรถ
 */
function getCurrentMileage(carId) {
  try {
    // Try to get from latest usage record
    var usageResult = getUsageRecordsRaw({ car_id: carId });
    if (usageResult.success && usageResult.data.records.length > 0) {
      var latestRecord = usageResult.data.records[0];
      if (latestRecord.mileage) {
        return parseFloat(latestRecord.mileage);
      }
    }
    
    // Try to get from latest fuel log
    var fuelResult = getFuelLogs({ car_id: carId });
    if (fuelResult.success && fuelResult.data.fuel_logs.length > 0) {
      var latestFuel = fuelResult.data.fuel_logs[0];
      if (latestFuel.mileage) {
        return parseFloat(latestFuel.mileage);
      }
    }
    
    // Try to get from latest repair log
    var repairResult = getRepairLogs({ car_id: carId });
    if (repairResult.success && repairResult.data.repair_logs.length > 0) {
      var latestRepair = repairResult.data.repair_logs[0];
      if (latestRepair.mileage_at_repair) {
        return parseFloat(latestRepair.mileage_at_repair);
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log('Get current mileage error: ' + error.toString());
    return null;
  }
}
