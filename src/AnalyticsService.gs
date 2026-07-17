function getUserMetrics_(user) {
  const sessions = valuesToObjects_(APP.SHEETS.SESSIONS).filter(row => row['User ID'] === user['User ID'] && row.Status === APP.STATUS.CLOSED);
  const mocks = valuesToObjects_(APP.SHEETS.MOCKS).filter(row => row['User ID'] === user['User ID']);
  const syllabus = valuesToObjects_(APP.SHEETS.SYLLABUS).filter(row => row['User ID'] === user['User ID']);
  const revisions = valuesToObjects_(APP.SHEETS.REVISION).filter(row => row['User ID'] === user['User ID']);
  const today = dateKey_(now_()); const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); const monthStart = new Date(now_().getFullYear(), now_().getMonth(), 1);
  const hours = records => records.reduce((sum, record) => sum + toNumber_(record['Duration (Hours)']), 0);
  const subjectScores = APP.SUBJECTS.map(subject => { const filtered = sessions.filter(row => row.Subject === subject); return { subject: subject, score: filtered.length ? filtered.reduce((sum, row) => sum + toNumber_(row['Focus Rating (1-10)']), 0) / filtered.length : 0 }; }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  const scores = mocks.map(mock => toNumber_(mock['Obtained Marks']) / Math.max(toNumber_(mock['Total Marks']), 1) * 100);
  return { targetHours: toNumber_(user['Target Study Hours'], 6), todayHours: hours(sessions.filter(row => dateKey_(row.Date) === today)), weekHours: hours(sessions.filter(row => new Date(row.Date) >= sevenDaysAgo)), monthHours: hours(sessions.filter(row => new Date(row.Date) >= monthStart)), todayQuestions: sessions.filter(row => dateKey_(row.Date) === today).reduce((sum, row) => sum + toNumber_(row['Questions Solved']), 0), completedToday: syllabus.filter(row => row.Status === APP.STATUS.COMPLETED && row['Completion Date'] && dateKey_(row['Completion Date']) === today).length, dueRevisions: revisions.filter(row => row.Status === APP.STATUS.DUE).length, completion: syllabus.length ? syllabus.filter(row => row.Status === APP.STATUS.COMPLETED).length / syllabus.length * 100 : 0, averageFocus: sessions.length ? sessions.reduce((sum, row) => sum + toNumber_(row['Focus Rating (1-10)']), 0) / sessions.length : 0, mockCount: mocks.length, averageMockScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0, mockImprovement: scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0, strongSubject: subjectScores.length ? subjectScores[0].subject : 'No data', weakSubject: subjectScores.length ? subjectScores[subjectScores.length - 1].subject : 'No data', streak: toNumber_(getUserByEmail_(user.Email)['Active Streak']) };
}

function refreshDashboard() {
  markDueRevisions_();
  const users = valuesToObjects_(APP.SHEETS.USERS).filter(user => String(user.Active).toUpperCase() !== 'FALSE');
  const selectedEmail = getSetting_('DASHBOARD_SELECTED_EMAIL') || (users[0] && users[0].Email) || '';
  const selected = users.find(user => user.Email === selectedEmail) || users[0]; const dashboard = getSheet_(APP.SHEETS.DASHBOARD); const analytics = getSheet_(APP.SHEETS.ANALYTICS);
  dashboard.getRange(2, 1, Math.max(1, dashboard.getMaxRows() - 1), 23).clearContent(); analytics.getRange(2, 1, Math.max(1, analytics.getMaxRows() - 1), Math.max(1, analytics.getLastColumn())).clearContent();
  if (!selected) return;
  const metrics = getUserMetrics_(selected); const pairs = [['Selected student', selected.Name + ' (' + selected.Email + ')'], ['Today\'s Study Time', metrics.todayHours], ['Weekly Study Time', metrics.weekHours], ['Monthly Study Time', metrics.monthHours], ['Current Streak', metrics.streak], ['Study Goal Progress', metrics.targetHours ? metrics.todayHours / metrics.targetHours : 0], ['Syllabus Completion', metrics.completion / 100], ['Upcoming Revision', metrics.dueRevisions], ['Strong Subject', metrics.strongSubject], ['Weak Subject', metrics.weakSubject], ['Average Focus', metrics.averageFocus], ['Average Mock Score', metrics.averageMockScore / 100], ['Mock Improvement', metrics.mockImprovement / 100]];
  dashboard.getRange(2, 1, pairs.length, 4).setValues(pairs.map(pair => [pair[0], selected.Email, pair[1], now_()]));
  dashboard.getRange(3, 3, 3, 1).setNumberFormat('0.00'); dashboard.getRange(7, 3, 2, 1).setNumberFormat('0%'); dashboard.getRange(13, 3, 2, 1).setNumberFormat('0.0%');
  const analyticsRows = Object.keys(metrics).map(key => [selected.Email, key, metrics[key], now_()]); analytics.getRange(2, 1, analyticsRows.length, 4).setValues(analyticsRows);
  populateTrendData_(dashboard, selected); buildDashboardCharts_(dashboard);
}

