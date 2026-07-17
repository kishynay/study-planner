function getSetting_(key) {
  const setting = valuesToObjects_(APP.SHEETS.SETTINGS).find(row => row.Key === key);
  return setting ? String(setting.Value) : String(SETTING_DEFAULTS[key] || '');
}

function setSetting_(key, value, description) {
  const rows = valuesToObjects_(APP.SHEETS.SETTINGS);
  const setting = rows.find(row => row.Key === key);
  if (setting) updateObject_(APP.SHEETS.SETTINGS, setting._row, { Value: value, Description: description || setting.Description });
  else appendObject_(APP.SHEETS.SETTINGS, { Key: key, Value: value, Description: description || '' });
}

function getAdminEmail_() {
  const configured = getSetting_('ADMIN_EMAIL');
  return configured || Session.getEffectiveUser().getEmail();
}

function showSettingsSidebar_() {
  SpreadsheetApp.getUi().alert('Edit the Settings sheet, then run refreshDashboard() from the SSC Study OS menu.');
}

function isTimeFormat_(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
}

function validateSettings_() {
  const errors = [];
  const morning = getSetting_('MORNING_DEFAULT_HOUR');
  const evening = getSetting_('EVENING_HOUR');
  if (morning && !isTimeFormat_(morning)) errors.push('MORNING_DEFAULT_HOUR must be HH:mm');
  if (evening && !isTimeFormat_(evening)) errors.push('EVENING_HOUR must be HH:mm');
  const intervals = getSetting_('REVISION_INTERVALS');
  if (!/^\d+(,\d+)*$/.test(String(intervals))) errors.push('REVISION_INTERVALS must be comma-separated numbers');
  if (isNaN(Number(getSetting_('MAX_DAILY_EMAILS')))) errors.push('MAX_DAILY_EMAILS must be a number');
  ['PRIORITY_REMINDER_ENABLED', 'CALENDAR_ENABLED'].forEach(key => {
    const v = String(getSetting_(key)).toUpperCase();
    if (v !== 'TRUE' && v !== 'FALSE') errors.push(key + ' must be TRUE or FALSE');
  });
  if (errors.length) {
    const message = 'Invalid Settings: ' + errors.join('; ');
    logError_('Settings', new Error(message), { settings: errors });
    throw new Error(message);
  }
}
