function seedUserSyllabus_(user) {
  const templates = valuesToObjects_(APP.SHEETS.TEMPLATES).filter(row => row.Exam === user.Exam);
  templates.forEach(template => appendObject_(APP.SHEETS.SYLLABUS, { 'Progress ID': createId_('SYL'), 'User ID': user['User ID'], Email: user.Email, Exam: user.Exam, Subject: template.Subject, Chapter: template.Chapter, Topic: template.Topic, Status: APP.STATUS.NOT_STARTED, 'Completion Date': '', 'Estimated Weightage': template['Estimated Weightage'] }));
}

function updateSyllabus_(email, answers) {
  const user = requireUser_(email); const subject = normalise_(answers.Subject); const topic = normalise_(answers.Topic); const status = normalise_(answers.Status);
  validateUserTopic_(user, subject, topic);
  const record = valuesToObjects_(APP.SHEETS.SYLLABUS).find(row => row['User ID'] === user['User ID'] && row.Subject === subject && row.Topic === topic);
  const completionDate = status === APP.STATUS.COMPLETED ? now_() : '';
  updateObject_(APP.SHEETS.SYLLABUS, record._row, { Status: status, 'Completion Date': completionDate });
  if (status === APP.STATUS.COMPLETED) scheduleRevision_(user, subject, topic, completionDate, 0, 0);
}

function scheduleRevision_(user, subject, topic, lastRevision, revisionCount, confidence) {
  const intervals = arraySetting_('REVISION_INTERVALS');
  const nextRevision = nextRevisionDate_(lastRevision, intervals, revisionCount);
  const existing = valuesToObjects_(APP.SHEETS.REVISION).find(row => row['User ID'] === user['User ID'] && row.Subject === subject && row.Topic === topic);
  const data = { 'Last Revision': lastRevision, 'Next Revision': nextRevision, 'Confidence (1-5)': confidence, 'Revision Count': revisionCount, Status: APP.STATUS.UPCOMING };
  if (existing) updateObject_(APP.SHEETS.REVISION, existing._row, data);
  else appendObject_(APP.SHEETS.REVISION, Object.assign({ 'Revision ID': createId_('REV'), 'User ID': user['User ID'], Email: user.Email, Subject: subject, Topic: topic }, data));
}

function recordRevision_(email, answers) {
  const user = requireUser_(email); const subject = normalise_(answers.Subject); const topic = normalise_(answers.Topic); const confidence = toNumber_(answers.Confidence);
  const record = valuesToObjects_(APP.SHEETS.REVISION).find(row => row['User ID'] === user['User ID'] && row.Subject === subject && row.Topic === topic);
  if (!record) throw new Error('This topic has no scheduled revision. Mark it completed in Syllabus Update first.');
  const count = toNumber_(record['Revision Count']) + 1;
  if (normalise_(answers['Need Another Revision?']) === 'No') updateObject_(APP.SHEETS.REVISION, record._row, { 'Last Revision': now_(), 'Next Revision': '', 'Confidence (1-5)': confidence, 'Revision Count': count, Status: APP.STATUS.FINISHED });
  else scheduleRevision_(user, subject, topic, now_(), count, confidence);
}

function markDueRevisions_() {
  const today = dateKey_(now_());
  valuesToObjects_(APP.SHEETS.REVISION).forEach(record => {
    if (record.Status === APP.STATUS.FINISHED || !record['Next Revision']) return;
    const status = dateKey_(record['Next Revision']) <= today ? APP.STATUS.DUE : APP.STATUS.UPCOMING;
    if (record.Status !== status) updateObject_(APP.SHEETS.REVISION, record._row, { Status: status });
  });
}
