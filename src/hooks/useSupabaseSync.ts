'use client';

import { useEffect, useState } from 'react';
import { supabaseSync } from '@/lib/supabase/syncService';

export function useSupabaseSync() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (mounted) setSyncStatus('syncing');
      try {
        await supabaseSync.initSync();
        if (mounted) setSyncStatus('synced');
      } catch (err) {
        if (mounted) setSyncStatus('error');
      }
    }

    init();

    return () => {
      mounted = false;
      supabaseSync.unsubscribeRealtime();
    };
  }, []);

  return { syncStatus, refreshSync: () => supabaseSync.pullAllTables() };
}
