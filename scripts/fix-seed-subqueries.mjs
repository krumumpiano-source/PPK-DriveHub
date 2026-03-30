import { readFileSync, writeFileSync } from 'fs';

const carMap = {
  'กมว 593': '3e578d16-d0d2-4271-ac50-9170f64a9217',
  'บธ 789': '00736ea4-5cd7-4544-980f-a209db3dcf32',
  '40-0062': 'd1def56d-493a-47d6-a164-8d99c7ab44bd',
  '40-0158': '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  'นข 358': 'b7ee9471-dda3-45a5-94b0-605980a5214b',
  'นข 2455': 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  'นข 3816': 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  'นข 1977': 'b43ad8e2-04d0-40e0-90ab-d598bf44282d',
  'กจ 5192': '97d66518-d511-4ae2-abcb-54a491b5f13c',
};

const driverMap = {
  'ชารี ศรีพรม': '91e0301c-4cd3-4cf5-ba0d-6c69788f9d5a',
  'ณัฐวุฒิ ใหญ่วงศ์': 'b494cfd8-7cd6-4801-8e1f-db14de8866c7',
  'สมชาย พรมศร': '0ac38057-2288-4cf8-a2a0-3303cb21be15',
  'สุรเชษฐ์ บุริวงศ์': '29954b0c-8089-4560-adad-f9d724fba7e4',
  'สงกรานต์ แก้วสา': 'de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c',
  'กันต์กวี ชัยทะ': 'b4442829-6e5b-4275-bd46-f112c1d19b75',
  'มานพ โลหะกิจ': 'd4db9fee-d77e-4ea6-b979-0a180c865e62',
  'เกรียง กุศลมา': '2822d25f-e6a0-4b91-81f0-124b4b82dd41',
  'เปรมฤทธิ์ อินแต่ง': 'c8f2c74e-bcab-47d2-9ea6-c6582faee618',
  'สหรัฐ พลับพลา': '6a6ff713-82d1-4bb7-9e83-233f8c866d63',
};

for (const file of ['seed-historical-usage.sql', 'seed-historical-fuel.sql']) {
  const path = `d:/AI CURSER/ppk-drivehub/migrations/${file}`;
  let content = readFileSync(path, 'utf8');
  const origLen = content.length;

  for (const [plate, id] of Object.entries(carMap)) {
    content = content.replaceAll(
      `(SELECT id FROM cars WHERE license_plate = '${plate}')`,
      `'${id}'`
    );
  }

  for (const [name, id] of Object.entries(driverMap)) {
    content = content.replaceAll(
      `(SELECT id FROM drivers WHERE name LIKE '%${name}%' LIMIT 1)`,
      `'${id}'`
    );
  }

  writeFileSync(path, content, 'utf8');
  const remaining = (content.match(/SELECT id FROM/g) || []).length;
  console.log(`${file}: ${origLen} -> ${content.length} chars, ${remaining} subqueries remaining`);
}
