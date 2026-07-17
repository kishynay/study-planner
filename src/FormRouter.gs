function onStudyOsFormSubmit(event) {
  if (!event || !event.source || typeof event.source.getId !== 'function') throw new Error('Invalid form submit event.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let formType = '';
    try { formType = getFormType_(event.source.getId()); } catch (err) { throw new Error('Unable to determine form type from submission.'); }
    if (!formType) throw new Error('Submission received from an unregistered Form.');
    const email = getRespondentEmail_(event);
    const answers = answersFromEvent_(event);
    const handlers = {};
    handlers[APP.FORMS.REGISTRATION] = () => registerUser_(email, answers);
    handlers[APP.FORMS.START] = () => startStudy_(email, answers);
    handlers[APP.FORMS.END] = () => endStudy_(email, answers);
    handlers[APP.FORMS.MOCK] = () => recordMock_(email, answers);
    handlers[APP.FORMS.REVISION] = () => recordRevision_(email, answers);
    handlers[APP.FORMS.PLANNING] = () => recordPlan_(email, answers);
    handlers[APP.FORMS.SYLLABUS] = () => updateSyllabus_(email, answers);
    if (!handlers[formType]) throw new Error('No handler registered for form type: ' + formType);
    handlers[formType]();
    refreshDashboard();
  } catch (error) {
    const email = (() => { try { return getRespondentEmail_(event); } catch (ignored) { return ''; } })();
    logError_('FormRouter', error, { formId: event.source && event.source.getId(), email: email });
    if (email) sendProcessingError_(email, error);
    throw error;
  } finally { lock.releaseLock(); }
}

function getFormType_(formId) {
  const known = Object.keys(APP.FORMS).map(key => APP.FORMS[key]);
  const record = valuesToObjects_(APP.SHEETS.FORMS).find(row => row['Form ID'] === formId && known.indexOf(row['Form Type']) >= 0);
  return record ? record['Form Type'] : '';
}

function requireUser_(email) {
  const user = getUserByEmail_(email);
  if (!user) throw new Error('You are not registered. Submit the Registration form before logging study activity.');
  return user;
}

function registerUser_(email, answers) {
  if (getUserByEmail_(email)) throw new Error('A registered active user already exists for this email address.');
  const exam = normalise_(answers.Exam);
  if (['SSC CGL', 'SSC CHSL'].indexOf(exam) < 0) throw new Error('Choose a supported exam: SSC CGL or SSC CHSL.');
  const targetHours = toNumber_(answers['Target Study Hours'], toNumber_(getSetting_('STUDY_GOAL_HOURS'), 6));
  const reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(normalise_(answers['Daily Reminder Time'])) ? normalise_(answers['Daily Reminder Time']) : getSetting_('MORNING_DEFAULT_HOUR');
  const user = { 'User ID': createId_('USR'), Name: normalise_(answers.Name), Email: email, Exam: exam, 'Target Study Hours': targetHours, 'Daily Reminder Time': reminderTime, 'Weekly Planning Day': 'Sunday', 'Active Streak': 0, 'Calendar ID': '', Active: true, 'Created Date': now_() };
  appendObject_(APP.SHEETS.USERS, user);
  seedUserSyllabus_(user);
  if (getSetting_('CALENDAR_ENABLED') === 'TRUE') createStudentCalendar_(user);
  sendWelcomeEmail_(user);
}
