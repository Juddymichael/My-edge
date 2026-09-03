import { MobilePageFrame } from './MobilePageFrame';
import type { MobilePageProps } from './types';

export function DashboardMobile({ data }: MobilePageProps) {
  void data;
  return <MobilePageFrame title="Dashboard" description="Structure mobile dédiée — contenu à construire page par page." />;
}
