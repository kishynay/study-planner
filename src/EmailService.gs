function dispatchReminders() {
  markDueRevisions_();
  const weekday = Utilities.formatDate(now_(), APP.TIME_ZONE, 'u');
  const day = Utilities.formatDate(now_(), APP.TIME_ZONE, 'd');
  valuesToObjects_(APP.SHEETS.USERS).filter(user => String(user.Active).toUpperCase() !== 'FALSE').forEach(user => {
    if (shouldRunAt_(normalise_(user['Daily Reminder Time']))) sendMorningReminder_(user);
    if (getSetting_('PRIORITY_REMINDER_ENABLED') === 'TRUE' && shouldSendPriority_(user)) sendPriorityReminder_(user);
    if (shouldRunAt_(getSetting_('EVENING_HOUR'))) {
      if (day === '1') sendMonthlyReport_(user);
      else if (weekday === '7') sendWeeklyReport_(user);
      else sendEveningSummary_(user);
    }
  });
}

function shouldSendPriority_(user) {
  if (!shouldRunAt_('14:00')) return false;
  const metrics = getUserMetrics_(user); return metrics.todayHours < metrics.targetHours * 0.25 && metrics.dueRevisions > 0;
}

function sendMorningReminder_(user) {
  if (!canSendEmail_(user, APP.EMAIL_TYPES.MORNING)) return;
  const metrics = getUserMetrics_(user); const recommendation = getRecommendation_(user); const startUrl = getStartFormUrl_(recommendation.subject);
  sendUserEmail_(user, APP.EMAIL_TYPES.MORNING, 'Your SSC Study OS plan for today', emailLayout_('Good morning, ' + user.Name + '!', '<p><b>Today\'s goal:</b> ' + metrics.targetHours + ' hours</p><p><b>Start with:</b> ' + recommendation.action + ' — ' + recommendation.subject + ': ' + recommendation.topic + '<br><span>' + recommendation.reason + '</span></p><p>Pending revisions: <b>' + metrics.dueRevisions + '</b> · Current streak: <b>' + metrics.streak + ' days</b></p>' + button_('START STUDY', startUrl) + button_('PLAN TODAY', getFormUrl_(APP.FORMS.PLANNING))));
}

function sendPriorityReminder_(user) {
  if (!canSendEmail_(user, APP.EMAIL_TYPES.PRIORITY)) return;
  const recommendation = getRecommendation_(user);
  sendUserEmail_(user, APP.EMAIL_TYPES.PRIORITY, 'A focused SSC task is waiting', emailLayout_('Quick check-in', '<p>You have an overdue revision: <b>' + recommendation.subject + ' — ' + recommendation.topic + '</b>.</p>' + button_('REVISE NOW', getFormUrl_(APP.FORMS.REVISION))));
}

function sendEveningSummary_(user) {
  if (!canSendEmail_(user, APP.EMAIL_TYPES.EVENING)) return;
  const metrics = getUserMetrics_(user); const recommendation = getRecommendation_(user);
  sendUserEmail_(user, APP.EMAIL_TYPES.EVENING, 'Your SSC Study OS evening summary', emailLayout_('Well done, ' + user.Name + '!', '<p>Study time today: <b>' + metrics.todayHours.toFixed(2) + ' hours</b><br>Questions solved: <b>' + metrics.todayQuestions + '</b><br>Topics completed: <b>' + metrics.completedToday + '</b></p><p><b>Tomorrow\'s recommendation:</b> ' + recommendation.subject + ' — ' + recommendation.topic + '</p>' + button_('PLAN NEXT WEEK', getFormUrl_(APP.FORMS.PLANNING))));
}

function sendWeeklyReport_(user) {
  if (!canSendEmail_(user, APP.EMAIL_TYPES.WEEKLY)) return;
  const metrics = getUserMetrics_(user);
  sendUserEmail_(user, APP.EMAIL_TYPES.WEEKLY, 'Your weekly SSC Study OS report', emailLayout_('Weekly report', '<p>Study hours: <b>' + metrics.weekHours.toFixed(2) + '</b><br>Mocks: <b>' + metrics.mockCount + '</b><br>Average marks: <b>' + metrics.averageMockScore.toFixed(1) + '%</b><br>Strongest subject: <b>' + metrics.strongSubject + '</b><br>Weakest subject: <b>' + metrics.weakSubject + '</b><br>Syllabus complete: <b>' + metrics.completion.toFixed(1) + '%</b></p>'));
}

