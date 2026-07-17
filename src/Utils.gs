function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('MASTER_SPREADSHEET_ID');
  if (!id) throw new Error('SSC Study OS is not installed. Run installStudyOs() first.');
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing required sheet: ' + name);
  return sheet;
}

function now_() { return new Date(); }
function dateKey_(value) { return Utilities.formatDate(new Date(value), APP.TIME_ZONE, 'yyyy-MM-dd'); }
function createId_(prefix) { return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }
function normalise_(value) { return String(value == null ? '' : value).trim(); }
function toNumber_(value, fallback) { const n = Number(value); return isFinite(n) ? n : (fallback == null ? 0 : fallback); }
const SHEET_VALUES_CACHE = {};
const SHEET_INDEX_CACHE = {};

function unique_(values) { return values.filter((value, index, all) => all.indexOf(value) === index); }

function ensureArray_(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(normalise_).filter(Boolean);
  return String(value).split(',').map(normalise_).filter(Boolean);
}

function clearSheetCache_(sheetName) {
  if (sheetName) delete SHEET_VALUES_CACHE[sheetName];
  else Object.keys(SHEET_VALUES_CACHE).forEach(key => delete SHEET_VALUES_CACHE[key]);
  if (sheetName) delete SHEET_INDEX_CACHE[sheetName];
  else Object.keys(SHEET_INDEX_CACHE).forEach(key => delete SHEET_INDEX_CACHE[key]);
}

function getSheetValues_(sheetName) {
  if (!SHEET_VALUES_CACHE[sheetName]) {
    SHEET_VALUES_CACHE[sheetName] = getSheet_(sheetName).getDataRange().getValues();
  }
  return SHEET_VALUES_CACHE[sheetName];
}

function buildIndex_(sheetName, key) {
  if (SHEET_INDEX_CACHE[sheetName] && SHEET_INDEX_CACHE[sheetName]._key === key) return SHEET_INDEX_CACHE[sheetName].map;
  const rows = valuesToObjects_(sheetName);
  const map = {};
  rows.forEach(row => {
    const v = row[key] == null ? '' : String(row[key]).trim();
    if (!map[v]) map[v] = [];
    map[v].push(row);
  });
  SHEET_INDEX_CACHE[sheetName] = { _key: key, map: map };
  return map;
}

function getRowsByIndex_(sheetName, key, value) {
  const map = buildIndex_(sheetName, key);
  const v = value == null ? '' : String(value).trim();
  return map[v] ? map[v].slice() : [];
}

function rowsForUser_(sheetName, userId) {
  return getRowsByIndex_(sheetName, 'User ID', userId);
}

function valuesToObjects_(sheetName) {
  const values = getSheetValues_(sheetName);
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(row => row.some(value => value !== '')).map((row, rowIndex) => {
    const object = { _row: rowIndex + 2 };
    headers.forEach((header, index) => object[header] = row[index]);
    return object;
  });
}

function appendObject_(sheetName, object) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(header => object[header] == null ? '' : object[header]));
  clearSheetCache_(sheetName);
  return sheet.getLastRow();
}

function updateObject_(sheetName, row, changes) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.keys(changes).forEach(key => {
    const column = headers.indexOf(key) + 1;
    if (column) sheet.getRange(row, column).setValue(changes[key]);
  });
  clearSheetCache_(sheetName);
}

function getRespondentEmail_(event) {
  const response = event && event.response;
  const email = response && response.getRespondentEmail ? response.getRespondentEmail() : '';
  if (!email) throw new Error('No respondent email was received. Confirm the Form collects Workspace email addresses.');
  return normalise_(email).toLowerCase();
}

function answersFromEvent_(event) {
  if (!event || !event.response || typeof event.response.getItemResponses !== 'function') throw new Error('Malformed form submit event: missing response data.');
  const answers = {};
  event.response.getItemResponses().forEach(itemResponse => {
    try {
      const title = itemResponse.getItem && itemResponse.getItem().getTitle ? itemResponse.getItem().getTitle() : '';
      let resp = itemResponse.getResponse();
      if (resp == null) resp = '';
      answers[title] = resp;
    } catch (err) {
      // Skip malformed item responses but continue processing others
    }
  });
  return answers;
}

function logError_(service, error, context) {
  try { appendObject_(APP.SHEETS.ERRORS, { Timestamp: now_(), Service: service, Message: error && error.message ? error.message : String(error), Context: JSON.stringify(context || {}) }); } catch (ignored) {}
}

function withErrorLogging_(service, fn, context) {
  try { return fn(); } catch (error) { logError_(service, error, context); throw error; }
}

function getUserByEmail_(email) { return valuesToObjects_(APP.SHEETS.USERS).find(user => normalise_(user.Email).toLowerCase() === normalise_(email).toLowerCase() && String(user.Active).toUpperCase() !== 'FALSE'); }
function isSameDay_(first, second) { return dateKey_(first) === dateKey_(second); }
function arraySetting_(key) { return getSetting_(key).split(',').map(Number).filter(value => value > 0); }
