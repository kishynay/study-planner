function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('SSC Study OS')
      .addItem('Install new Study OS', 'installStudyOs')
      .addItem('Refresh dashboard', 'refreshDashboard')
      .addItem('Run reminder dispatcher', 'dispatchReminders')
      .addItem('Create missing calendars', 'createMissingCalendars')
      .addItem('Settings help', 'showSettingsSidebar_')
      .addToUi();
  } catch (error) {
    // Ignore non-UI contexts such as clasp run or execution API calls.
    return;
  }
}

function installStudyOs() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('MASTER_SPREADSHEET_ID')) throw new Error('This script is already installed. Run resetStudyOsForDevelopment() only in a test project to start again.');
  const spreadsheet = SpreadsheetApp.create(APP.NAME + ' — Master');
  try {
    buildWorkbook_(spreadsheet);
    setupSpreadsheet_(spreadsheet);
    seedSettings_();
    seedSyllabusTemplates_();
    createForms_();
    installTriggers_();
    refreshDashboard();
    properties.setProperty('MASTER_SPREADSHEET_ID', spreadsheet.getId());
    setSetting_('INSTALLATION_COMPLETE', 'TRUE', 'Set automatically after successful installation');
    Logger.log(APP.NAME + ' installed. Configure Settings and share the registration form from the Form Map sheet: ' + spreadsheet.getUrl());
    return spreadsheet.getUrl();
  } catch (error) {
    properties.deleteProperty('MASTER_SPREADSHEET_ID');
    logError_('Installer', error, { spreadsheetId: spreadsheet.getId() });
    throw error;
  }
}

function buildWorkbook_(spreadsheet) {
  const first = spreadsheet.getSheets()[0];
  Object.keys(HEADERS).forEach((name, index) => {
    const sheet = index === 0 ? first.setName(name) : spreadsheet.insertSheet(name);
    const headers = HEADERS[name];
    sheet.clear();
    sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(3);
    sheet.getRange(3, 1, 1, headers.length).setBackground('#1f4e78').setFontColor('#ffffff').setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
    sheet.getRange(3, 1, Math.max(3, sheet.getMaxRows()), headers.length).createFilter();
    if (name === APP.SHEETS.DASHBOARD || name === APP.SHEETS.ANALYTICS) sheet.setTabColor('#00a88f');
    else if (name === APP.SHEETS.ERRORS) sheet.setTabColor('#dc2626');
    else sheet.setTabColor('#2563eb');
    const protection = sheet.protect().setDescription('SSC Study OS managed sheet');
    protection.setWarningOnly(true);
  });
}

function setupSpreadsheet_(spreadsheet) {
  const navigationSheets = [
    APP.SHEETS.DASHBOARD,
    APP.SHEETS.USERS,
    APP.SHEETS.FORMS,
    APP.SHEETS.TEMPLATES,
    APP.SHEETS.SYLLABUS,
    APP.SHEETS.REVISION,
    APP.SHEETS.PLANNER,
    APP.SHEETS.MOCKS,
    APP.SHEETS.INBOX,
    APP.SHEETS.LOGS
  ];

  Object.keys(HEADERS).forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;
    applySheetStyling_(sheet, sheetName, navigationSheets, spreadsheet);
  });
}

function applySheetStyling_(sheet, sheetName, navigationSheets, spreadsheet) {
  const links = navigationSheets.map(targetName => {
    if (targetName === sheetName) return targetName;
    const targetSheet = spreadsheet.getSheetByName(targetName);
    if (!targetSheet) return targetName;
    return '=HYPERLINK("#gid=' + targetSheet.getSheetId() + '","' + targetName + '")';
  });

  const navRange = sheet.getRange(2, 1, 1, links.length + 1);
  const navValues = [['Navigate:'].concat(links)];
  navRange.setValues(navValues);
  navRange.setBackground('#eaf6ff').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('left');
  navRange.setFontColor('#0f172a');
  navRange.setVerticalAlignment('middle');
  navRange.setWrap(true);

  sheet.setFrozenRows(3);
  sheet.setRowHeight(2, 28);
  sheet.setRowHeight(1, 26);

  const headerCount = HEADERS[sheetName].length;
  const targetColumnCount = Math.max(headerCount, links.length + 1);
  for (let col = 1; col <= targetColumnCount; col += 1) {
    sheet.setColumnWidth(col, 140);
  }

  styleHeaderRow_(sheet, headerCount);
  addInstructionsRow_(sheet, sheetName, headerCount);
  applySheetSpecificRules_(sheet, sheetName);
}