function sendMonthlyReport_(user) {
  if (!canSendEmail_(user, APP.EMAIL_TYPES.MONTHLY)) return;
  const metrics = getUserMetrics_(user);
  sendUserEmail_(user, APP.EMAIL_TYPES.MONTHLY, 'Your monthly SSC Study OS report', emailLayout_('Monthly progress', '<p>Study hours this month: <b>' + metrics.monthHours.toFixed(2) + '</b><br>Current consistency: <b>' + metrics.streak + ' day streak</b><br>Completed syllabus: <b>' + metrics.completion.toFixed(1) + '%</b><br>Mock improvement: <b>' + metrics.mockImprovement.toFixed(1) + ' percentage points</b></p>'));
}

function sendWelcomeEmail_(user) {
  sendUserEmail_(user, 'WELCOME', 'Welcome to SSC Study OS', emailLayout_('Welcome, ' + user.Name + '!', '<p>Your ' + user.Exam + ' study system is ready. Start your first focused session when you are ready.</p>' + button_('START QUANT', getStartFormUrl_('Quant')) + button_('START ENGLISH', getStartFormUrl_('English'))));
}

function sendProcessingError_(email, error) { GmailApp.sendEmail(email, APP.NAME + ': submission needs attention', 'Your submission could not be processed: ' + error.message + '. Please correct the issue and submit again.'); }
function emailLayout_(heading, body) { return '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1f2937"><h2 style="color:#1f4e78">' + heading + '</h2>' + body + '<p style="color:#6b7280;font-size:12px">SSC Study OS</p></div>'; }
function button_(label, url) { return url ? '<a href="' + url + '" style="display:inline-block;margin:6px 8px 6px 0;padding:10px 14px;background:#1f4e78;color:#fff;text-decoration:none;border-radius:4px">' + label + '</a>' : ''; }

function canSendEmail_(user, type) {
  const key = emailDeduplicationKey_(dateKey_(now_()), user['User ID'], type);
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(key)) return false;
  const types = [APP.EMAIL_TYPES.MORNING, APP.EMAIL_TYPES.PRIORITY, APP.EMAIL_TYPES.EVENING, APP.EMAIL_TYPES.WEEKLY, APP.EMAIL_TYPES.MONTHLY];
  if (types.indexOf(type) >= 0) {
    const count = types.filter(item => properties.getProperty(emailDeduplicationKey_(dateKey_(now_()), user['User ID'], item))).length;
    if (count >= toNumber_(getSetting_('MAX_DAILY_EMAILS'), 3)) return false;
  }
  properties.setProperty(key, '1'); return true;
}

function sendUserEmail_(user, type, subject, htmlBody) { GmailApp.sendEmail(user.Email, subject, 'Open this email in an HTML-capable mail client.', { htmlBody: htmlBody, name: APP.NAME }); }
function getFormUrl_(formType) { const form = valuesToObjects_(APP.SHEETS.FORMS).find(row => row['Form Type'] === formType); return form ? form['Published URL'] : ''; }
function getStartFormUrl_(subject) { const form = valuesToObjects_(APP.SHEETS.FORMS).find(row => row['Form Type'] === APP.FORMS.START + ' [' + subject + ']'); return form ? form['Prefilled URL'] : getFormUrl_(APP.FORMS.START); }
function shouldRunAt_(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false;
  const nowMinutes = toNumber_(Utilities.formatDate(now_(), APP.TIME_ZONE, 'H')) * 60 + toNumber_(Utilities.formatDate(now_(), APP.TIME_ZONE, 'm'));
  const parts = time.split(':'); const targetMinutes = toNumber_(parts[0]) * 60 + toNumber_(parts[1]); const cadence = toNumber_(getSetting_('REMINDER_CHECK_MINUTES'), 15);
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + cadence;
}
