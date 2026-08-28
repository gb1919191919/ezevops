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
  private realtimeChannel: any = null;

  public async initSync() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      await this.pullAllTables();
      this.subscribeRealtime();
      this.isInitialized = true;
    } catch (err) {
      this.isInitialized = false;
      console.warn('Supabase sync notice: Operating with local real Mumbai fleet dataset.', err);
    }
  }

  public unsubscribeRealtime() {
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {
        // Channel cleanup fallback
      }
      this.realtimeChannel = null;
    }
  }

  public async pullAllTables() {
    const store = useAppStore.getState();

    // 1. Hubs & Charger Logs
    try {
      const { data: hubs, error } = await supabase.from('hubs').select('*, charger_logs:charger_logs(*)');
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

    // 7. SOPs & Revisions
    try {
      const { data: sops, error } = await supabase.from('sops').select('*, revisions:sop_revisions(*)');
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

    // 9. Job Cards & Parts
    try {
      const { data: jobCards, error } = await supabase.from('job_cards').select('*, parts:job_card_parts(*)');
      if (!error && jobCards && jobCards.length > 0) {
        useAppStore.setState({ jobCards: jobCards as JobCard[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 10. Objectives, Milestones & Tasks (with changelog, remarks, attachments)
    try {
      const { data: objectives, error: objErr } = await supabase.from('objectives').select('*');
      if (!objErr && objectives && objectives.length > 0) {
        useAppStore.setState({ objectives: objectives as Objective[] });
      }

      const { data: milestones, error: msErr } = await supabase.from('milestones').select('*').order('order_index', { ascending: true });
      if (!msErr && milestones && milestones.length > 0) {
        useAppStore.setState({ milestones: milestones as any[] });
      }

      const { data: tasks, error: tskErr } = await supabase
        .from('tasks')
        .select('*, remarks:task_remarks(*), attachments:task_attachments(*), changelog:task_changelog(*)');
      if (!tskErr && tasks && tasks.length > 0) {
        useAppStore.setState({ tasks: tasks as TaskItem[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 11. Staff Profiles & Joined Roles
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('*, roles:profile_roles(role:roles(*))');
      if (!error && profiles && profiles.length > 0) {
        const formattedProfiles = profiles.map((p: any) => ({
          ...p,
          roles: (p.roles || []).map((pr: any) => pr.role).filter(Boolean),
        }));
        useAppStore.setState({ staffProfiles: formattedProfiles as Profile[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 12. Daily Shift Logs
    try {
      const { data: shiftLogs, error } = await supabase.from('daily_shift_logs').select('*').order('created_at', { ascending: false });
      if (!error && shiftLogs && shiftLogs.length > 0) {
        const formattedLogs = shiftLogs.map((l: any) => ({
          ...l,
          date: l.shift_date || l.date,
          staff_name: l.author_name || l.staff_name,
          staff_role: l.author_role || l.staff_role,
          blockers: l.roadblocks || l.blockers,
        }));
        useAppStore.setState({ dailyShiftLogs: formattedLogs as any[] });
      }
    } catch (e) {
      // Keep baseline
    }

    // 13. Chat Channels & Messages
    try {
      const { data: channels, error: chanErr } = await supabase.from('chat_channels').select('*');
      if (!chanErr && channels && channels.length > 0) {
        useAppStore.setState({ chatChannels: channels as any[] });
      }

      const { data: messages, error: msgErr } = await supabase.from('channel_messages').select('*').order('created_at', { ascending: true });
      if (!msgErr && messages && messages.length > 0) {
        const formattedMessages = messages.map((m: any) => ({
          ...m,
          message: m.content || m.message,
        }));
        useAppStore.setState({ channelMessages: formattedMessages as any[] });
      }
    } catch (e) {
      // Keep baseline
    }
  }

  // Subscribe to live Postgres changes
  private subscribeRealtime() {
    try {
      this.realtimeChannel = supabase
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
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'channel_messages' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const { channelMessages } = useAppStore.getState();
              useAppStore.setState({ channelMessages: [...channelMessages, payload.new as any] });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'daily_shift_logs' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const { dailyShiftLogs } = useAppStore.getState();
              useAppStore.setState({ dailyShiftLogs: [payload.new as any, ...dailyShiftLogs] });
            }
          }
        )
        .subscribe();
    } catch (e) {
      // Channel subscription quiet fallback
    }
  }

  // Background mutation push helper with strict non-deletable soft-delete & audit retention
  public async pushMutation(
    table: string,
    action: 'insert' | 'update' | 'archive' | 'soft_delete' | 'restore' | 'delete',
    record: any,
    auditPayload?: {
      action?: 'INSERT' | 'UPDATE' | 'SOFT_DELETE' | 'ARCHIVE' | 'RESTORE';
      old_data?: any;
      new_data?: any;
      performed_by?: string;
      performer_name?: string;
    }
  ) {
    try {
      if (action === 'insert') {
        await supabase.from(table).insert(record);
      } else if (action === 'update' && record.id) {
        await supabase.from(table).update(record).eq('id', record.id);
      } else if ((action === 'delete' || action === 'archive' || action === 'soft_delete') && record.id) {
        // Enforce ZERO physical deletion: update soft-delete & archive flags
        const softDeletePayload = {
          ...record,
          is_archived: true,
          is_active: false,
          updated_at: new Date().toISOString(),
        };
        await supabase.from(table).update(softDeletePayload).eq('id', record.id);
      } else if (action === 'restore' && record.id) {
        const restorePayload = {
          ...record,
          is_archived: false,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        await supabase.from(table).update(restorePayload).eq('id', record.id);
      }

      // Sync audit trail entry if provided
      if (auditPayload && record.id) {
        await supabase.from('audit_logs').insert({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          table_name: table,
          record_id: String(record.id),
          action: auditPayload.action || (action === 'insert' ? 'INSERT' : action === 'delete' || action === 'archive' || action === 'soft_delete' ? 'ARCHIVE' : action === 'restore' ? 'RESTORE' : 'UPDATE'),
          performed_by: auditPayload.performed_by || 'system',
          performer_name: auditPayload.performer_name || 'Staff Member',
          old_data: auditPayload.old_data || null,
          new_data: auditPayload.new_data || record,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(`Supabase background sync for ${table} pending DB connection`, err);
    }
  }
}

export const supabaseSync = new SupabaseSyncService();