function styleHeaderRow_(sheet, headerCount) {
  const headerRange = sheet.getRange(3, 1, 1, headerCount);
  headerRange.setBackground('#1f4e78').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  headerRange.setBorder(true, true, true, true, false, false, '#0f172a', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function addInstructionsRow_(sheet, sheetName, headerCount) {
  const instructions = {
    [APP.SHEETS.USERS]: 'Manage registered learners here. Use the form map to update registration and assignment forms.',
    [APP.SHEETS.SESSIONS]: 'Record study session activity via the Start Study / End Study form flow.',
    [APP.SHEETS.MOCKS]: 'Track mock tests and performance improvements. Use this sheet for metric review only.',
    [APP.SHEETS.REVISION]: 'Revision tasks are generated automatically when syllabus items complete.',
    [APP.SHEETS.SYLLABUS]: 'Track topic progress from Not Started to Completed.',
    [APP.SHEETS.PLANNER]: 'Weekly planner entries keep study goals, priority, and status transparent.',
    [APP.SHEETS.DASHBOARD]: 'Dashboard data updates hourly with student activity and trends.',
    [APP.SHEETS.ANALYTICS]: 'Analytics rows store computed student metrics for reporting.',
    [APP.SHEETS.INBOX]: 'Use Inbox for quick task capture with due dates and priority.',
    [APP.SHEETS.LOGS]: 'Log service events and errors for troubleshooting.'
  };
  const message = instructions[sheetName] || 'Use this sheet as part of the SSC Study OS workflow.';
  const noteRange = sheet.getRange(1, 1, 1, headerCount);
  noteRange.setValues([[message]]);
  noteRange.setFontStyle('italic').setFontSize(9).setHorizontalAlignment('left');
  noteRange.setVerticalAlignment('middle');
  noteRange.setWrap(true);
  sheet.setRowHeight(1, 24);
}

function applySheetSpecificRules_(sheet, sheetName) {
  const dataStartRow = 4;
  if (sheetName === APP.SHEETS.SYLLABUS) {
    addStatusValidation_(sheet, 'Status', [APP.STATUS.NOT_STARTED, APP.STATUS.IN_PROGRESS, APP.STATUS.COMPLETED], dataStartRow);
    addStatusConditionalFormatting_(sheet, 'Status', dataStartRow, {
      [APP.STATUS.NOT_STARTED]: '#fde68a',
      [APP.STATUS.IN_PROGRESS]: '#93c5fd',
      [APP.STATUS.COMPLETED]: '#a7f3d0'
    });
  }

  if (sheetName === APP.SHEETS.PLANNER) {
    addStatusValidation_(sheet, 'Status', [APP.STATUS.NOT_STARTED, APP.STATUS.IN_PROGRESS, APP.STATUS.COMPLETED, APP.STATUS.DUE], dataStartRow);
    addStatusConditionalFormatting_(sheet, 'Status', dataStartRow, {
      [APP.STATUS.NOT_STARTED]: '#fef3c7',
      [APP.STATUS.IN_PROGRESS]: '#bfdbfe',
      [APP.STATUS.COMPLETED]: '#bbf7d0',
      [APP.STATUS.DUE]: '#fecaca'
    });
  }

  if (sheetName === APP.SHEETS.REVISION) {
    addStatusValidation_(sheet, 'Status', [APP.STATUS.UPCOMING, APP.STATUS.DUE, APP.STATUS.FINISHED], dataStartRow);
    addStatusConditionalFormatting_(sheet, 'Status', dataStartRow, {
      [APP.STATUS.UPCOMING]: '#dbeafe',
      [APP.STATUS.DUE]: '#fee2e2',
      [APP.STATUS.FINISHED]: '#d1fae5'
    });
  }

  if (sheetName === APP.SHEETS.USERS) {
    addStatusValidation_(sheet, 'Active', ['TRUE', 'FALSE'], dataStartRow);
  }
}

function addStatusValidation_(sheet, headerName, values, startRow) {
  const column = HEADERS[sheet.getName()].indexOf(headerName) + 1;
  if (!column) return;
  const range = sheet.getRange(startRow, column, Math.max(250, sheet.getMaxRows() - startRow + 1), 1);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  range.setDataValidation(rule);
}

function addStatusConditionalFormatting_(sheet, headerName, startRow, valueColors) {
  const column = HEADERS[sheet.getName()].indexOf(headerName) + 1;
  if (!column) return;
  const targetRange = sheet.getRange(startRow, column, sheet.getMaxRows() - startRow + 1, 1);
  const rules = Object.keys(valueColors).map(status => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(status)
    .setBackground(valueColors[status])
    .setRanges([targetRange])
    .build());
  const existing = sheet.getConditionalFormatRules();
  sheet.setConditionalFormatRules(existing.concat(rules));
}

function seedSettings_() {
  Object.keys(SETTING_DEFAULTS).forEach(key => setSetting_(key, SETTING_DEFAULTS[key], settingDescription_(key)));
  setSetting_('ADMIN_EMAIL', Session.getEffectiveUser().getEmail(), 'Workspace administrator receiving error notifications');
  try { validateSettings_(); } catch (err) { logError_('Installer', err); throw err; }
}

function settingDescription_(key) {
  const descriptions = {
    ADMIN_EMAIL: 'Owner email for errors and administration', EXAM_DATE: 'Exam date, YYYY-MM-DD', REMINDER_CHECK_MINUTES: 'Dispatcher cadence; 15 is recommended',
    MORNING_DEFAULT_HOUR: 'Default daily study-plan time in HH:mm', EVENING_HOUR: 'Daily reflection time in HH:mm', REVISION_INTERVALS: 'Comma-separated intervals in days',
    MAX_DAILY_EMAILS: 'Maximum non-report emails per student per day', PRIORITY_REMINDER_ENABLED: 'TRUE/FALSE', CALENDAR_ENABLED: 'TRUE/FALSE',
    STUDY_GOAL_HOURS: 'Default target hours for new students', FORMS_FOLDER_ID: 'Optional Google Drive folder for created Forms', DASHBOARD_SELECTED_EMAIL: 'Optional email whose metrics populate the dashboard',
    INSTALLATION_COMPLETE: 'System managed installation flag'
  };
  return descriptions[key] || '';
}

function seedSyllabusTemplates_() {
  const rows = [
    ['SSC CGL', 'Quant', 'Arithmetic', 'Percentage', 3], ['SSC CGL', 'Quant', 'Arithmetic', 'Ratio and Proportion', 3], ['SSC CGL', 'Quant', 'Arithmetic', 'Profit and Loss', 3],
    ['SSC CGL', 'English', 'Grammar', 'Error Spotting', 3], ['SSC CGL', 'English', 'Vocabulary', 'Synonyms and Antonyms', 2], ['SSC CGL', 'English', 'Comprehension', 'Reading Comprehension', 3],
    ['SSC CGL', 'Reasoning', 'Verbal', 'Analogy', 2], ['SSC CGL', 'Reasoning', 'Non-Verbal', 'Series', 2], ['SSC CGL', 'GK/GA', 'General Science', 'Physics', 2], ['SSC CGL', 'GK/GA', 'Current Affairs', 'Current Affairs', 3],
    ['SSC CHSL', 'Quant', 'Arithmetic', 'Percentage', 3], ['SSC CHSL', 'Quant', 'Arithmetic', 'Simple Interest', 2], ['SSC CHSL', 'English', 'Grammar', 'Fill in the Blanks', 2],
    ['SSC CHSL', 'English', 'Vocabulary', 'One Word Substitution', 2], ['SSC CHSL', 'Reasoning', 'Verbal', 'Classification', 2], ['SSC CHSL', 'Reasoning', 'Non-Verbal', 'Figure Series', 2],
    ['SSC CHSL', 'GK/GA', 'General Science', 'Biology', 2], ['SSC CHSL', 'GK/GA', 'Static GK', 'Indian History', 2]
  ];
  getSheet_(APP.SHEETS.TEMPLATES).getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function clearFormMap_() {
  const sheet = getSheet_(APP.SHEETS.FORMS);
  const rows = sheet.getLastRow() - 1;
  if (rows > 0) sheet.deleteRows(2, rows);
}

function createForms_() {
  clearFormMap_();
  const topics = unique_(valuesToObjects_(APP.SHEETS.TEMPLATES).map(row => row.Topic));
  const formDefinitions = [
    [APP.FORMS.REGISTRATION, form => { form.addTextItem().setTitle('Name').setRequired(true); form.addListItem().setTitle('Exam').setChoiceValues(['SSC CGL', 'SSC CHSL']).setRequired(true); form.addTextItem().setTitle('Target Study Hours').setHelpText('Hours per day; leave blank for the system default.'); form.addTextItem().setTitle('Daily Reminder Time').setHelpText('24-hour HH:mm, for example 06:00.'); }],
    [APP.FORMS.START, form => { form.addListItem().setTitle('Subject').setChoiceValues(APP.SUBJECTS).setRequired(true); form.addListItem().setTitle('Topic').setChoiceValues(topics).setRequired(true); form.addTextItem().setTitle('Goal').setRequired(true); }],
    [APP.FORMS.END, form => { form.addMultipleChoiceItem().setTitle('Completed?').setChoiceValues(['Yes', 'No']).setRequired(true); form.addTextItem().setTitle('Questions Solved').setRequired(true); form.addScaleItem().setTitle('Difficulty').setBounds(1, 5).setLabels('Easy', 'Hard').setRequired(true); form.addScaleItem().setTitle('Focus Rating').setBounds(1, 10).setLabels('Low', 'Deep focus').setRequired(true); form.addParagraphTextItem().setTitle('Notes'); }],
    [APP.FORMS.MOCK, form => { form.addTextItem().setTitle('Mock Name').setRequired(true); form.addListItem().setTitle('Subject').setChoiceValues(['Full Mock'].concat(APP.SUBJECTS)).setRequired(true); form.addTextItem().setTitle('Total Marks').setRequired(true); form.addTextItem().setTitle('Obtained Marks').setRequired(true); form.addTextItem().setTitle('Accuracy').setHelpText('Percentage, for example 82.5').setRequired(true); form.addTextItem().setTitle('Wrong Answers').setRequired(true); form.addTextItem().setTitle('Skipped Questions').setRequired(true); form.addTextItem().setTitle('Time Taken').setHelpText('Minutes').setRequired(true); form.addParagraphTextItem().setTitle('Remarks'); }],
    [APP.FORMS.REVISION, form => { form.addListItem().setTitle('Subject').setChoiceValues(APP.SUBJECTS).setRequired(true); form.addListItem().setTitle('Topic').setChoiceValues(topics).setRequired(true); form.addScaleItem().setTitle('Confidence').setBounds(1, 5).setLabels('Low', 'High').setRequired(true); form.addMultipleChoiceItem().setTitle('Need Another Revision?').setChoiceValues(['Yes', 'No']).setRequired(true); }],
    [APP.FORMS.PLANNING, form => { form.addTextItem().setTitle('Week').setHelpText('Week label, for example 2026-W30').setRequired(true); form.addCheckboxItem().setTitle('Subjects').setChoiceValues(APP.SUBJECTS).setRequired(true); form.addTextItem().setTitle('Target Hours').setRequired(true); form.addListItem().setTitle('Priority').setChoiceValues(['High', 'Medium', 'Low']).setRequired(true); }],
    [APP.FORMS.SYLLABUS, form => { form.addListItem().setTitle('Subject').setChoiceValues(APP.SUBJECTS).setRequired(true); form.addListItem().setTitle('Topic').setChoiceValues(topics).setRequired(true); form.addListItem().setTitle('Status').setChoiceValues([APP.STATUS.NOT_STARTED, APP.STATUS.IN_PROGRESS, APP.STATUS.COMPLETED]).setRequired(true); }]
  ];
  formDefinitions.forEach(definition => createForm_(definition[0], definition[1]));
}

function createForm_(formType, build) {
  const form = FormApp.create(APP.NAME + ' — ' + formType);
  form.setDescription('Submit this form to update your private SSC Study OS record.').setConfirmationMessage('Recorded. Your Study OS will update shortly.');
  try { form.setCollectEmail(true); form.setRequireLogin(true); } catch (error) { logError_('Forms', error, { formType: formType, note: 'Domain policy may need manual form configuration.' }); }
  build(form);
  ScriptApp.newTrigger('onStudyOsFormSubmit').forForm(form).onFormSubmit().create();
  appendObject_(APP.SHEETS.FORMS, { 'Form Type': formType, 'Form ID': form.getId(), 'Edit URL': form.getEditUrl(), 'Published URL': form.getPublishedUrl(), 'Prefilled URL': '' });
  if (formType === APP.FORMS.START) createSubjectPrefills_(form);
}

function createSubjectPrefills_(form) {
  const subjectItem = form.getItems(FormApp.ItemType.LIST).find(item => item.getTitle() === 'Subject').asListItem();
  APP.SUBJECTS.forEach(subject => appendObject_(APP.SHEETS.FORMS, { 'Form Type': APP.FORMS.START + ' [' + subject + ']', 'Form ID': form.getId(), 'Edit URL': '', 'Published URL': form.getPublishedUrl(), 'Prefilled URL': form.createResponse().withItemResponse(subjectItem.createResponse(subject)).toPrefilledUrl() }));
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => { if (['dispatchReminders', 'refreshDashboard'].indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('dispatchReminders').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('refreshDashboard').timeBased().everyHours(1).create();
}

function resetStudyOsForDevelopment() {
  ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));
  PropertiesService.getScriptProperties().deleteAllProperties();
}
