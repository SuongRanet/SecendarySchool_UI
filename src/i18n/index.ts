import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enNavigation from './en/navigation.json';
import enValidation from './en/validation.json';
import enDashboard from './en/dashboard.json';
import enUsers from './en/users.json';
import enAcademics from './en/academics.json';
import enStudents from './en/students.json';
import enTeachers from './en/teachers.json';
import enAttendance from './en/attendance.json';
import enPerformance from './en/performance.json';
import enCommunication from './en/communication.json';
import enOperations from './en/operations.json';
import enSystem from './en/system.json';
import enNationalExam from './en/nationalExam.json';
import enStudentPortal from './en/studentPortal.json';

import khCommon from './kh/common.json';
import khAuth from './kh/auth.json';
import khNavigation from './kh/navigation.json';
import khValidation from './kh/validation.json';
import khDashboard from './kh/dashboard.json';
import khUsers from './kh/users.json';
import khAcademics from './kh/academics.json';
import khStudents from './kh/students.json';
import khTeachers from './kh/teachers.json';
import khAttendance from './kh/attendance.json';
import khPerformance from './kh/performance.json';
import khCommunication from './kh/communication.json';
import khOperations from './kh/operations.json';
import khSystem from './kh/system.json';
import khNationalExam from './kh/nationalExam.json';
import khStudentPortal from './kh/studentPortal.json';

export const NAMESPACES = [
  'common',
  'auth',
  'navigation',
  'validation',
  'dashboard',
  'users',
  'academics',
  'students',
  'teachers',
  'attendance',
  'performance',
  'communication',
  'operations',
  'system',
  'nationalExam',
  'studentPortal',
] as const;

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    validation: enValidation,
    dashboard: enDashboard,
    users: enUsers,
    academics: enAcademics,
    students: enStudents,
    teachers: enTeachers,
    attendance: enAttendance,
    performance: enPerformance,
    communication: enCommunication,
    operations: enOperations,
    system: enSystem,
    nationalExam: enNationalExam,
    studentPortal: enStudentPortal,
  },
  kh: {
    common: khCommon,
    auth: khAuth,
    navigation: khNavigation,
    validation: khValidation,
    dashboard: khDashboard,
    users: khUsers,
    academics: khAcademics,
    students: khStudents,
    teachers: khTeachers,
    attendance: khAttendance,
    performance: khPerformance,
    communication: khCommunication,
    operations: khOperations,
    system: khSystem,
    nationalExam: khNationalExam,
    studentPortal: khStudentPortal,
  },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'kh'],
    defaultNS: 'common',
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'sms.language.detected',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
