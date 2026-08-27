import { supabase } from './client';
import { useAppStore } from '@/lib/store/appStore';
import {
  Hub,
  Vehicle,
  PartInventory,
  HubPartStock,
  Refund,
  BlockedUser,
  SOP,
  TeamNote,
  JobCard,
  TaskItem,
  Objective,
  Profile,
} from '@/types';

class SupabaseSyncService {
  private isInitialized = false;

  public async initSync() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    try {
      await this.pullAllTables();
      this.subscribeRealtime();
    } catch (err) {
      console.warn('Supabase sync notice: Operating with local real Mumbai fleet dataset.', err);
    }
  }

  public async pullAllTables() {
    const store = useAppStore.getState();

    // 1. Hubs
    try {
      const { data: hubs, error } = await supabase.from('hubs').select('*');
      if (!error && hubs && hubs.length > 0) {
        store.hubs = hubs as Hub[];
        useAppStore.setState({ hubs: hubs as Hub[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 2. Vehicles
    try {
      const { data: vehicles, error } = await supabase.from('vehicles').select('*');
      if (!error && vehicles && vehicles.length > 0) {
        useAppStore.setState({ vehicles: vehicles as Vehicle[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 3. Parts
    try {
      const { data: parts, error } = await supabase.from('parts').select('*');
      if (!error && parts && parts.length > 0) {
        useAppStore.setState({ parts: parts as PartInventory[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 4. Hub Part Stock
    try {
      const { data: stock, error } = await supabase.from('hub_part_stock').select('*');
      if (!error && stock && stock.length > 0) {
        useAppStore.setState({ hubStock: stock as HubPartStock[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 5. Refunds
    try {
      const { data: refunds, error } = await supabase.from('refunds').select('*').order('created_at', { ascending: false });
      if (!error && refunds && refunds.length > 0) {
        useAppStore.setState({ refunds: refunds as Refund[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 6. Blocked Users
    try {
      const { data: blocked, error } = await supabase.from('blocked_users').select('*');
      if (!error && blocked && blocked.length > 0) {
        useAppStore.setState({ blockedUsers: blocked as BlockedUser[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 7. SOPs
    try {
      const { data: sops, error } = await supabase.from('sops').select('*');
      if (!error && sops && sops.length > 0) {
        useAppStore.setState({ sops: sops as SOP[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 8. Team Notes
    try {
      const { data: notes, error } = await supabase.from('team_notes').select('*').order('created_at', { ascending: false });
      if (!error && notes && notes.length > 0) {
        useAppStore.setState({ teamNotes: notes as TeamNote[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 9. Job Cards
    try {
      const { data: jobCards, error } = await supabase.from('job_cards').select('*, parts:job_card_parts(*)');
      if (!error && jobCards && jobCards.length > 0) {
        useAppStore.setState({ jobCards: jobCards as JobCard[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 10. Objectives & Tasks
    try {
      const { data: objectives, error: objErr } = await supabase.from('objectives').select('*');
      if (!objErr && objectives && objectives.length > 0) {
        useAppStore.setState({ objectives: objectives as Objective[] });
      }

      const { data: tasks, error: tskErr } = await supabase.from('tasks').select('*, remarks:task_remarks(*)');
      if (!tskErr && tasks && tasks.length > 0) {
        useAppStore.setState({ tasks: tasks as TaskItem[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 11. Staff Profiles
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('*');
      if (!error && profiles && profiles.length > 0) {
        useAppStore.setState({ staffProfiles: profiles as Profile[] });
      }
    } catch (e) {
      // Keep baseline
    }
  }

  // Subscribe to live Postgres changes
  private subscribeRealtime() {
    try {
      supabase
        .channel('realtime-fleet-ops')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vehicles' },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as Vehicle;
              const { vehicles } = useAppStore.getState();
              useAppStore.setState({
                vehicles: vehicles.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)),
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'refunds' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const { refunds } = useAppStore.getState();
              useAppStore.setState({ refunds: [payload.new as Refund, ...refunds] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as Refund;
              const { refunds } = useAppStore.getState();
              useAppStore.setState({
                refunds: refunds.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'team_notes' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const { teamNotes } = useAppStore.getState();
              useAppStore.setState({ teamNotes: [payload.new as TeamNote, ...teamNotes] });
            }
          }
        )
        .subscribe();
    } catch (e) {
      // Channel subscription quiet fallback
    }
  }

  // Background mutation push helper
  public async pushMutation(table: string, action: 'insert' | 'update' | 'delete', record: any) {
    try {
      if (action === 'insert') {
        await supabase.from(table).insert(record);
      } else if (action === 'update' && record.id) {
        await supabase.from(table).update(record).eq('id', record.id);
      } else if (action === 'delete' && record.id) {
        await supabase.from(table).delete().eq('id', record.id);
      }
    } catch (err) {
      console.warn(`Supabase background sync for ${table} pending DB connection`, err);
    }
  }
}

export const supabaseSync = new SupabaseSyncService();
