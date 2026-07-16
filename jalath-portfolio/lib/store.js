const fs = require('fs/promises');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
let writeQueue = Promise.resolve();

async function readData() {
  const raw = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function updateData(mutator) {
  writeQueue = writeQueue.then(async () => {
    const data = await readData();
    const updated = await mutator(data) || data;
    const tempPath = `${DB_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(updated, null, 2), 'utf8');
    await fs.rename(tempPath, DB_PATH);
    return updated;
  });
  return writeQueue;
}

module.exports = { readData, updateData };