function populateTrendData_(dashboard, user) {
  dashboard.getRange('H1:K1').setValues([['Date', 'Study Hours', 'Mock Date', 'Mock Score']]);
  const sessions = valuesToObjects_(APP.SHEETS.SESSIONS).filter(row => row['User ID'] === user['User ID'] && row.Status === APP.STATUS.CLOSED); const byDate = {};
  sessions.forEach(row => { const key = dateKey_(row.Date); byDate[key] = (byDate[key] || 0) + toNumber_(row['Duration (Hours)']); });
  const trendRows = Object.keys(byDate).sort().map(key => [new Date(key), byDate[key]]); if (trendRows.length) dashboard.getRange(2, 8, trendRows.length, 2).setValues(trendRows);
  const mockRows = valuesToObjects_(APP.SHEETS.MOCKS).filter(row => row['User ID'] === user['User ID']).map(row => [row.Date, toNumber_(row['Obtained Marks']) / Math.max(toNumber_(row['Total Marks']), 1)]); if (mockRows.length) dashboard.getRange(2, 10, mockRows.length, 2).setValues(mockRows);
  const subjectHours = APP.SUBJECTS.map(subject => [subject, sessions.filter(row => row.Subject === subject).reduce((sum, row) => sum + toNumber_(row['Duration (Hours)']), 0)]); dashboard.getRange('M1:N1').setValues([['Subject', 'Study Hours']]); dashboard.getRange(2, 13, subjectHours.length, 2).setValues(subjectHours);
  const syllabus = valuesToObjects_(APP.SHEETS.SYLLABUS).filter(row => row['User ID'] === user['User ID']); const statuses = [APP.STATUS.NOT_STARTED, APP.STATUS.IN_PROGRESS, APP.STATUS.COMPLETED].map(status => [status, syllabus.filter(row => row.Status === status).length]); dashboard.getRange('P1:Q1').setValues([['Syllabus Status', 'Topics']]); dashboard.getRange(2, 16, statuses.length, 2).setValues(statuses);
  const revisions = valuesToObjects_(APP.SHEETS.REVISION).filter(row => row['User ID'] === user['User ID']); const revisionStatuses = [APP.STATUS.DUE, APP.STATUS.UPCOMING, APP.STATUS.FINISHED].map(status => [status, revisions.filter(row => row.Status === status).length]); dashboard.getRange('S1:T1').setValues([['Revision Status', 'Topics']]); dashboard.getRange(2, 19, revisionStatuses.length, 2).setValues(revisionStatuses);
  const topicFocus = sessions.reduce((accumulator, session) => { const key = session.Subject + ' — ' + session.Topic; if (!accumulator[key]) accumulator[key] = []; accumulator[key].push(toNumber_(session['Focus Rating (1-10)'])); return accumulator; }, {}); const weakTopics = Object.keys(topicFocus).map(key => [key, topicFocus[key].reduce((sum, score) => sum + score, 0) / topicFocus[key].length]).sort((a, b) => a[1] - b[1]); dashboard.getRange('V1:W1').setValues([['Topic', 'Average Focus']]); if (weakTopics.length) dashboard.getRange(2, 22, weakTopics.length, 2).setValues(weakTopics);
  const rules = dashboard.getConditionalFormatRules().filter(rule => String(rule.getRanges()[0].getA1Notation()) !== 'W2:W50'); const heatRule = SpreadsheetApp.newConditionalFormatRule().setGradientMinpointWithValue('#fca5a5', SpreadsheetApp.InterpolationType.NUMBER, '1').setGradientMidpointWithValue('#fde68a', SpreadsheetApp.InterpolationType.NUMBER, '5').setGradientMaxpointWithValue('#86efac', SpreadsheetApp.InterpolationType.NUMBER, '10').setRanges([dashboard.getRange('W2:W50')]).build(); rules.push(heatRule); dashboard.setConditionalFormatRules(rules);
}

function buildDashboardCharts_(sheet) {
  sheet.getCharts().forEach(chart => sheet.removeChart(chart));
  const studyChart = sheet.newChart().asLineChart().addRange(sheet.getRange('H1:I50')).setPosition(2, 25, 0, 0).setOption('title', 'Study Hours Trend').build();
  const mockChart = sheet.newChart().asLineChart().addRange(sheet.getRange('J1:K50')).setPosition(20, 25, 0, 0).setOption('title', 'Mock Performance').build();
  const subjectChart = sheet.newChart().asPieChart().addRange(sheet.getRange('M1:N5')).setPosition(2, 33, 0, 0).setOption('title', 'Subject Distribution').build();
  const completionChart = sheet.newChart().asPieChart().addRange(sheet.getRange('P1:Q4')).setPosition(20, 33, 0, 0).setOption('title', 'Syllabus Completion').build();
  const revisionChart = sheet.newChart().asPieChart().addRange(sheet.getRange('S1:T4')).setPosition(38, 25, 0, 0).setOption('title', 'Revision Status').build();
  [studyChart, mockChart, subjectChart, completionChart, revisionChart].forEach(chart => sheet.insertChart(chart));
}
