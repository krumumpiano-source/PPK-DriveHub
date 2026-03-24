/**
 * OFFLINE-FIRST MOCK DATA SYSTEM
 * ใช้เมื่อ API_BASE_URL ไม่ได้ตั้งค่าหรือไม่สามารถเชื่อมต่อ backend ได้
 * ข้อมูลจะถูกเก็บใน localStorage เพื่อให้เปิดไฟล์ HTML โดยตรงได้
 */

// Mock Data Storage
var MOCK_DATA_STORAGE = {
  // Users
  users: [
    {
      user_id: 'admin',
      full_name: 'ผู้ดูแลระบบ',
      email: 'admin@ppk.ac.th',
      role: 'admin',
      active: true,
      permissions: { queue: 'delete', fuel: 'delete', repair: 'delete', vehicles: 'delete', drivers: 'delete', reports: 'view', usage_log: 'view' }
    },
    {
      user_id: 'demo_user',
      full_name: 'ผู้ใช้ทดสอบ',
      email: 'demo@ppk.ac.th',
      role: 'vehicle',
      active: true,
      permissions: { queue: 'create', fuel: 'view', repair: 'view', vehicles: 'view', drivers: 'view', reports: 'view', usage_log: 'view' }
    }
  ],

  // Vehicles
  vehicles: [
    { car_id: 'car001', license_plate: 'กก-1234', brand: 'Toyota', model: 'Camry', year: 2020, status: 'available', vehicle_category: 'sedan' },
    { car_id: 'car002', license_plate: 'กก-5678', brand: 'Honda', model: 'CR-V', year: 2021, status: 'available', vehicle_category: 'suv' }
  ],

  // Drivers
  drivers: [
    { driver_id: 'driver001', full_name: 'นายทดสอบ คนขับ', phone: '0812345678', license_number: 'DL123456', status: 'active' },
    { driver_id: 'driver002', full_name: 'นายตัวอย่าง คนขับ', phone: '0823456789', license_number: 'DL234567', status: 'active' }
  ],

  // Queues
  queues: [],

  // Fuel Logs
  fuel_logs: [
    { fuel_id: 'f001', car_id: 'car001', date: '2023-01-15', fuel_type: 'gasoline_95', liters: 40, cost: 1400, created_at: '2023-01-15T10:00:00Z' }
  ],

  // Repair Logs
  repair_logs: [
    { repair_id: 'r001', car_id: 'car001', request_date: '2023-01-10', issue_desc: 'เปลี่ยนถ่ายน้ำมันเครื่อง', status: 'completed', cost: 1200, created_at: '2023-01-10T09:00:00Z' }
  ],

  // Usage Records
  usage_records: [
    { record_id: 'u001', car_id: 'car001', driver_id: 'driver001', record_type: 'out', datetime: '2023-01-20T08:00:00', mileage: 10000 },
    { record_id: 'u002', car_id: 'car001', driver_id: 'driver001', record_type: 'in', datetime: '2023-01-20T17:00:00', mileage: 10150 }
  ],

  // Notifications
  notifications: [
    {
      id: 'notif001',
      type: 'system',
      title: 'ยินดีต้อนรับ',
      message: 'ระบบพร้อมใช้งานแล้ว',
      created_at: new Date().toISOString(),
      read: false
    }
  ]
};

/**
 * Load mock data from localStorage or use defaults
 */
function loadMockData() {
  try {
    var stored = localStorage.getItem('ppk_drivehub_mock_data');
    if (stored) {
      var parsed = JSON.parse(stored);
      Object.keys(parsed).forEach(function (key) {
        if (MOCK_DATA_STORAGE[key]) {
          MOCK_DATA_STORAGE[key] = parsed[key];
        }
      });
    }
  } catch (e) {
    console.warn('Could not load mock data from localStorage:', e);
  }
}

/**
 * Save mock data to localStorage
 */
function saveMockData() {
  try {
    localStorage.setItem('ppk_drivehub_mock_data', JSON.stringify(MOCK_DATA_STORAGE));
  } catch (e) {
    console.warn('Could not save mock data to localStorage:', e);
  }
}

