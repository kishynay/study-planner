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
