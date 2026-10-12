const fs = require('fs');
const path = require('path');

// File-based storage: one JSON file per group.
// Data is cached in memory and flushed to disk with a short debounce,
// writes are atomic (tmp file + rename).

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const WRITE_DELAY_MS = 300;

fs.mkdirSync(DATA_DIR, { recursive: true });

const cache = new Map();         // groupId -> { tasks, monthNotes }
const pendingWrites = new Map(); // groupId -> timeout

function isValidGroupId(groupId) {
  return typeof groupId === 'string' && groupId.length > 0 && groupId.length <= 100;
}

function fileFor(groupId) {
  // encodeURIComponent leaves only [A-Za-z0-9-_.!~*'()%], dots are escaped to rule out '..'
  const name = encodeURIComponent(groupId).replace(/\./g, '%2E');
  return path.join(DATA_DIR, `${name}.json`);
}

function emptyGroup() {
  return { tasks: [], monthNotes: {} };
}

function getGroup(groupId) {
  if (cache.has(groupId)) return cache.get(groupId);

  let data = emptyGroup();
  try {
    const raw = JSON.parse(fs.readFileSync(fileFor(groupId), 'utf8'));
    data = {
      tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
      monthNotes: raw.monthNotes && typeof raw.monthNotes === 'object' ? raw.monthNotes : {}
    };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Failed to read data for group ${groupId}:`, err);
    }
  }

  cache.set(groupId, data);
  return data;
}

function writeGroup(groupId) {
  pendingWrites.delete(groupId);
  const file = fileFor(groupId);
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(cache.get(groupId)));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error(`Failed to save data for group ${groupId}:`, err);
  }
}

function scheduleWrite(groupId) {
  clearTimeout(pendingWrites.get(groupId));
  pendingWrites.set(groupId, setTimeout(() => writeGroup(groupId), WRITE_DELAY_MS));
}

function setTasks(groupId, tasks) {
  getGroup(groupId).tasks = tasks;
  scheduleWrite(groupId);
}

function setMonthNote(groupId, key, value) {
  const notes = getGroup(groupId).monthNotes;
  if (value) {
    notes[key] = value;
  } else {
    delete notes[key];
  }
  scheduleWrite(groupId);
}

function flushAll() {
  for (const [groupId, timeout] of pendingWrites) {
    clearTimeout(timeout);
    writeGroup(groupId);
  }
}

module.exports = { DATA_DIR, isValidGroupId, getGroup, setTasks, setMonthNote, flushAll };