/**
 * Mock API Handler
 */
function mockApiCall(action, data) {
  console.log('[MOCK API]', action, data);

  // Simulate network delay
  return new Promise(function (resolve) {
    setTimeout(function () {
      var result = { success: false, message: 'Action not implemented in mock mode', data: null };

      switch (action) {
        case 'login':
          var user = MOCK_DATA_STORAGE.users.find(function (u) {
            return u.user_id === (data.username || data.user_id);
          });
          if (user) {
            result = {
              success: true,
              message: 'เข้าสู่ระบบสำเร็จ',
              data: {
                user_id: user.user_id,
                full_name: user.full_name,
                role: user.role,
                first_login: false,
                permissions: user.permissions || {}
              }
            };
          } else {
            result = { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', error: 'INVALID_CREDENTIALS' };
          }
          break;

        case 'getCurrentUserInfo':
          var userId = data.userId || 'demo_user';
          var user = MOCK_DATA_STORAGE.users.find(function (u) { return u.user_id === userId; });
          if (user) {
            result = { success: true, data: { user: user } };
          }
          break;

        case 'getVehicles':
          result = {
            success: true,
            data: {
              vehicles: MOCK_DATA_STORAGE.vehicles.filter(function (v) {
                return !data.filters || !data.filters.status || v.status === data.filters.status;
              })
            }
          };
          break;

        case 'getVehicleById':
          var car = MOCK_DATA_STORAGE.vehicles.find(function (v) { return v.car_id === data.carId; });
          if (car) {
            result = { success: true, data: { vehicle: car } };
          } else {
            result = { success: false, message: 'ไม่พบข้อมูลรถ', error: 'VEHICLE_NOT_FOUND' };
          }
          break;

        case 'getDrivers':
          result = {
            success: true,
            data: {
              drivers: MOCK_DATA_STORAGE.drivers.filter(function (d) {
                return !data.status || d.status === data.status;
              })
            }
          };
          break;

        case 'getDriverById':
          var driver = MOCK_DATA_STORAGE.drivers.find(function (d) { return d.driver_id === data.driverId; });
          if (driver) {
            result = { success: true, data: { driver: driver } };
          } else {
            result = { success: false, message: 'ไม่พบข้อมูลคนขับ', error: 'DRIVER_NOT_FOUND' };
          }
          break;

        case 'getQueues':
          result = {
            success: true,
            data: {
              queues: MOCK_DATA_STORAGE.queues.filter(function (q) {
                if (data.filters) {
                  if (data.filters.date && q.date !== data.filters.date) return false;
                  if (data.filters.status && q.status !== data.filters.status) return false;
                }
                return true;
              })
            }
          };
          break;

        case 'getNotifications':
          var userId = data.userId || 'demo_user';
          result = {
            success: true,
            data: {
              notifications: MOCK_DATA_STORAGE.notifications.filter(function (n) {
                return !n.user_id || n.user_id === userId;
              })
            }
          };
          break;

        case 'getFuelTypes':
          result = {
            success: true,
            data: {
              fuelTypes: [
                { id: 'gasoline_91', name: 'เบนซิน 91', price_per_liter: 0 },
                { id: 'gasoline_95', name: 'เบนซิน 95', price_per_liter: 0 },
                { id: 'diesel', name: 'ดีเซล', price_per_liter: 0 }
              ]
            }
          };
          break;

        case 'getDashboardStats':
        case 'getDashboardStatsToday':
          result = {
            success: true,
            data: {
              totalQueues: MOCK_DATA_STORAGE.queues.length,
              activeQueues: MOCK_DATA_STORAGE.queues.filter(function (q) { return q.status === 'running'; }).length,
              totalVehicles: MOCK_DATA_STORAGE.vehicles.length,
              availableVehicles: MOCK_DATA_STORAGE.vehicles.filter(function (v) { return v.status === 'available'; }).length,
              totalDrivers: MOCK_DATA_STORAGE.drivers.length,
              activeDrivers: MOCK_DATA_STORAGE.drivers.filter(function (d) { return d.status === 'active'; }).length
            }
          };
          break;

        case 'createQueue':
          var queueId = 'queue_' + Date.now();
          var newQueue = {
            queue_id: queueId,
            date: data.data.date || new Date().toISOString().split('T')[0],
            time_start: data.data.time_start || '08:00',
            car_id: data.data.car_id,
            driver_id: data.data.driver_id,
            destination: data.data.destination || '',
            status: 'pending',
            created_at: new Date().toISOString()
          };
          MOCK_DATA_STORAGE.queues.push(newQueue);
          saveMockData();
          result = { success: true, message: 'สร้างคิวสำเร็จ', data: { queue: newQueue } };
          break;

        case 'createFuelLog':
          var fuelId = 'fuel_' + Date.now();
          var newFuel = {
            fuel_id: fuelId,
            car_id: data.data.car_id,
            date: data.data.date || new Date().toISOString().split('T')[0],
            fuel_type: data.data.fuel_type,
            liters: data.data.liters || 0,
            cost: data.data.cost || 0,
            created_at: new Date().toISOString()
          };
          MOCK_DATA_STORAGE.fuel_logs.push(newFuel);
          saveMockData();
          result = { success: true, message: 'บันทึกการเติมน้ำมันสำเร็จ', data: { fuelLog: newFuel } };
          break;

        case 'createUsageRecord':
          var recordId = 'usage_' + Date.now();
          var newRecord = {
            record_id: recordId,
            car_id: data.car_id,
            driver_id: data.driver_id,
            record_type: data.record_type || 'out',
            datetime: data.datetime || new Date().toISOString(),
            mileage: data.mileage || 0,
            created_at: new Date().toISOString()
          };
          MOCK_DATA_STORAGE.usage_records.push(newRecord);
          saveMockData();
          result = { success: true, message: 'บันทึกการใช้งานสำเร็จ', data: { record: newRecord } };
          break;

        case 'getFuelLogs':
          result = {
            success: true,
            data: {
              logs: MOCK_DATA_STORAGE.fuel_logs.filter(function (l) {
                // Simple filter by car_id if present
                if (data.filters && data.filters.car_id && l.car_id !== data.filters.car_id) return false;
                return true;
              })
            }
          };
          break;

        case 'getRepairLogs':
          result = {
            success: true,
            data: {
              logs: MOCK_DATA_STORAGE.repair_logs.filter(function (l) {
                if (data.filters && data.filters.car_id && l.car_id !== data.filters.car_id) return false;
                return true;
              })
            }
          };
          break;

        case 'getUsageLogs':
          result = {
            success: true,
            data: {
              logs: MOCK_DATA_STORAGE.usage_records.filter(function (l) {
                if (data.filters && data.filters.car_id && l.car_id !== data.filters.car_id) return false;
                return true;
              })
            }
          };
          break;

        case 'getAllUsers':
        case 'getUsers':
          result = {
            success: true,
            data: {
              users: MOCK_DATA_STORAGE.users
            }
          };
          break;

        case 'createRepairRequest':
          var repairId = 'repair_' + Date.now();
          var newRepair = {
            repair_id: repairId,
            car_id: data.data.car_id,
            request_date: new Date().toISOString().split('T')[0],
            issue_desc: data.data.issue,
            status: 'pending',
            created_at: new Date().toISOString()
          };
          MOCK_DATA_STORAGE.repair_logs.push(newRepair);
          saveMockData();
          result = { success: true, message: 'แจ้งซ่อมสำเร็จ', data: { repair: newRepair } };
          break;

        case 'updateMyProfile':
        case 'changePassword':
          result = { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
          break;

        case 'createDailyCheck':
          result = { success: true, message: 'บันทึกผลการตรวจเช็คสำเร็จ' };
          break;

        default:
          result = {
            success: false,
            message: 'Action "' + action + '" is not implemented in offline mode (Mock).',
            error: 'MOCK_NOT_IMPLEMENTED',
            data: null
          };
      }

      resolve(result);
    }, 100); // Simulate 100ms delay
  });
}

// Initialize mock data on load
if (typeof window !== 'undefined') {
  loadMockData();
}
