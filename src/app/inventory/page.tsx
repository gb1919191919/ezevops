import { InventoryMatrix } from '@/components/inventory/InventoryMatrix';

export const metadata = {
  title: 'Spare Parts Inventory | FleetOps',
};

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-zinc-100">
          Multi-Hub Spare Parts Inventory Matrix
        </h1>
        <p className="text-xs text-zinc-400">
          Physical shelf stock vs staged job card allocations with low threshold alerts
        </p>
      </div>

      <InventoryMatrix />
    </div>
  );
}
