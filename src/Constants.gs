const APP = Object.freeze({
  NAME: 'SSC Study OS',
  TIME_ZONE: 'Asia/Kolkata',
  VERSION: '1.0.0',
  SHEETS: {
    USERS: 'Users', SESSIONS: 'Study Sessions', MOCKS: 'Mock Tests',
    REVISION: 'Revision', SYLLABUS: 'Syllabus', PLANNER: 'Weekly Planner',
    DASHBOARD: 'Dashboard Data', ANALYTICS: 'Analytics', SETTINGS: 'Settings',
    INBOX: 'Inbox', LOGS: 'Logs', TEMPLATES: 'Syllabus Templates', FORMS: 'Form Map', ERRORS: 'Error Log', EMAIL_LOG: 'Email Log'
  },
  FORMS: {
    REGISTRATION: 'Registration', START: 'Start Study', END: 'End Study',
    MOCK: 'Mock Test', REVISION: 'Revision', PLANNING: 'Weekly Planning',
    SYLLABUS: 'Syllabus Update'
  },
  SUBJECTS: ['Quant', 'English', 'GK/GA', 'Reasoning'],
  REVISION_INTERVALS: [1, 3, 7, 15, 30],
  EMAIL_TYPES: { MORNING: 'MORNING', PRIORITY: 'PRIORITY', EVENING: 'EVENING', WEEKLY: 'WEEKLY', MONTHLY: 'MONTHLY' },
  STATUS: { OPEN: 'Open', CLOSED: 'Closed', NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', DUE: 'Due', UPCOMING: 'Upcoming', FINISHED: 'Finished' }
});

const HEADERS = Object.freeze({
  'Users': ['User ID', 'Name', 'Email', 'Exam', 'Target Study Hours', 'Daily Reminder Time', 'Weekly Planning Day', 'Active Streak', 'Calendar ID', 'Active', 'Created Date'],
  'Study Sessions': ['Session ID', 'User ID', 'Email', 'Subject', 'Topic', 'Goal', 'Start Time', 'End Time', 'Duration (Hours)', 'Completed', 'Questions Solved', 'Difficulty (1-5)', 'Focus Rating (1-10)', 'Notes', 'Date', 'Status'],
  'Mock Tests': ['Mock ID', 'User ID', 'Email', 'Date', 'Mock Name', 'Subject', 'Total Marks', 'Obtained Marks', 'Accuracy', 'Wrong Answers', 'Skipped Questions', 'Time Taken (Minutes)', 'Remarks'],
  'Revision': ['Revision ID', 'User ID', 'Email', 'Subject', 'Topic', 'Last Revision', 'Next Revision', 'Confidence (1-5)', 'Revision Count', 'Status'],
  'Syllabus': ['Progress ID', 'User ID', 'Email', 'Exam', 'Subject', 'Chapter', 'Topic', 'Status', 'Completion Date', 'Estimated Weightage'],
  'Weekly Planner': ['Plan ID', 'User ID', 'Email', 'Week', 'Date', 'Subject', 'Topic', 'Planned Hours', 'Priority', 'Status'],
  'Dashboard Data': ['Metric', 'Selected Student', 'Value', 'Updated At'],
  'Analytics': ['Email', 'Metric', 'Value', 'Updated At'],
  'Settings': ['Key', 'Value', 'Description'],
  'Syllabus Templates': ['Exam', 'Subject', 'Chapter', 'Topic', 'Estimated Weightage'],
  'Form Map': ['Form Type', 'Form ID', 'Edit URL', 'Published URL', 'Prefilled URL'],
  'Inbox': ['Task', 'Due Date', 'Priority', 'Status', 'Context'],
  'Logs': ['Timestamp', 'Service', 'Action', 'Status', 'Duration', 'Error'],
  'Error Log': ['Timestamp', 'Service', 'Message', 'Context'],
  'Email Log': ['Timestamp', 'User ID', 'Email', 'Type', 'DateKey']
});

const SETTING_DEFAULTS = Object.freeze({
  ADMIN_EMAIL: '', EXAM_DATE: '', REMINDER_CHECK_MINUTES: '15', MORNING_DEFAULT_HOUR: '06:00',
  EVENING_HOUR: '21:00', REVISION_INTERVALS: '1,3,7,15,30', MAX_DAILY_EMAILS: '3',
  PRIORITY_REMINDER_ENABLED: 'TRUE', CALENDAR_ENABLED: 'TRUE', STUDY_GOAL_HOURS: '6',
  FORMS_FOLDER_ID: '', DASHBOARD_SELECTED_EMAIL: '', INSTALLATION_COMPLETE: 'FALSE'
});
