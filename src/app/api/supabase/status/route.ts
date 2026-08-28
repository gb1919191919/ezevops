import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Authenticate caller session
    const serverClient = createServerSupabaseClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tableChecks = [
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
    ];

    const results: Record<string, { count: number | null; error: string | null }> = {};
    let anyTableFound = false;

    for (const table of tableChecks) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results[table] = { count: null, error: error.message };
      } else {
        anyTableFound = true;
        results[table] = { count: count ?? 0, error: null };
      }
    }

    return NextResponse.json({
      success: true,
      connected: true,
      tables: results,
      schemaReady: anyTableFound,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yliozdsnqnfjkpcuctwe.supabase.co',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
