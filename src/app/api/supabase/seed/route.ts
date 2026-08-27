import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  INITIAL_ROLES,
  INITIAL_HUBS,
  INITIAL_PROFILES,
  INITIAL_PARTS,
  INITIAL_HUB_STOCK,
  INITIAL_VEHICLES,
  INITIAL_REFUNDS,
  INITIAL_BLOCKED_USERS,
  INITIAL_SOPS,
  INITIAL_NOTES,
  INITIAL_JOB_CARDS,
  INITIAL_OBJECTIVES,
  INITIAL_MILESTONES,
  INITIAL_TASKS,
  INITIAL_DAILY_SHIFT_LOGS,
  INITIAL_CHAT_CHANNELS,
  INITIAL_CHANNEL_MESSAGES,
} from '@/lib/store/initialData';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const summary: Record<string, { status: 'inserted' | 'skipped' | 'error'; count?: number; error?: string }> = {};

    // 1. Roles
    try {
      const rolesToInsert = INITIAL_ROLES.map((r) => ({
        id: r.id,
        code: r.code,
        label: r.label,
        description: r.description,
        permissions: r.permissions || [],
        is_system: r.is_system,
      }));
      const { error } = await supabaseAdmin.from('roles').upsert(rolesToInsert, { onConflict: 'code' });
      summary['roles'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: rolesToInsert.length };
    } catch (e: any) {
      summary['roles'] = { status: 'error', error: e.message };
    }

    // 2. Hubs
    try {
      const hubsToInsert = INITIAL_HUBS.map((h) => ({
        id: h.id,
        name: h.name,
        code: h.code,
        type: h.type,
        city: h.city,
        address: h.address,
        poc_name: h.poc_name,
        poc_phone: h.poc_phone,
        day_guard_name: h.day_guard_name || null,
        day_guard_phone: h.day_guard_phone || null,
        night_guard_name: h.night_guard_name || null,
        night_guard_phone: h.night_guard_phone || null,
        charging_points_total: h.charging_points_total,
        charging_points_active: h.charging_points_active,
        is_warehouse: h.is_warehouse || false,
        is_active: h.is_active,
      }));
      const { error } = await supabaseAdmin.from('hubs').upsert(hubsToInsert, { onConflict: 'code' });
      summary['hubs'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: hubsToInsert.length };
    } catch (e: any) {
      summary['hubs'] = { status: 'error', error: e.message };
    }

    // 3. Profiles
    try {
      const profilesToInsert = INITIAL_PROFILES.map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        phone: p.phone,
        avatar_url: p.avatar_url,
        assigned_hub_id: p.assigned_hub_id || null,
        is_active: p.is_active,
      }));
      const { error } = await supabaseAdmin.from('profiles').upsert(profilesToInsert, { onConflict: 'email' });
      summary['profiles'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: profilesToInsert.length };

      // Link profile roles
      const profileRoles = INITIAL_PROFILES.flatMap((p) =>
        (p.roles || []).map((r) => ({
          profile_id: p.id,
          role_id: r.id,
        }))
      );
      if (profileRoles.length > 0) {
        await supabaseAdmin.from('profile_roles').upsert(profileRoles, { onConflict: 'profile_id,role_id' });
      }
    } catch (e: any) {
      summary['profiles'] = { status: 'error', error: e.message };
    }

    // 4. Parts
    try {
      const partsToInsert = INITIAL_PARTS.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description || null,
        unit_cost: p.unit_cost,
        min_threshold: p.min_threshold,
        supplier: p.supplier || null,
        is_active: p.is_active,
      }));
      const { error } = await supabaseAdmin.from('parts').upsert(partsToInsert, { onConflict: 'sku' });
      summary['parts'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: partsToInsert.length };
    } catch (e: any) {
      summary['parts'] = { status: 'error', error: e.message };
    }

    // 5. Hub Part Stock
    try {
      const stockToInsert = INITIAL_HUB_STOCK.map((s) => ({
        id: s.id,
        hub_id: s.hub_id,
        part_id: s.part_id,
        physical_stock: s.physical_stock,
        pending_allocated_stock: s.pending_allocated_stock,
        min_threshold: s.min_threshold,
      }));
      const { error } = await supabaseAdmin.from('hub_part_stock').upsert(stockToInsert, { onConflict: 'hub_id,part_id' });
      summary['hub_part_stock'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: stockToInsert.length };
    } catch (e: any) {
      summary['hub_part_stock'] = { status: 'error', error: e.message };
    }

    // 6. Vehicles
    try {
      const vehiclesToInsert = INITIAL_VEHICLES.map((v) => ({
        id: v.id,
        custom_vehicle_id: v.custom_vehicle_id || null,
        vehicle_id: v.vehicle_id,
        vin: v.vin,
        key_number: v.key_number,
        model: v.model,
        current_hub_id: v.current_hub_id || null,
        current_status: v.current_status,
        pending_status: v.pending_status || null,
        status_change_reason: v.status_change_reason || null,
        odometer_km: v.odometer_km || null,
        last_odometer_updated_at: v.last_odometer_updated_at || null,
        last_inspected_at: v.last_inspected_at || null,
        last_inspected_by: v.last_inspected_by || null,
        total_maintenance_spend: v.total_maintenance_spend || 0,
        active_days_count: v.active_days_count || 0,
        uptime_percentage: v.uptime_percentage || 100,
        is_active: v.is_active,
      }));
      const { error } = await supabaseAdmin.from('vehicles').upsert(vehiclesToInsert, { onConflict: 'vehicle_id' });
      summary['vehicles'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: vehiclesToInsert.length };
    } catch (e: any) {
      summary['vehicles'] = { status: 'error', error: e.message };
    }

    // 7. Objectives
    try {
      const objectivesToInsert = INITIAL_OBJECTIVES.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        start_date: o.start_date || null,
        target_date: o.target_date,
        hub_id: o.hub_id,
        created_by: o.created_by,
        is_completed: o.is_completed || false,
      }));
      const { error } = await supabaseAdmin.from('objectives').upsert(objectivesToInsert, { onConflict: 'id' });
      summary['objectives'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: objectivesToInsert.length };
    } catch (e: any) {
      summary['objectives'] = { status: 'error', error: e.message };
    }

    // 8. Milestones
    try {
      const milestonesToInsert = INITIAL_MILESTONES.map((m) => ({
        id: m.id,
        objective_id: m.objective_id,
        title: m.title,
        description: m.description || null,
        target_date: m.target_date || null,
        is_completed: m.is_completed || false,
        order_index: m.order_index || 0,
      }));
      const { error } = await supabaseAdmin.from('milestones').upsert(milestonesToInsert, { onConflict: 'id' });
      summary['milestones'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: milestonesToInsert.length };
    } catch (e: any) {
      summary['milestones'] = { status: 'error', error: e.message };
    }

    // 9. Tasks
    try {
      const tasksToInsert = INITIAL_TASKS.map((t) => ({
        id: t.id,
        objective_id: t.objective_id,
        milestone_id: t.milestone_id || null,
        title: t.title,
        description: t.description || null,
        assigned_to: t.assigned_to || [],
        priority: t.priority,
        status: t.status,
        vehicle_scope: t.vehicle_scope || 'NONE',
        vehicle_id: t.vehicle_id || null,
        vehicle_ids: t.vehicle_ids || [],
        start_date: t.start_date || null,
        due_date: t.due_date || null,
        completed_at: t.completed_at || null,
        created_by: t.created_by,
      }));
      const { error } = await supabaseAdmin.from('tasks').upsert(tasksToInsert, { onConflict: 'id' });
      summary['tasks'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: tasksToInsert.length };
    } catch (e: any) {
      summary['tasks'] = { status: 'error', error: e.message };
    }

    // 10. Job Cards & Job Card Parts
    try {
      const jobCardsToInsert = INITIAL_JOB_CARDS.map((j) => ({
        id: j.id,
        vehicle_id: j.vehicle_id,
        reported_by: j.reported_by,
        assigned_mechanic_id: j.assigned_mechanic_id,
        hub_id: j.hub_id,
        odometer_km: j.odometer_km || null,
        issue_description: j.issue_description,
        solution_applied: j.solution_applied || null,
        photos_url: j.photos_url || [],
        status: j.status,
        approved_by: j.approved_by || null,
        approval_notes: j.approval_notes || null,
        approved_at: j.approved_at || null,
      }));
      const { error } = await supabaseAdmin.from('job_cards').upsert(jobCardsToInsert, { onConflict: 'id' });
      summary['job_cards'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: jobCardsToInsert.length };

      const jobCardParts = INITIAL_JOB_CARDS.flatMap((j) =>
        (j.parts || []).map((p) => ({
          id: p.id,
          job_card_id: j.id,
          part_id: p.part_id,
          quantity: p.quantity,
          unit_cost_snapshot: p.unit_cost_snapshot,
          is_approved: p.is_approved,
        }))
      );
      if (jobCardParts.length > 0) {
        await supabaseAdmin.from('job_card_parts').upsert(jobCardParts, { onConflict: 'id' });
      }
    } catch (e: any) {
      summary['job_cards'] = { status: 'error', error: e.message };
    }

    // 11. Refunds
    try {
      const refundsToInsert = INITIAL_REFUNDS.map((r) => ({
        id: r.id,
        user_phone: r.user_phone,
        ride_id: r.ride_id,
        ride_date: r.ride_date,
        amount: r.amount,
        payout_type: r.payout_type,
        reason: r.reason,
        internal_remarks: r.internal_remarks || null,
        evidence_attachments: (r as any).evidence_attachments || [],
        status: r.status,
        requested_by: r.requested_by || null,
        requester_name: r.requester_name,
        requester_role: r.requester_role,
        approved_by: r.approved_by || null,
        settled_at: r.settled_at || null,
        settled_by_name: r.settled_by_name || null,
        rejection_reason: r.rejection_reason || null,
      }));
      const { error } = await supabaseAdmin.from('refunds').upsert(refundsToInsert, { onConflict: 'id' });
      summary['refunds'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: refundsToInsert.length };
    } catch (e: any) {
      summary['refunds'] = { status: 'error', error: e.message };
    }

    // 12. Daily Shift Logs
    try {
      const shiftLogsToInsert = INITIAL_DAILY_SHIFT_LOGS.map((s) => ({
        id: s.id,
        author_name: s.staff_name,
        author_role: s.staff_role,
        hub_id: s.hub_id,
        shift_date: s.date,
        shift_type: s.shift_type,
        accomplishments: s.accomplishments,
        vehicles_serviced: s.vehicles_serviced || 0,
        customer_issues_resolved: s.customer_issues_resolved || 0,
        roadblocks: s.blockers || null,
        media_attachments: (s as any).media_attachments || [],
      }));
      const { error } = await supabaseAdmin.from('daily_shift_logs').upsert(shiftLogsToInsert, { onConflict: 'id' });
      summary['daily_shift_logs'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: shiftLogsToInsert.length };
    } catch (e: any) {
      summary['daily_shift_logs'] = { status: 'error', error: e.message };
    }

    // 13. Chat Channels & Messages
    try {
      const channelsToInsert = INITIAL_CHAT_CHANNELS.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || null,
        is_system: c.is_system || false,
        is_private: c.is_private || false,
        allowed_roles: c.allowed_roles || [],
        allowed_members: (c as any).allowed_members || [],
      }));
      const { error: chanErr } = await supabaseAdmin.from('chat_channels').upsert(channelsToInsert, { onConflict: 'id' });
      summary['chat_channels'] = chanErr ? { status: 'error', error: chanErr.message } : { status: 'inserted', count: channelsToInsert.length };

      const messagesToInsert = INITIAL_CHANNEL_MESSAGES.map((m) => ({
        id: m.id,
        channel_id: m.channel_id,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        sender_role: m.sender_role,
        content: m.message,
        attachments: m.attachments || [],
      }));
      const { error: msgErr } = await supabaseAdmin.from('channel_messages').upsert(messagesToInsert, { onConflict: 'id' });
      summary['channel_messages'] = msgErr ? { status: 'error', error: msgErr.message } : { status: 'inserted', count: messagesToInsert.length };
    } catch (e: any) {
      summary['chat_channels'] = { status: 'error', error: e.message };
    }

    // 14. SOPs
    try {
      const sopsToInsert = INITIAL_SOPS.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        category: s.category,
        version: s.version,
        status: s.status,
        content: s.content,
        summary: s.summary,
        author_name: s.author_name,
        access_roles: s.access_roles,
        view_count: s.view_count || 0,
        acknowledged_by: s.acknowledged_by || [],
      }));
      const { error } = await supabaseAdmin.from('sops').upsert(sopsToInsert, { onConflict: 'code' });
      summary['sops'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: sopsToInsert.length };
    } catch (e: any) {
      summary['sops'] = { status: 'error', error: e.message };
    }

    // 15. Team Notes
    try {
      const notesToInsert = INITIAL_NOTES.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        status: n.status,
        priority: n.priority,
        tags: n.tags || [],
        hub_id: n.hub_id || null,
        is_pinned: n.is_pinned || false,
        author_name: n.author_name,
        author_role: n.author_role,
      }));
      const { error } = await supabaseAdmin.from('team_notes').upsert(notesToInsert, { onConflict: 'id' });
      summary['team_notes'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: notesToInsert.length };
    } catch (e: any) {
      summary['team_notes'] = { status: 'error', error: e.message };
    }

    // 16. Blocked Users
    try {
      const blockedToInsert = INITIAL_BLOCKED_USERS.map((b) => ({
        id: b.id,
        employee_name: b.employee_name,
        date: b.date,
        user_email: b.user_email,
        user_name: b.user_name,
        phone: b.phone,
        vehicle_no: b.vehicle_no,
        reason: b.reason,
        recovery_status: b.recovery_status,
        recovery_amount: b.recovery_amount,
      }));
      const { error } = await supabaseAdmin.from('blocked_users').upsert(blockedToInsert, { onConflict: 'id' });
      summary['blocked_users'] = error ? { status: 'error', error: error.message } : { status: 'inserted', count: blockedToInsert.length };
    } catch (e: any) {
      summary['blocked_users'] = { status: 'error', error: e.message };
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase seed execution completed across all production collections.',
      summary,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
