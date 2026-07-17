function createStudentCalendar_(user) {
  if (user['Calendar ID']) return user['Calendar ID'];
  try {
    const calendar = Calendar.Calendars.insert({ summary: APP.NAME + ' — ' + user.Name, description: 'Completed study sessions for ' + user.Email, timeZone: APP.TIME_ZONE });
    Calendar.Acl.insert({ scope: { type: 'user', value: user.Email }, role: 'reader' }, calendar.id);
    const refreshed = getUserByEmail_(user.Email); updateObject_(APP.SHEETS.USERS, refreshed._row, { 'Calendar ID': calendar.id });
    return calendar.id;
  } catch (error) { logError_('Calendar', error, { email: user.Email }); return ''; }
}

function createMissingCalendars() { valuesToObjects_(APP.SHEETS.USERS).filter(user => !user['Calendar ID'] && String(user.Active).toUpperCase() !== 'FALSE').forEach(createStudentCalendar_); }

function createStudyCalendarEvent_(user, session, endTime) {
  if (getSetting_('CALENDAR_ENABLED') !== 'TRUE') return;
  const calendarId = user['Calendar ID'] || createStudentCalendar_(user);
  if (!calendarId) return;
  const start = new Date(session['Start Time']);
  try { Calendar.Events.insert({ summary: session.Subject + ' — ' + session.Topic, description: 'Goal: ' + session.Goal + '\nLogged by SSC Study OS', start: { dateTime: start.toISOString(), timeZone: APP.TIME_ZONE }, end: { dateTime: endTime.toISOString(), timeZone: APP.TIME_ZONE } }, calendarId); } catch (error) { logError_('Calendar', error, { sessionId: session['Session ID'], calendarId: calendarId }); }
}
