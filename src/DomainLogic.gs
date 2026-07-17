function durationHours_(start, end) { return Math.round(((new Date(end).getTime() - new Date(start).getTime()) / 3600000) * 100) / 100; }

function revisionInterval_(intervals, completedCount) { return intervals[Math.min(completedCount, intervals.length - 1)]; }

function nextRevisionDate_(lastRevision, intervals, completedCount) {
  const next = new Date(lastRevision); next.setDate(next.getDate() + revisionInterval_(intervals, completedCount)); return next;
}

function calculateStreak_(activityDateKeys, today) {
  const dates = new Set(activityDateKeys); let streak = 0; const cursor = new Date(today);
  while (dates.has(dateKey_(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

function recordsForUser_(records, userId) { return records.filter(record => record['User ID'] === userId); }

function chooseRecommendation_(dueRevision, pendingTopic) {
  if (dueRevision) return { action: 'Revise', subject: dueRevision.Subject, topic: dueRevision.Topic };
  if (pendingTopic) return { action: 'Study', subject: pendingTopic.Subject, topic: pendingTopic.Topic };
  return { action: 'Mock Test', subject: 'Full Mock', topic: 'Full syllabus' };
}

function emailDeduplicationKey_(dateKey, userId, type) { return 'email:' + dateKey + ':' + userId + ':' + type; }
