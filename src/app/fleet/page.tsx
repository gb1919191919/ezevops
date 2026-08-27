import { FleetTable } from '@/components/fleet/FleetTable';

export const metadata = {
  title: 'Fleet Master | FleetOps',
};

export default function FleetPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-zinc-100">
          Fleet Master Command Sheet
        </h1>
        <p className="text-xs text-zinc-400">
          Filterable EV master grid with two-phase staging badges and deep-dive lifecycle logs
        </p>
      </div>

      <FleetTable />
    </div>
  );
}
