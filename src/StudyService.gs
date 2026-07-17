function startStudy_(email, answers) {
  const user = requireUser_(email);
  const existing = rowsForUser_(APP.SHEETS.SESSIONS, user['User ID']).filter(row => row.Status === APP.STATUS.OPEN);
  if (existing.length) throw new Error('You already have an open study session. Submit End Study before starting another one.');
  const subject = normalise_(answers.Subject); const topic = normalise_(answers.Topic);
  validateUserTopic_(user, subject, topic);
  appendObject_(APP.SHEETS.SESSIONS, { 'Session ID': createId_('SES'), 'User ID': user['User ID'], Email: email, Subject: subject, Topic: topic, Goal: normalise_(answers.Goal), 'Start Time': now_(), 'End Time': '', 'Duration (Hours)': '', Completed: '', 'Questions Solved': '', 'Difficulty (1-5)': '', 'Focus Rating (1-10)': '', Notes: '', Date: now_(), Status: APP.STATUS.OPEN });
}

function endStudy_(email, answers) {
  const user = requireUser_(email);
  const session = rowsForUser_(APP.SHEETS.SESSIONS, user['User ID']).filter(row => row.Status === APP.STATUS.OPEN).sort((a, b) => new Date(b['Start Time']) - new Date(a['Start Time']))[0];
  if (!session) throw new Error('No open study session exists. Start Study before submitting End Study.');
  const endTime = now_(); const startTime = new Date(session['Start Time']); const duration = durationHours_(startTime, endTime);
  if (duration <= 0 || duration > 24) throw new Error('The session duration is invalid. Please contact the administrator.');
  const completed = normalise_(answers['Completed?']) === 'Yes';
  updateObject_(APP.SHEETS.SESSIONS, session._row, { 'End Time': endTime, 'Duration (Hours)': Math.round(duration * 100) / 100, Completed: completed ? 'Yes' : 'No', 'Questions Solved': toNumber_(answers['Questions Solved']), 'Difficulty (1-5)': toNumber_(answers.Difficulty), 'Focus Rating (1-10)': toNumber_(answers['Focus Rating']), Notes: normalise_(answers.Notes), Status: APP.STATUS.CLOSED });
  markTopicInProgress_(user, session.Subject, session.Topic);
  updateStreak_(user);
  createStudyCalendarEvent_(user, session, endTime);
}

function validateUserTopic_(user, subject, topic) {
  const found = valuesToObjects_(APP.SHEETS.SYLLABUS).some(row => row['User ID'] === user['User ID'] && row.Subject === subject && row.Topic === topic);
  if (!found) throw new Error('This topic is not available in your ' + user.Exam + ' syllabus. Ask the administrator to add it.');
}

function markTopicInProgress_(user, subject, topic) {
  const row = valuesToObjects_(APP.SHEETS.SYLLABUS).find(item => item['User ID'] === user['User ID'] && item.Subject === subject && item.Topic === topic);
  if (row && row.Status === APP.STATUS.NOT_STARTED) updateObject_(APP.SHEETS.SYLLABUS, row._row, { Status: APP.STATUS.IN_PROGRESS });
}

function updateStreak_(user) {
  const dates = unique_(valuesToObjects_(APP.SHEETS.SESSIONS).filter(row => row['User ID'] === user['User ID'] && row.Status === APP.STATUS.CLOSED).map(row => dateKey_(row.Date)));
  const streak = calculateStreak_(dates, now_());
  updateObject_(APP.SHEETS.USERS, user._row, { 'Active Streak': streak });
}
