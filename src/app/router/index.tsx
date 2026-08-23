import { Navigate, Route, Routes } from 'react-router-dom';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';

import { AuthLayout } from '@/layouts/AuthLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { TeacherLayout } from '@/layouts/TeacherLayout';
import { ParentLayout } from '@/layouts/ParentLayout';
import { StudentLayout } from '@/layouts/StudentLayout';

import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { VerifyPage } from '@/features/auth/VerifyPage';

import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TeacherDashboardPage } from '@/features/dashboard/TeacherDashboardPage';
import { ParentDashboardPage } from '@/features/dashboard/ParentDashboardPage';

import { AcademicYearsPage } from '@/features/academics/AcademicYearsPage';
import { GradeLevelsPage } from '@/features/academics/GradeLevelsPage';
import { RoomsPage } from '@/features/academics/RoomsPage';
import { SubjectsPage } from '@/features/academics/SubjectsPage';
import { ClassesPage } from '@/features/academics/ClassesPage';
import { ClassDetailPage } from '@/features/academics/ClassDetailPage';

import { StudentsPage } from '@/features/students/StudentsPage';
import { StudentDetailPage } from '@/features/students/StudentDetailPage';
import { TeachersPage } from '@/features/teachers/TeachersPage';
import { TeacherDetailPage } from '@/features/teachers/TeacherDetailPage';
import { ParentsPage } from '@/features/parents/ParentsPage';
import { ParentDetailPage } from '@/features/parents/ParentDetailPage';

import { EnrollmentsPage } from '@/features/enrollments/EnrollmentsPage';
import { SchedulesPage } from '@/features/schedules/SchedulesPage';
import { AttendancePage } from '@/features/attendance/AttendancePage';

import { AssessmentsPage } from '@/features/assessments/AssessmentsPage';
import { AssessmentDetailPage } from '@/features/assessments/AssessmentDetailPage';
import { ExamsPage } from '@/features/exams/ExamsPage';
import { GradesPage } from '@/features/grades/GradesPage';
import { ReportCardsPage } from '@/features/report-cards/ReportCardsPage';
import { ReportCardDetailPage } from '@/features/report-cards/ReportCardDetailPage';
import { AssignmentsPage } from '@/features/assignments/AssignmentsPage';
import { BehaviorsPage } from '@/features/behaviors/BehaviorsPage';

import { AnnouncementsPage } from '@/features/announcements/AnnouncementsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';

import { UsersPage } from '@/features/users/UsersPage';
import { RolesPage } from '@/features/users/RolesPage';
import { AuditLogsPage } from '@/features/audit/AuditLogsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ProfilePage } from '@/features/profile/ProfilePage';

import {
  TeacherClassDetailPage,
  TeacherClassesPage,
  TeacherSchedulePage,
} from '@/features/teacher-workspace/TeacherWorkspacePages';
import {
  ParentAttendancePage,
  ParentBehaviorPage,
  ParentChildrenPage,
  ParentGradesPage,
  ParentHomeworkPage,
  ParentReportCardsPage,
  ParentSchedulePage,
} from '@/features/parent-portal/ParentPortalPages';
import {
  StudentAttendancePage,
  StudentDashboardPage,
  StudentGradesPage,
  StudentHomeworkPage,
  StudentNationalExamPage,
  StudentSchedulePage,
} from '@/features/student-portal/StudentPortalPages';


import { NotFoundPage } from '@/pages/NotFoundPage';
import { RequireAuth, RequireGuest, RequirePermission } from './guards';

/**
 * Route table.
 *
 * Permission guards here decide what the interface offers; the backend
 * authorizes every request again on its own, so a guard is never the only
 * protection on a route.
 */
