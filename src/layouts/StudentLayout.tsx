import { STUDENT_NAVIGATION } from '@/app/navigation';
import { DashboardShell } from './DashboardShell';

/** Layout for students in Grades 7-9 using the portal on their own device. */
export const StudentLayout = () => <DashboardShell navigation={STUDENT_NAVIGATION} />;
