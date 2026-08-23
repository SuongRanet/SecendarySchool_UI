# Hun Sen Turi Secondary School — Management System (Frontend)

The web client for the Hun Sen Turi Secondary School Management System, a lower secondary school
(junior high) in Cambodia serving **Grade 7, Grade 8 and Grade 9**.

```text
School      Hun Sen Turi Secondary School
Type        Lower secondary school (junior high), Cambodia
Grades      Grade 7 · Grade 8 · Grade 9
Curriculum  Cambodian lower secondary (MoEYS)
Languages   Khmer (kh) and English (en)
Exit exam   Grade 9 National Examination (Diplôme)
```

## Tech stack

| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS v4 (semantic design tokens) |
| Routing | React Router 6 |
| HTTP | Axios |
| State | Zustand |
| Forms | React Hook Form + Zod |
| i18n | i18next / react-i18next (English · Khmer) |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Vitest + Testing Library (jsdom) |

## Getting started

This client talks to the project's Express + PostgreSQL API, which must be running first.

```bash
cp .env.example .env.development
npm install
npm run dev
```

The client starts on `http://localhost:5173` and expects the API at the `VITE_API_URL` set in
`.env.development` (`http://localhost:3000/api/v1` by default).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint the source tree |
| `npm test` | Run the test suite |

## Layout

Feature-based, not type-based:

```text
src/
├── app/           App, providers, router, navigation
├── components/    ui/ · tables/ · navigation/ · feedback/ · schedule/
├── features/      one folder per domain area
├── hooks/         list query, resource loading, permissions, mutations
├── i18n/          en/ and kh/ translation namespaces
├── layouts/       Auth · Admin · Teacher · Student · Parent shells
├── pages/
├── services/      typed API clients
├── stores/        auth · theme · language · toast · selected child
├── types/
└── utils/
```

## Workspaces

The interface is role-based; each role gets its own shell and navigation.

- **Administrator / Principal** — students, guardians, teachers, academic years, grade levels,
  classes, subjects, enrolments, timetables, attendance, assessments, grades, report cards,
  announcements, audit logs
- **Teacher** — own classes and timetable, attendance, assessments, grade entry, homework.
  A subject teacher may only enter marks for the class–subject pairs assigned to them
- **Student** (Grades 7–9) — mobile-first portal: timetable, homework and submission, grades,
  attendance, announcements, and the Grade 9 national examination record
- **Parent / Guardian** — the same view for each linked child, with a child switcher

## Conventions

- **Backend authorization is the real security.** Role checks here are UI behaviour only; every
  request is authorized again by the API.
- **Never hard-code user-facing text** — use `{t('students.addStudent')}` so both English and Khmer
  stay complete.
- **Semantic design tokens** (primary, surface, border, text, muted, success, warning, danger)
  rather than repeated hard-coded colours.
- **Every data page needs loading, empty, error and success states.**
- Light and dark mode must both work, and the layout must hold up on a phone — teachers take
  attendance and students check homework from one.

## Environment

```text
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Hun Sen Turi Secondary School
VITE_DEFAULT_LANGUAGE=en
```

Never commit `.env` or `.env.development`; `.env.example` is the template.
