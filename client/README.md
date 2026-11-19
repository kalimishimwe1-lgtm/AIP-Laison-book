# TVET IAP Liaison Book (React)

React + Vite version of the Rwanda TVET Board Industrial Attachment Program Liaison Book (2025).

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # production files in dist/
npm run preview
```
Needs Node.js 18 or newer. Entries save in the browser (localStorage).

## Structure
```
src/
  main.jsx       entry point
  App.jsx        header, tab navigation, page switching
  store.js       useStore hook (state + localStorage)
  ui.jsx         shared inputs: Inp, Sel, Area, Check, Box, Head
  sections.jsx   one component per tab
  scoring.js     all calculations (attendance, hours, evaluation, final marks)
  data.js        days, statuses, evaluation groups, visit items, interview questions
  styles.css     light/dark theme and print rules
```
To change evaluation points or questions, edit `src/data.js`.

## Scoring
- Company evaluation: each statement 0-5, each group scaled to its stated points, total /100.
- Workplace mark = evaluation / 2 (of 50). Report mark = interview scores (4 x 5) scaled to 30. Theory mark (of 20) typed by the teacher.

## Next steps
Logins and a shared database (e.g. Supabase or Firebase) for teachers and supervisors, many learners, Kinyarwanda and French, PDF export.
