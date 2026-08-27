import { DailyShiftLogs } from '@/components/shift-logs/DailyShiftLogs';

export const metadata = {
  title: 'Daily Shift Logs | EzEv Operations',
  description: 'Staff shift check-ins, end-of-day summaries, and cross-hub daily digests',
};

export default function ShiftLogsPage() {
  return <DailyShiftLogs />;
}
