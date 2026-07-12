import fs from 'fs';

const schemaPath = 'migrations/schema.sql';
let newSchema = fs.readFileSync(schemaPath, 'utf8');
const files = fs.readdirSync('migrations').filter(f => f !== 'schema.sql' && f.endsWith('.sql'));

// First pass: Add missing tables
for (const file of files) {
  const content = fs.readFileSync('migrations/' + file, 'utf8');
  const createRegex = /CREATE TABLE IF NOT EXISTS (\w+) \([\s\S]*?\);/gi;
  let match;
  while ((match = createRegex.exec(content)) !== null) {
    const tableName = match[1];
    const tableDef = match[0];
    const existingTableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\(`, 'i');
    if (!existingTableRegex.test(newSchema)) {
      console.log(`Adding table ${tableName}`);
      newSchema += `\n\n-- Added from ${file}\n${tableDef}`;
    }
  }
}

// Second pass: Add missing columns
for (const file of files) {
  const content = fs.readFileSync('migrations/' + file, 'utf8');
  const regex = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)\s+([\s\S]*?);/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const tableName = match[1];
    const colName = match[2];
    const colDef = match[3].replace(/--.*/g, '').trim(); // remove inline comments
    
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\([\\s\\S]*?\\);`, 'i');
    const tableMatch = newSchema.match(tableRegex);
    if (tableMatch) {
      const hasCol = new RegExp(`\\b${colName}\\b`, 'i').test(tableMatch[0]);
      if (!hasCol) {
        console.log(`Adding column ${colName} to ${tableName}`);
        newSchema = newSchema.replace(tableRegex, (tMatch) => {
          return tMatch.replace(/\(\r?\n/, `(\n  ${colName} ${colDef},\n`);
        });
      }
    } else {
      console.log(`Table ${tableName} not found in schema.sql!`);
    }
  }
}

fs.writeFileSync(schemaPath, newSchema);
console.log('Schema updated successfully.');
