import { ADMIN_NAVIGATION } from '@/app/navigation';
import { DashboardShell } from './DashboardShell';

/** Layout for administrators, principals and other staff with school-wide access. */
export const AdminLayout = () => <DashboardShell navigation={ADMIN_NAVIGATION} />;
