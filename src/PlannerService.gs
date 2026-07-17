function recordPlan_(email, answers) {
  const user = requireUser_(email);
  const subjects = ensureArray_(answers.Subjects);
  const hours = toNumber_(answers['Target Hours']);
  if (!subjects.length || hours <= 0) throw new Error('Choose at least one subject and provide a positive target hour value.');
  subjects.forEach(subject => appendObject_(APP.SHEETS.PLANNER, { 'Plan ID': createId_('PLN'), 'User ID': user['User ID'], Email: email, Week: normalise_(answers.Week), Date: now_(), Subject: subject, Topic: getRecommendedTopic_(user, subject), 'Planned Hours': Math.round((hours / subjects.length) * 100) / 100, Priority: normalise_(answers.Priority), Status: APP.STATUS.NOT_STARTED }));
}

function getRecommendedTopic_(user, subject) {
  const due = valuesToObjects_(APP.SHEETS.REVISION).find(row => row['User ID'] === user['User ID'] && row.Subject === subject && row.Status === APP.STATUS.DUE);
  if (due) return due.Topic;
  const progress = valuesToObjects_(APP.SHEETS.SYLLABUS).find(row => row['User ID'] === user['User ID'] && row.Subject === subject && row.Status !== APP.STATUS.COMPLETED);
  return progress ? progress.Topic : 'Review completed topics';
}

function getRecommendation_(user) {
  const due = valuesToObjects_(APP.SHEETS.REVISION).filter(row => row['User ID'] === user['User ID'] && row.Status === APP.STATUS.DUE)[0];
  if (due) return Object.assign(chooseRecommendation_(due, null), { reason: 'Revision is due today' });
  const syllabus = valuesToObjects_(APP.SHEETS.SYLLABUS).filter(row => row['User ID'] === user['User ID'] && row.Status !== APP.STATUS.COMPLETED).sort((a, b) => toNumber_(b['Estimated Weightage']) - toNumber_(a['Estimated Weightage']))[0];
  if (syllabus) return Object.assign(chooseRecommendation_(null, syllabus), { reason: 'Highest-weight pending topic' });
  return Object.assign(chooseRecommendation_(null, null), { reason: 'Your listed syllabus is complete' });
}
