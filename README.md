# TVET IAP Liaison Book (React + Express + MySQL)

Digital version of the Rwanda TVET Board Industrial Attachment Program liaison book (2025).

```
client/    React (Vite) app, Kinyarwanda and English, works offline
server/    Express API + MySQL (tables are created automatically)
scripts/   backup.sh, restore.sh
docker-compose.yml   whole system in one command
DEPLOY.md  putting it online, security and privacy checklist
```

## What it does
| Who | Can |
|---|---|
| **Learner** | Fill the whole book (9 sections), see marks, view the certificate |
| **Teacher** (school supervisor) | Open books of learners of their own school, edit, add visit forms, **issue the certificate with a QR code** |
| **Company supervisor** | Open books of learners who named them, fill the evaluation |
| **Admin (RTB)** | Add schools, approve teachers, see national/district totals, **download Excel**, see the activity log |
| **Anyone** | Scan the certificate QR code to check it is genuine (no login) |

Other features: Kinyarwanda/English, works with no internet (saves on the device, uploads later), automatic marks, printable pages.

## Quick start (development)
Needs Node.js 18+ and MySQL 8.
```
cd server && cp .env.example .env     # set DB_USER, DB_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD
npm install && npm run dev            # http://localhost:5000
cd client && npm install && npm run dev   # http://localhost:5173
```
Log in with ADMIN_EMAIL, add a school, then learners/teachers can register.
Teachers must be approved by the admin before they can log in.

**Schools:** the sign-up form has one box where people type or pick their school (suggestions come from the list). A school that is not in the list is created as *unverified*; the admin sees it under Schools and clicks Verify. The admin can paste the full official list under *Import schools* (one per line: `Name; District`). Starter list: `server/src/db.js`.

## Quick start (everything with Docker)
```
cp .env.example .env     # fill in passwords and JWT_SECRET
docker compose up -d --build     # open http://localhost
```

## Tests
```
cd server && npm test
```
Covers the marking rules (evaluation /100, workplace /50, report /30, theory /20).

## How it is organised
- Each learner's book is stored as JSON in `books.data`. For reports, the server also keeps `days_recorded`, `hours`, `eval_score` and `final_mark` as columns, recalculated on every save (`server/src/scoring.js`, same rules as `client/src/scoring.js`).
- Editing sends only the changed fields (PATCH), so a supervisor and a learner never overwrite each other.
- Teachers see only learners of their own school. Every login, edit by a supervisor, approval, certificate and export is written to `audit_log`.

## API
| Method | Path | Who |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | anyone (rate limited) |
| GET | /api/schools | anyone (for the sign-up form) |
| GET, PUT, PATCH | /api/books/me | learner |
| GET, POST | /api/books/me/certificate, /api/books/:id/certificate | learner / teacher issues |
| GET | /api/books | teacher, company |
| GET, PATCH | /api/books/:id | teacher, company (linked learners only) |
| GET | /api/verify/:code | public |
| GET, POST | /api/admin/stats, schools, teachers/pending, teachers/:id/approve | admin |
| GET | /api/admin/reports, /reports/export.xlsx, /reports/audit | admin |
| GET | /api/integration/summary | RTB systems, header `x-api-key` (only if RTB_API_KEY is set) |

## Known limits
- The marking weights follow the 2025 RTB book. The PDF lists 15 points for some groups that have four 0-5 statements (=20); we scale each group to its stated points. RTB should confirm.
- Kinyarwanda text was written without an official glossary. Ask RTB or a teacher to review `client/src/rw.json` (one line per phrase).
- No district-level admin role yet: the admin sees everything and can filter by district.
- Not yet load-tested; run a pilot in 1-3 schools first.

## Admin panel (RTB administrator)
Log in as the admin (ADMIN_EMAIL / ADMIN_PASSWORD). Tabs:
- **Overview**: what needs attention (pending teachers, unverified schools, failed logins), totals, system state.
- **Users**: search/filter, add, edit, approve, disable/enable, reset password (one-time temporary password shown once), delete. The last admin cannot be removed or disabled.
- **Schools**: add, import ("Name; District"), edit, verify, merge duplicates, delete (blocked if it has users).
- **Learners**, **Certificates** (withdraw/restore; a withdrawn QR shows "not valid"), **Reports** (district filter, Excel), **Activity** (filters, CSV).
- **Settings**: open/close registration, allow/forbid new typed schools, maintenance mode (only admins can use the system), announcement banner.
Disabled users are logged out within ~10 seconds. API: `/api/admin/*`, public `GET /api/settings`.
