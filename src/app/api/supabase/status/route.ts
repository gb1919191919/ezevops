import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tableChecks = [
      'hubs',
      'vehicles',
      'parts',
      'hub_part_stock',
      'refunds',
      'blocked_users',
      'sops',
      'team_notes',
      'job_cards',
      'tasks',
      'objectives',
      'profiles',
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
