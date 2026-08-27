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
  INITIAL_TASKS,
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
        is_system: r.is_system,
      }));
      const { error: rolesError } = await supabaseAdmin.from('roles').upsert(rolesToInsert, { onConflict: 'code' });
      summary['roles'] = rolesError ? { status: 'error', error: rolesError.message } : { status: 'inserted', count: rolesToInsert.length };
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
      const { error: hubsError } = await supabaseAdmin.from('hubs').upsert(hubsToInsert, { onConflict: 'code' });
      summary['hubs'] = hubsError ? { status: 'error', error: hubsError.message } : { status: 'inserted', count: hubsToInsert.length };
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
      const { error: profilesError } = await supabaseAdmin.from('profiles').upsert(profilesToInsert, { onConflict: 'email' });
      summary['profiles'] = profilesError ? { status: 'error', error: profilesError.message } : { status: 'inserted', count: profilesToInsert.length };
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
      const { error: partsError } = await supabaseAdmin.from('parts').upsert(partsToInsert, { onConflict: 'sku' });
      summary['parts'] = partsError ? { status: 'error', error: partsError.message } : { status: 'inserted', count: partsToInsert.length };
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
      const { error: stockError } = await supabaseAdmin.from('hub_part_stock').upsert(stockToInsert, { onConflict: 'hub_id,part_id' });
      summary['hub_part_stock'] = stockError ? { status: 'error', error: stockError.message } : { status: 'inserted', count: stockToInsert.length };
    } catch (e: any) {
      summary['hub_part_stock'] = { status: 'error', error: e.message };
    }

    // 6. Vehicles
    try {
      const vehiclesToInsert = INITIAL_VEHICLES.map((v) => ({
        id: v.id,
        vehicle_id: v.vehicle_id,
        vin: v.vin,
        key_number: v.key_number,
        model: v.model,
        current_hub_id: v.current_hub_id || null,
        current_status: v.current_status,
        status_change_reason: v.status_change_reason || null,
        odometer_km: v.odometer_km || 0,
        is_active: v.is_active,
      }));
      const { error: vehError } = await supabaseAdmin.from('vehicles').upsert(vehiclesToInsert, { onConflict: 'vehicle_id' });
      summary['vehicles'] = vehError ? { status: 'error', error: vehError.message } : { status: 'inserted', count: vehiclesToInsert.length };
    } catch (e: any) {
      summary['vehicles'] = { status: 'error', error: e.message };
    }

    // 7. Refunds
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
        frappe_reference: r.frappe_reference || null,
        status: r.status,
        requested_by: r.requested_by || null,
        requester_name: r.requester_name,
        requester_role: r.requester_role,
        approved_by: r.approved_by || null,
        settled_at: r.settled_at || null,
        settled_by_name: r.settled_by_name || null,
      }));
      const { error: refError } = await supabaseAdmin.from('refunds').upsert(refundsToInsert, { onConflict: 'id' });
      summary['refunds'] = refError ? { status: 'error', error: refError.message } : { status: 'inserted', count: refundsToInsert.length };
    } catch (e: any) {
      summary['refunds'] = { status: 'error', error: e.message };
    }

    // 8. Blocked Users
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
      const { error: blkError } = await supabaseAdmin.from('blocked_users').upsert(blockedToInsert, { onConflict: 'id' });
      summary['blocked_users'] = blkError ? { status: 'error', error: blkError.message } : { status: 'inserted', count: blockedToInsert.length };
    } catch (e: any) {
      summary['blocked_users'] = { status: 'error', error: e.message };
    }

    // 9. SOPs
    try {
      const sopsToInsert = INITIAL_SOPS.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        category: s.category,
        version: s.version,
        status: s.status,
        summary: s.summary,
        content: s.content,
        author_id: s.author_id || null,
        author_name: s.author_name,
        access_roles: s.access_roles,
        view_count: s.view_count,
        acknowledged_by: s.acknowledged_by,
      }));
      const { error: sopError } = await supabaseAdmin.from('sops').upsert(sopsToInsert, { onConflict: 'code' });
      summary['sops'] = sopError ? { status: 'error', error: sopError.message } : { status: 'inserted', count: sopsToInsert.length };
    } catch (e: any) {
      summary['sops'] = { status: 'error', error: e.message };
    }

    // 10. Team Notes
    try {
      const notesToInsert = INITIAL_NOTES.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        status: n.status,
        priority: n.priority,
        tags: n.tags,
        hub_id: n.hub_id || null,
        is_pinned: n.is_pinned,
        author_id: n.author_id || null,
        author_name: n.author_name,
        author_role: n.author_role,
        resolved_at: n.resolved_at || null,
        resolved_by_name: n.resolved_by_name || null,
      }));
      const { error: notesError } = await supabaseAdmin.from('team_notes').upsert(notesToInsert, { onConflict: 'id' });
      summary['team_notes'] = notesError ? { status: 'error', error: notesError.message } : { status: 'inserted', count: notesToInsert.length };
    } catch (e: any) {
      summary['team_notes'] = { status: 'error', error: e.message };
    }

    // 11. Objectives & Tasks
    try {
      const objectivesToInsert = INITIAL_OBJECTIVES.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        start_date: o.start_date || null,
        target_date: o.target_date,
        hub_id: o.hub_id || null,
        created_by: o.created_by || null,
        is_completed: o.is_completed,
      }));
      const { error: objError } = await supabaseAdmin.from('objectives').upsert(objectivesToInsert, { onConflict: 'id' });
      summary['objectives'] = objError ? { status: 'error', error: objError.message } : { status: 'inserted', count: objectivesToInsert.length };

      const tasksToInsert = INITIAL_TASKS.map((t) => ({
        id: t.id,
        objective_id: t.objective_id,
        title: t.title,
        description: t.description || null,
        assigned_to: t.assigned_to,
        priority: t.priority,
        status: t.status,
        vehicle_id: t.vehicle_id || null,
        start_date: t.start_date || null,
        due_date: t.due_date || null,
        completed_at: t.completed_at || null,
        created_by: t.created_by || null,
      }));
      const { error: tskError } = await supabaseAdmin.from('tasks').upsert(tasksToInsert, { onConflict: 'id' });
      summary['tasks'] = tskError ? { status: 'error', error: tskError.message } : { status: 'inserted', count: tasksToInsert.length };
    } catch (e: any) {
      summary['objectives_tasks'] = { status: 'error', error: e.message };
    }

    return NextResponse.json({
      success: true,
      summary,
      message: 'Supabase real data synchronization and seed executed successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
