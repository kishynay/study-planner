# SSC Study OS

An installable Google Apps Script system for SSC CGL and CHSL aspirants. Students submit all data through focused Google Forms. The administrator owns the protected master Sheet, Forms, automation, and shared study calendars.

## Included

- Seven Forms: Registration, Start Study, End Study, Mock Test, Revision, Weekly Planning, and Syllabus Update.
- A protected Sheets database with user, session, mock, revision, syllabus, planner, dashboard, analytics, settings, Form map, template, and error-log tabs.
- CGL and CHSL starter topics, subject-prefilled study links, email reporting, revision scheduling, streaks, charts, and Calendar events.
- Central 15-minute reminder dispatcher; normal days send at most a morning plan, an optional priority reminder, and an evening summary. Weekly and monthly reports replace the evening summary.

## Prerequisites

1. A managed Google Workspace account with permission to create Forms, send email, and share calendars.
2. An administrator account that will own the system.
3. The Calendar API available to the Apps Script project. The manifest includes the Calendar advanced service; if the first install reports a Calendar error, open **Services** in Apps Script, add **Calendar API**, and enable the Calendar API for the linked Google Cloud project.

## Install

1. Create a new standalone Apps Script project at [script.google.com](https://script.google.com), or create a local project and deploy with `clasp`.
2. Copy `appsscript.json` and every `.gs` file from `src/` into that project. If using `clasp`, copy `.clasp.json.example` to `.clasp.json`, set `scriptId`, then run `clasp push`.
3. In the Apps Script editor, run `installStudyOs` once and grant the requested Google Workspace permissions.
4. Open the URL returned in the execution log. It is the new master Sheet.
5. In `Settings`, set the exam date, administrator email, default goal, reminder times, revision intervals, and Calendar toggle. The system validates these values on installation and will log an error if they are invalid.
6. In `Form Map`, copy and distribute only the `Registration` form's published URL. The system emails prefilled Start Study links after registration.
6.1 The installer creates an `Email Log` sheet to track sent reminders and prevent duplicate emails.
7. Run `dispatchReminders` once from the editor to authorize Gmail and verify trigger access. Review the project triggers and confirm the 15-minute dispatcher and hourly dashboard refresh exist.

## Operating Model

Students start with Registration using their Workspace account. Registration creates a unique user record, seeds the correct CGL/CHSL syllabus progress rows, creates and shares a dedicated study calendar, and sends a welcome email.

`Start Study` writes an open session. `End Study` finds that same student’s newest open session, calculates duration, captures quality metrics, closes the session, advances the topic to In Progress, updates the streak, and creates a completed-session Calendar event. The system rejects duplicate starts, missing ends, invalid durations, unknown topics, and invalid mock scores.

Mark a syllabus topic `Completed` to schedule its first revision. Each Revision submission increments the revision count and uses the configured spaced-repetition interval. The morning recommendation prioritizes overdue revisions, then the highest-weight incomplete topic, then a full mock.

The master Sheet remains administrator-only. Students receive their personalized progress, next action, reports, Forms, and shared calendar by email; do not share the master Sheet with students.

## Administration

- Add or edit reusable CGL/CHSL syllabus data in `Syllabus Templates` before registering new students.
- Use `Settings!B` values rather than modifying formulas or internal tabs. `DASHBOARD_SELECTED_EMAIL` chooses the learner shown in the admin dashboard; leave it blank to show the first active user.
- Use the **SSC Study OS** menu in the master Sheet to refresh the dashboard, run reminders, or create missing calendars.
- Inspect `Error Log` after initial rollout. Form processing errors also send a correction notice to the student.
- To disable a student, set their `Active` column to `FALSE`; their historical data remains intact and they stop receiving automation.

## Tests and Acceptance Check

Run `runAllTests` in Apps Script to check duration calculation, data scoping, revision progression, streaks, recommendation precedence, email deduplication, and malformed input handling.

For an end-to-end test, register two Workspace test accounts and verify that each receives only their own reminders and calendar. Submit a Start/End Study cycle, complete a syllabus topic, submit a revision and mock, then run `refreshDashboard`. Confirm the selected user's dashboard shows study and mock trends, subject distribution, completion, revision status, and the weak-topic heatmap.

## Notes

- Google Forms runs submit handlers after submission, so invalid submissions are reported by email rather than inline on the confirmation screen.
- The Calendar integration records actual completed sessions. The Weekly Planning form intentionally does not request time slots, so it does not create future calendar blocks.
- `resetStudyOsForDevelopment` deletes this script project's triggers and installation properties. Use it only in a disposable development project; it does not delete the master spreadsheet or Forms.
