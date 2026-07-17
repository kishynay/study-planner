function recordMock_(email, answers) {
  const user = requireUser_(email); const total = toNumber_(answers['Total Marks']); const obtained = toNumber_(answers['Obtained Marks']); const accuracy = toNumber_(answers.Accuracy);
  if (total <= 0 || obtained < 0 || obtained > total || accuracy < 0 || accuracy > 100) throw new Error('Mock scores must be valid non-negative values and obtained marks cannot exceed total marks.');
  appendObject_(APP.SHEETS.MOCKS, { 'Mock ID': createId_('MCK'), 'User ID': user['User ID'], Email: email, Date: now_(), 'Mock Name': normalise_(answers['Mock Name']), Subject: normalise_(answers.Subject), 'Total Marks': total, 'Obtained Marks': obtained, Accuracy: accuracy / 100, 'Wrong Answers': toNumber_(answers['Wrong Answers']), 'Skipped Questions': toNumber_(answers['Skipped Questions']), 'Time Taken (Minutes)': toNumber_(answers['Time Taken']), Remarks: normalise_(answers.Remarks) });
}
