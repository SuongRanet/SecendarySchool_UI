import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type {
  Student,
  StudentAttendanceSummary,
  StudentEnrollmentHistory,
  StudentParent,
} from '@/types/entities';
import { calculateAge, formatDate, formatPercent } from '@/utils/format';

/**
 * The printed student profile card (បណ្ណព័ត៌មានសិស្ស).
 *
 * Mounted only while printing, into document.body rather than inside the app:
 * the app shell is hidden for the duration, so the sheets print on their own
 * without the sidebar, and nothing here can leak into another page's print.
 *
 * Colours are literal rather than theme tokens. A document on paper is white
 * whatever the viewer's theme is, and dark-mode tokens would print white text.
 *
 * Health and household details have no columns in the database, so they print
 * as blank lines to be filled in by hand — the same way the paper form works —
 * rather than being invented.
 */

export interface StudentProfilePrintProps {
  student: Student;
  guardians: StudentParent[];
  history: StudentEnrollmentHistory[];
  attendance: StudentAttendanceSummary | null;
  language: string;
  onDone: () => void;
}

const Field = ({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) => (
  <div className={wide ? 'col-span-3' : undefined}>
    <dt className="text-[9px] text-[#5d6b82]">{label}</dt>
    <dd className="min-h-[1.35rem] border-b border-dotted border-[#b9c3d3] pb-px text-[10.5px] font-medium text-[#172033]">
      {value || ' '}
    </dd>
  </div>
);

const Section = ({
  number,
  title,
  accent,
  children,
}: {
  number: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) => (
  <article className={`profile-keep mt-5 border-l-4 pl-3.5 ${accent}`}>
    <h2 className="text-[12.5px] font-bold text-[#172033]">
      {number}. {title}
    </h2>
    {children}
  </article>
);

export const StudentProfilePrint = ({
  student,
  guardians,
  history,
  attendance,
  language,
  onDone,
}: StudentProfilePrintProps) => {
  const { t } = useTranslation(['students', 'common']);
  const p = (key: string, options?: Record<string, unknown>) => t(`students:print.${key}`, options);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('printing-profile');

    const finish = () => onDone();
    window.addEventListener('afterprint', finish);

    // One frame so the portal has painted before the dialog captures it.
    const frame = window.requestAnimationFrame(() => window.print());

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', finish);
      root.classList.remove('printing-profile');
    };
  }, [onDone]);

  const current = student.currentEnrollment;
  // Family name first, as Khmer names are written. fullNameKh from the API is
  // given-name first, so it is only a fallback for a record missing the parts.
  const khName = [student.lastNameKh, student.firstNameKh].filter(Boolean).join(' ') || student.fullNameKh || '';
  const latinName = `${student.lastNameEn} ${student.firstNameEn}`.trim();
  const homeroom = history.find((row) => row.academicYearId === current?.academicYearId)?.homeroomTeacherName;
  const emergency = guardians.find((g) => g.isEmergencyContact) ?? guardians.find((g) => g.isPrimaryContact);
  const age = student.dateOfBirth ? calculateAge(student.dateOfBirth) : null;

  const guardianName = (g: StudentParent) =>
    [g.lastNameKh, g.firstNameKh].filter(Boolean).join(' ') || g.fullName;

  const blankRows = Math.max(0, 3 - guardians.length);

  return createPortal(
    <div className="profile-print">
      <style>{'@page { size: A4; margin: 0; }'}</style>

      {/* ============================ PAGE 1 ============================ */}
      <section className="profile-sheet">
        <header className="text-center">
          <p className="text-[15px] font-bold leading-relaxed text-[#172033]">ព្រះរាជាណាចក្រកម្ពុជា</p>
          <p className="text-[12.5px] font-bold leading-relaxed text-[#172033]">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
          <div className="mx-auto mt-1 flex w-40 items-center justify-center gap-1.5" aria-hidden="true">
            <span className="h-px flex-1 bg-[#172033]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#172033]" />
            <span className="h-px w-4 bg-[#172033]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#172033]" />
            <span className="h-px flex-1 bg-[#172033]" />
          </div>
        </header>

        <div className="mt-2 flex items-start justify-between gap-4 text-[10.5px] leading-[1.65] text-[#172033]">
          <div>
            <p>{p('ministry')}</p>
            <p>{p('office')}</p>
            <p className="font-bold">{p('school')}</p>
          </div>
          <p className="text-right text-[9.5px] text-[#5d6b82]">{p('reference', { code: student.studentCode })}</p>
        </div>

        <div className="mt-3 text-center">
          <h1 className="text-[21px] font-bold leading-tight text-[#1e40af]">{p('title')}</h1>
          <p className="mt-1 text-[12.5px] font-bold text-[#1e40af]">
            {p('academicYear', { year: current?.academicYearName ?? '—' })}
          </p>
        </div>

        <Section number="1" title={p('sections.personal')} accent="border-[#1e40af]">
          <dl className="mt-2.5 grid grid-cols-3 gap-x-4 gap-y-2.5">
            <Field label={p('fields.studentCode')} value={student.studentCode} />
            <Field label={p('fields.nationalId')} value={student.nationalId} />
            <Field label={p('fields.status')} value={t(`students:status.${student.status}`)} />

            <Field label={p('fields.nameKh')} value={khName} />
            <Field label={p('fields.nameEn')} value={latinName} />
            <Field
              label={p('fields.gender')}
              value={student.gender ? t(`common:gender.${student.gender}`) : null}
            />

            <Field
              label={p('fields.dateOfBirth')}
              value={student.dateOfBirth ? formatDate(student.dateOfBirth, language) : null}
            />
            <Field label={p('fields.age')} value={age === null ? null : p('years', { count: age })} />
            <Field label={p('fields.phone')} value={student.phoneNumber} />

            <Field label={p('fields.grade')} value={current?.gradeLevelName} />
            <Field label={p('fields.class')} value={current?.className} />
            <Field label={p('fields.homeroom')} value={homeroom} />

            <Field
              label={p('fields.enrolledDate')}
              value={student.enrolledDate ? formatDate(student.enrolledDate, language) : null}
            />
            <Field label={p('fields.province')} value={student.province} />
            <Field label={p('fields.email')} value={student.email} />

            <Field label={p('fields.placeOfBirth')} value={student.placeOfBirth} wide />
            <Field label={p('fields.address')} value={student.currentAddress} wide />
          </dl>
        </Section>

        <Section number="2" title={p('sections.guardians')} accent="border-[#059669]">
          <table className="profile-table mt-2.5">
            <thead>
              <tr>
                <th className="w-[20%]">{p('fields.relationship')}</th>
                <th className="w-[28%]">{p('fields.name')}</th>
                <th className="w-[22%]">{p('fields.occupation')}</th>
                <th className="w-[18%]">{p('fields.phone')}</th>
                <th>{p('fields.contact')}</th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((g) => (
                <tr key={g.linkId}>
                  <td className="font-medium">{t(`students:relationship.${g.relationship}`)}</td>
                  <td>{guardianName(g)}</td>
                  <td>{g.occupation || '—'}</td>
                  <td className="tabular-nums">{g.phoneNumber || '—'}</td>
                  <td className="text-[9.5px]">
                    {[g.isPrimaryContact && p('primary'), g.isEmergencyContact && p('emergency')]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, index) => (
                <tr key={`blank-${index}`}>
                  <td>&nbsp;</td><td /><td /><td /><td />
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 rounded-md border border-[#fecdd3] bg-[#fff1f2] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#be123c]">
              {p('emergencyContact')}
            </p>
            {emergency ? (
              <p className="mt-0.5 text-[10.5px] text-[#172033]">
                <span className="font-semibold">{guardianName(emergency)}</span>{' '}
                <span className="text-[#5d6b82]">({t(`students:relationship.${emergency.relationship}`)})</span>
                {emergency.phoneNumber ? <span className="ml-3 tabular-nums">{emergency.phoneNumber}</span> : null}
              </p>
            ) : (
              <p className="mt-2 border-b border-dotted border-[#b9c3d3]">&nbsp;</p>
            )}
          </div>
        </Section>

        <footer className="mt-auto flex items-center justify-between border-t border-[#dfe5ee] pt-2 text-[8.5px] text-[#9aa6b8]">
          <span>{p('school')}</span>
          <span>{p('page', { page: 1, total: 2 })}</span>
        </footer>
      </section>

      {/* ============================ PAGE 2 ============================ */}
      <section className="profile-sheet">
        <div className="flex items-center justify-between border-b border-[#dfe5ee] pb-2 text-[10px]">
          <p className="font-semibold text-[#172033]">
            {p('title')} · <span className="font-normal text-[#5d6b82]">{khName || latinName} · {student.studentCode}</span>
          </p>
          <p className="text-[#5d6b82]">{p('academicYear', { year: current?.academicYearName ?? '—' })}</p>
        </div>

        <Section number="3" title={p('sections.academic')} accent="border-[#f59e0b]">
          <h3 className="mt-2.5 text-[10.5px] font-semibold text-[#172033]">{p('enrollmentHistory')}</h3>
          <table className="profile-table mt-1.5">
            <thead>
              <tr>
                <th>{p('fields.year')}</th>
                <th>{p('fields.grade')}</th>
                <th>{p('fields.class')}</th>
                <th>{p('fields.homeroom')}</th>
                <th>{p('fields.roll')}</th>
                <th>{p('fields.status')}</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-[#9aa6b8]">{p('noHistory')}</td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id}>
                    <td className="tabular-nums">{row.academicYearName}</td>
                    <td>{row.gradeLevelName}</td>
                    <td>{row.className}</td>
                    <td>{row.homeroomTeacherName || '—'}</td>
                    <td className="tabular-nums">{row.rollNumber || '—'}</td>
                    <td>{t(`students:enrollmentStatus.${row.status}`)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="mt-3.5 text-[10.5px] font-semibold text-[#172033]">{p('attendanceSummary')}</h3>
          <div className="mt-1.5 grid grid-cols-[repeat(5,1fr)_1.35fr] overflow-hidden rounded-md border border-[#dfe5ee] text-center">
            {[
              { key: 'present', value: attendance?.present, color: 'text-[#047857]' },
              { key: 'late', value: attendance?.late, color: 'text-[#d97706]' },
              { key: 'absent', value: attendance?.absent, color: 'text-[#e11d48]' },
              { key: 'excused', value: attendance?.excused, color: 'text-[#0369a1]' },
              { key: 'leave', value: attendance?.leave, color: 'text-[#5d6b82]' },
            ].map((cell) => (
              <div key={cell.key} className="border-r border-[#dfe5ee] px-2 py-2">
                <p className={`text-[17px] font-bold tabular-nums ${cell.color}`}>{cell.value ?? '—'}</p>
                <p className="text-[8.5px] text-[#5d6b82]">{p(`attendance.${cell.key}`)}</p>
              </div>
            ))}
            <div className="bg-[#f5f7fb] px-3 py-2 text-left">
              <p className="text-[8.5px] text-[#5d6b82]">{p('attendance.rate')}</p>
              <p className="text-[17px] font-bold tabular-nums text-[#172033]">
                {attendance ? formatPercent(attendance.attendanceRate, language) : '—'}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#dfe5ee]">
                <div
                  className="h-full bg-[#059669]"
                  style={{ width: `${Math.min(100, attendance?.attendanceRate ?? 0)}%` }}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section number="4" title={p('sections.health')} accent="border-[#f43f5e]">
          <div className="mt-2.5 grid grid-cols-2 gap-5">
            <div>
              <h3 className="text-[10.5px] font-semibold text-[#172033]">{p('health')}</h3>
              <dl className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-2.5">
                <Field label={p('fields.height')} />
                <Field label={p('fields.weight')} />
                <Field label={p('fields.bloodType')} />
                <Field label={p('fields.allergies')} wide />
                <Field label={p('fields.specialNeeds')} wide />
              </dl>
            </div>
            <div>
              <h3 className="text-[10.5px] font-semibold text-[#172033]">{p('family')}</h3>
              <ul className="mt-2 space-y-2 text-[10.5px]">
                {['idPoor', 'scholarship'].map((key) => (
                  <li key={key} className="flex items-center justify-between gap-2 border-b border-dotted border-[#dfe5ee] pb-1">
                    <span className="text-[#5d6b82]">{p(`fields.${key}`)}</span>
                    <span className="flex items-center gap-3">
                      <span><i className="profile-tick" /> {p('yes')}</span>
                      <span><i className="profile-tick" /> {p('no')}</span>
                    </span>
                  </li>
                ))}
                {['income', 'household', 'livesWith', 'distance'].map((key) => (
                  <li key={key} className="flex items-end justify-between gap-3 border-b border-dotted border-[#dfe5ee] pb-1">
                    <span className="shrink-0 text-[#5d6b82]">{p(`fields.${key}`)}</span>
                    <span>&nbsp;</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <article className="profile-keep mt-5 border-l-4 border-[#94a3b8] pl-3.5">
          <h2 className="text-[11px] font-bold text-[#172033]">{p('remarks')}</h2>
          <div className="mt-1.5 space-y-2.5">
            <p className="min-h-[1.35rem] border-b border-dotted border-[#b9c3d3] text-[10.5px]">
              {student.notes || ' '}
            </p>
            <p className="min-h-[1.35rem] border-b border-dotted border-[#b9c3d3]">&nbsp;</p>
          </div>
        </article>

        <section className="profile-keep mt-auto pt-4">
          <p className="text-right text-[10px] leading-[1.7] text-[#172033]">
            {p('dateLunar')}
            <br />
            {p('dateSolar')}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-5 text-center">
            <div>
              <p className="text-[10.5px] font-semibold text-[#172033]">{p('sign.parent')}</p>
              <div className="mt-[20mm] border-t border-dotted border-[#172033] pt-1 text-[9px] text-[#5d6b82]">
                {emergency ? guardianName(emergency) : p('sign.name')}
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold text-[#172033]">{p('sign.teacher')}</p>
              <div className="mt-[20mm] border-t border-dotted border-[#172033] pt-1 text-[9px] text-[#5d6b82]">
                {homeroom || p('sign.name')}
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-[#172033]">{p('sign.approved')}</p>
              <p className="text-[10.5px] font-semibold text-[#172033]">{p('sign.principal')}</p>
              <div className="mx-auto mt-[4mm] h-[14mm] w-[14mm] rounded-full border border-dashed border-[#9aa6b8] text-[7.5px] leading-[14mm] text-[#9aa6b8]">
                {p('sign.seal')}
              </div>
              <div className="mt-1 border-t border-dotted border-[#172033] pt-1 text-[9px] text-[#5d6b82]">
                {p('sign.name')}
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-4 flex items-center justify-between border-t border-[#dfe5ee] pt-2 text-[8.5px] text-[#9aa6b8]">
          <span>{p('generated', { date: formatDate(new Date().toISOString(), language) })}</span>
          <span>{p('page', { page: 2, total: 2 })}</span>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