export const AppRouter = () => (
  <Routes>
    {/* Public */}
    <Route element={<RequireGuest />}>
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        <Route path={ROUTES.verify} element={<VerifyPage />} />
      </Route>
    </Route>

    {/* Authenticated */}
    <Route element={<RequireAuth />}>
      {/* Administrator / principal workspace */}
      <Route element={<AdminLayout />}>
        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.notifications} element={<NotificationsPage />} />

        <Route element={<RequirePermission permissions={[PERMISSIONS.STUDENTS_VIEW]} />}>
          <Route path={ROUTES.students} element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.PARENTS_VIEW]} />}>
          <Route path={ROUTES.parents} element={<ParentsPage />} />
          <Route path="/parents/:id" element={<ParentDetailPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.TEACHERS_VIEW]} />}>
          <Route path={ROUTES.teachers} element={<TeachersPage />} />
          <Route path="/teachers/:id" element={<TeacherDetailPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ACADEMIC_YEARS_VIEW]} />}>
          <Route path={ROUTES.academicYears} element={<AcademicYearsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.GRADE_LEVELS_VIEW]} />}>
          <Route path={ROUTES.gradeLevels} element={<GradeLevelsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ROOMS_VIEW]} />}>
          <Route path={ROUTES.rooms} element={<RoomsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.SUBJECTS_VIEW]} />}>
          <Route path={ROUTES.subjects} element={<SubjectsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.CLASSES_VIEW]} />}>
          <Route path={ROUTES.classes} element={<ClassesPage />} />
          <Route path="/classes/:id" element={<ClassDetailPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ENROLLMENTS_VIEW]} />}>
          <Route path={ROUTES.enrollments} element={<EnrollmentsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.SCHEDULES_VIEW]} />}>
          <Route path={ROUTES.schedules} element={<SchedulesPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ATTENDANCE_VIEW]} />}>
          <Route path={ROUTES.attendance} element={<AttendancePage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ASSESSMENTS_VIEW]} />}>
          <Route path={ROUTES.assessments} element={<AssessmentsPage />} />
          <Route path="/assessments/:id" element={<AssessmentDetailPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.EXAMS_VIEW]} />}>
          <Route path={ROUTES.exams} element={<ExamsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.GRADES_VIEW]} />}>
          <Route path={ROUTES.grades} element={<GradesPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.REPORT_CARDS_VIEW]} />}>
          <Route path={ROUTES.reportCards} element={<ReportCardsPage />} />
          <Route path="/report-cards/:id" element={<ReportCardDetailPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ASSIGNMENTS_VIEW]} />}>
          <Route path={ROUTES.assignments} element={<AssignmentsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.BEHAVIORS_VIEW]} />}>
          <Route path={ROUTES.behaviors} element={<BehaviorsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ANNOUNCEMENTS_VIEW]} />}>
          <Route path={ROUTES.announcements} element={<AnnouncementsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.USERS_VIEW]} />}>
          <Route path={ROUTES.users} element={<UsersPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.ROLES_VIEW]} />}>
          <Route path={ROUTES.roles} element={<RolesPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.AUDIT_LOGS_VIEW]} />}>
          <Route path={ROUTES.auditLogs} element={<AuditLogsPage />} />
        </Route>

        <Route element={<RequirePermission permissions={[PERMISSIONS.SETTINGS_MANAGE]} />}>
          <Route path={ROUTES.settings} element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Teacher workspace */}
      <Route
        element={<RequirePermission permissions={[PERMISSIONS.DASHBOARD_TEACHER]} />}
      >
        <Route element={<TeacherLayout />}>
          <Route path={ROUTES.teacher.dashboard} element={<TeacherDashboardPage />} />
          <Route path={ROUTES.teacher.classes} element={<TeacherClassesPage />} />
          <Route path="/teacher/classes/:id" element={<TeacherClassDetailPage />} />
          <Route path={ROUTES.teacher.schedule} element={<TeacherSchedulePage />} />
          <Route path={ROUTES.teacher.attendance} element={<AttendancePage />} />
          <Route path={ROUTES.teacher.assessments} element={<AssessmentsPage />} />
          <Route path={ROUTES.teacher.grades} element={<GradesPage />} />
          <Route path={ROUTES.teacher.assignments} element={<AssignmentsPage />} />
          <Route path={ROUTES.teacher.behavior} element={<BehaviorsPage />} />
          <Route path={ROUTES.teacher.announcements} element={<AnnouncementsPage />} />
          <Route path="/teacher/profile" element={<ProfilePage />} />
          <Route path="/teacher/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      {/* Student portal — Grades 7-9 */}
      <Route element={<RequirePermission permissions={[PERMISSIONS.DASHBOARD_STUDENT]} />}>
        <Route element={<StudentLayout />}>
          <Route path={ROUTES.student.dashboard} element={<StudentDashboardPage />} />
          <Route path={ROUTES.student.schedule} element={<StudentSchedulePage />} />
          <Route path={ROUTES.student.homework} element={<StudentHomeworkPage />} />
          <Route path={ROUTES.student.grades} element={<StudentGradesPage />} />
          <Route path={ROUTES.student.attendance} element={<StudentAttendancePage />} />
          <Route path={ROUTES.student.nationalExam} element={<StudentNationalExamPage />} />
          <Route path={ROUTES.student.announcements} element={<AnnouncementsPage />} />
          <Route path="/student/profile" element={<ProfilePage />} />
          <Route path="/student/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      {/* Parent portal */}
      <Route element={<RequirePermission permissions={[PERMISSIONS.DASHBOARD_PARENT]} />}>
        <Route element={<ParentLayout />}>
          <Route path={ROUTES.parent.dashboard} element={<ParentDashboardPage />} />
          <Route path={ROUTES.parent.children} element={<ParentChildrenPage />} />
          <Route path={ROUTES.parent.schedule} element={<ParentSchedulePage />} />
          <Route path={ROUTES.parent.attendance} element={<ParentAttendancePage />} />
          <Route path={ROUTES.parent.grades} element={<ParentGradesPage />} />
          <Route path={ROUTES.parent.homework} element={<ParentHomeworkPage />} />
          <Route path={ROUTES.parent.behavior} element={<ParentBehaviorPage />} />
          <Route path={ROUTES.parent.reportCards} element={<ParentReportCardsPage />} />
          <Route path={ROUTES.parent.announcements} element={<AnnouncementsPage />} />
          <Route path="/parent/profile" element={<ProfilePage />} />
          <Route path="/parent/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      {/* Fallbacks */}
      <Route element={<AdminLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>

    <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />
  </Routes>
);
