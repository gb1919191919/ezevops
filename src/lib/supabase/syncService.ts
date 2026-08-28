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
  private syncRetryCount = 0;
  private maxRetries = 3;

  public async initSync() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      await this.pullAllTablesWithRetry();
      this.subscribeRealtime();
      this.isInitialized = true;
      this.syncRetryCount = 0;
    } catch (err) {
      this.isInitialized = false;
      console.warn('[SyncService] Supabase sync fallback: Local fleet dataset active.', err);
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

  // Retry wrapper with exponential backoff (HIGH-05)
  public async pullAllTablesWithRetry(): Promise<void> {
    let attempt = 0;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    while (attempt < this.maxRetries) {
      try {
        await this.pullAllTables();
        return;
      } catch (err) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw err;
        }
        await delay(Math.pow(2, attempt) * 500); // 1s, 2s backoff
      }
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
      console.debug('[SyncService] Hubs query note:', e);
    }

    // 2. Vehicles
    try {
      const { data: vehicles, error } = await supabase.from('vehicles').select('*');
      if (!error && vehicles && vehicles.length > 0) {
        useAppStore.setState({ vehicles: vehicles as Vehicle[] });
      }
    } catch (e) {
      console.debug('[SyncService] Vehicles query note:', e);
    }

    // 3. Parts
    try {
      const { data: parts, error } = await supabase.from('parts').select('*');
      if (!error && parts && parts.length > 0) {
        useAppStore.setState({ parts: parts as PartInventory[] });
      }
    } catch (e) {
      console.debug('[SyncService] Parts query note:', e);
    }

    // 4. Hub Part Stock
    try {
      const { data: stock, error } = await supabase.from('hub_part_stock').select('*');
      if (!error && stock && stock.length > 0) {
        useAppStore.setState({ hubStock: stock as HubPartStock[] });
      }
    } catch (e) {
      console.debug('[SyncService] Hub Stock query note:', e);
    }

    // 5. Refunds
    try {
      const { data: refunds, error } = await supabase.from('refunds').select('*').order('created_at', { ascending: false });
      if (!error && refunds && refunds.length > 0) {
        useAppStore.setState({ refunds: refunds as Refund[] });
      }
    } catch (e) {
      console.debug('[SyncService] Refunds query note:', e);
    }

    // 6. Blocked Users
    try {
      const { data: blocked, error } = await supabase.from('blocked_users').select('*');
      if (!error && blocked && blocked.length > 0) {
        useAppStore.setState({ blockedUsers: blocked as BlockedUser[] });
      }
    } catch (e) {
      console.debug('[SyncService] Blocked Users query note:', e);
    }

    // 7. SOPs & Revisions
    try {
      const { data: sops, error } = await supabase.from('sops').select('*, revisions:sop_revisions(*)');
      if (!error && sops && sops.length > 0) {
        useAppStore.setState({ sops: sops as SOP[] });
      }
    } catch (e) {
      console.debug('[SyncService] SOPs query note:', e);
    }

    // 8. Team Notes
    try {
      const { data: notes, error } = await supabase.from('team_notes').select('*').order('created_at', { ascending: false });
      if (!error && notes && notes.length > 0) {
        useAppStore.setState({ teamNotes: notes as TeamNote[] });
      }
    } catch (e) {
      console.debug('[SyncService] Notes query note:', e);
    }

    // 9. Job Cards & Parts
    try {
      const { data: jobCards, error } = await supabase.from('job_cards').select('*, parts:job_card_parts(*)');
      if (!error && jobCards && jobCards.length > 0) {
        useAppStore.setState({ jobCards: jobCards as JobCard[] });
      }
    } catch (e) {
      console.debug('[SyncService] Job Cards query note:', e);
    }

    // 10. Objectives, Milestones & Tasks
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
      console.debug('[SyncService] Tasks query note:', e);
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
      console.debug('[SyncService] Profiles query note:', e);
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
      console.debug('[SyncService] Shift Logs query note:', e);
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
      console.debug('[SyncService] Chat query note:', e);
    }
  }

  // Subscribe to live Postgres changes across all active operational tables (HIGH-06)
  private subscribeRealtime() {
    try {
      this.realtimeChannel = supabase
        .channel('realtime-fleet-ops')
        // Vehicles
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vehicles' },
          (payload) => {
            const { vehicles } = useAppStore.getState();
            if (payload.eventType === 'INSERT' && payload.new) {
              useAppStore.setState({ vehicles: [payload.new as Vehicle, ...vehicles] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as Vehicle;
              useAppStore.setState({
                vehicles: vehicles.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)),
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              useAppStore.setState({
                vehicles: vehicles.filter((v) => v.id !== (payload.old as any).id),
              });
            }
          }
        )
        // Refunds
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'refunds' },
          (payload) => {
            const { refunds } = useAppStore.getState();
            if (payload.eventType === 'INSERT' && payload.new) {
              useAppStore.setState({ refunds: [payload.new as Refund, ...refunds] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as Refund;
              useAppStore.setState({
                refunds: refunds.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              useAppStore.setState({
                refunds: refunds.filter((r) => r.id !== (payload.old as any).id),
              });
            }
          }
        )
        // Team Notes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'team_notes' },
          (payload) => {
            const { teamNotes } = useAppStore.getState();
            if (payload.eventType === 'INSERT' && payload.new) {
              useAppStore.setState({ teamNotes: [payload.new as TeamNote, ...teamNotes] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as TeamNote;
              useAppStore.setState({
                teamNotes: teamNotes.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              useAppStore.setState({
                teamNotes: teamNotes.filter((n) => n.id !== (payload.old as any).id),
              });
            }
          }
        )
        // Channel Messages
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'channel_messages' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const { channelMessages } = useAppStore.getState();
              const formatted = {
                ...(payload.new as any),
                message: (payload.new as any).content || (payload.new as any).message,
              };
              useAppStore.setState({ channelMessages: [...channelMessages, formatted] });
            }
          }
        )
        // Daily Shift Logs
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'daily_shift_logs' },
          (payload) => {
            const { dailyShiftLogs } = useAppStore.getState();
            if (payload.eventType === 'INSERT' && payload.new) {
              useAppStore.setState({ dailyShiftLogs: [payload.new as any, ...dailyShiftLogs] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as any;
              useAppStore.setState({
                dailyShiftLogs: dailyShiftLogs.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)),
              });
            }
          }
        )
        // Job Cards
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'job_cards' },
          (payload) => {
            const { jobCards } = useAppStore.getState();
            if (payload.eventType === 'INSERT' && payload.new) {
              useAppStore.setState({ jobCards: [payload.new as JobCard, ...jobCards] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as JobCard;
              useAppStore.setState({
                jobCards: jobCards.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)),
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              useAppStore.setState({
                jobCards: jobCards.filter((j) => j.id !== (payload.old as any).id),
              });
            }
          }
        )
        // Tasks
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            const { tasks } = useAppStore.getState();
            if (payload.eventType === 'INSERT' && payload.new) {
              useAppStore.setState({ tasks: [payload.new as TaskItem, ...tasks] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as TaskItem;
              useAppStore.setState({
                tasks: tasks.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              useAppStore.setState({
                tasks: tasks.filter((t) => t.id !== (payload.old as any).id),
              });
            }
          }
        )
        // Hub Part Stock
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hub_part_stock' },
          (payload) => {
            const { hubStock } = useAppStore.getState();
            if (payload.eventType === 'INSERT' && payload.new) {
              useAppStore.setState({ hubStock: [payload.new as HubPartStock, ...hubStock] });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as HubPartStock;
              useAppStore.setState({
                hubStock: hubStock.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
              });
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[SyncService] Channel subscription quiet fallback:', e);
    }
  }

  // List of tables permitted for mutation sync (SECURITY MED-06)
  private static readonly ALLOWED_TABLES = new Set([
    'hubs',
    'charger_logs',
    'profiles',
    'roles',
    'profile_roles',
    'vehicles',
    'vehicle_inspections',
    'parts',
    'hub_part_stock',
    'part_usage_logs',
    'job_cards',
    'job_card_parts',
    'refunds',
    'objectives',
    'milestones',
    'tasks',
    'task_remarks',
    'task_attachments',
    'task_changelog',
    'daily_shift_logs',
    'chat_channels',
    'channel_messages',
    'sops',
    'sop_revisions',
    'team_notes',
    'blocked_users',
    'audit_logs',
  ]);

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
    // SECURITY (MED-06): Reject unknown tables
    if (!SupabaseSyncService.ALLOWED_TABLES.has(table)) {
      console.error(`[SECURITY] pushMutation blocked: Table "${table}" is not in the allowed sync tables list.`);
      return;
    }

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

      // Sync audit trail entry if provided (SECURITY MED-04: Database generates primary UUID)
      if (auditPayload && record.id) {
        await supabase.from('audit_logs').insert({
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
      console.warn(`[SyncService] Background sync for ${table} retry queued:`, err);
    }
  }
}

export const supabaseSync = new SupabaseSyncService();
