function runAllTests() {
  testDurationCalculation_(); testUserScoping_(); testRevisionProgression_(); testStreakCalculation_(); testRecommendationRanking_(); testEmailDeduplication_(); testMalformedInput_();
  Logger.log('All SSC Study OS unit checks passed.');
}

function testDurationCalculation_() { assertEquals_(1.5, durationHours_(new Date('2026-07-17T09:00:00+05:30'), new Date('2026-07-17T10:30:00+05:30')), 'duration calculation'); }
function testUserScoping_() { assertEquals_(1, recordsForUser_([{ 'User ID': 'A' }, { 'User ID': 'B' }], 'A').length, 'user scoping'); }
function testRevisionProgression_() { assertEquals_('2026-07-20', dateKey_(nextRevisionDate_(new Date('2026-07-17T00:00:00+05:30'), [1, 3, 7], 1)), 'revision interval'); }
function testStreakCalculation_() { assertEquals_(3, calculateStreak_(['2026-07-17', '2026-07-16', '2026-07-15'], new Date('2026-07-17T12:00:00+05:30')), 'streak calculation'); }
function testRecommendationRanking_() { assertEquals_('Revise', chooseRecommendation_({ Subject: 'Quant', Topic: 'Percentage' }, { Subject: 'English', Topic: 'Grammar' }).action, 'revision precedence'); }
function testEmailDeduplication_() { assertEquals_('email:2026-07-17:USR-1:MORNING', emailDeduplicationKey_('2026-07-17', 'USR-1', 'MORNING'), 'email key'); }
function testMalformedInput_() { assertEquals_(0, toNumber_('not-a-number'), 'invalid number fallback'); }
function assertEquals_(expected, actual, label) { if (expected !== actual) throw new Error('Test failed (' + label + '): expected ' + expected + ', received ' + actual); }
