-- ====================================================================
-- FLEET OPERATIONS PLATFORM - SEED DATA SCRIPT
-- ====================================================================

-- 1. SEED ROLES
INSERT INTO roles (id, code, label, description) VALUES
('11111111-1111-1111-1111-111111111111', 'owner', 'Owner (Admin)', 'Full system access, approval overrides, master audits, and system configuration'),
('22222222-2222-2222-2222-222222222222', 'manager', 'Manager', 'Hub assignment, task allocation, job card approvals, spare part usage sign-offs, and vehicle status management'),
('33333333-3333-3333-3333-333333333333', 'rsa', 'RSA (Roadside Assistance)', 'Field breakdown reporting, towing/battery swap logs, roadside repair execution, and field expense logging'),
('44444444-4444-4444-4444-444444444444', 'mechanic', 'Mechanic', 'Maintenance log entry, defect diagnosis, spare parts allocation requests, and digital vehicle checklist audits')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

-- 2. SEED PERMISSIONS
INSERT INTO permissions (id, code, module, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'vehicle:view', 'vehicle', 'View vehicle master & complete history'),
('a0000000-0000-0000-0000-000000000002', 'vehicle:request_state', 'vehicle', 'Request state change (e.g., Mark for Repair)'),
('a0000000-0000-0000-0000-000000000003', 'vehicle:approve_state', 'vehicle', 'Commit and finalize vehicle state transition'),
('a0000000-0000-0000-0000-000000000004', 'job:create', 'job', 'Open job cards & log defects'),
('a0000000-0000-0000-0000-000000000005', 'job:complete', 'job', 'Complete repair work and submit for review'),
('a0000000-0000-0000-0000-000000000006', 'job:approve', 'job', 'Approve job card & commit inventory/status'),
('a0000000-0000-0000-0000-000000000007', 'inventory:request', 'inventory', 'Request parts against an active job card'),
('a0000000-0000-0000-0000-000000000008', 'inventory:approve', 'inventory', 'Commit inventory deduction / stock transfer'),
('a0000000-0000-0000-0000-000000000009', 'refund:create', 'refund', 'Log customer refund / penalty dispute'),
('a0000000-0000-0000-0000-000000000010', 'refund:approve', 'refund', 'Approve and mark refund as settled'),
('a0000000-0000-0000-0000-000000000011', 'task:manage', 'task', 'Create Objectives & assign nested Tasks'),
('a0000000-0000-0000-0000-000000000012', 'task:execute', 'task', 'Update task status & submit resolution notes')
ON CONFLICT (code) DO NOTHING;

-- 3. SEED ROLE PERMISSIONS
-- Owner: ALL
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM permissions
ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO role_permissions (role_id, permission_id) VALUES
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001'), -- vehicle:view
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000002'), -- vehicle:request_state
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000003'), -- vehicle:approve_state
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000004'), -- job:create
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000005'), -- job:complete
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000006'), -- job:approve
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000007'), -- inventory:request
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000008'), -- inventory:approve
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000009'), -- refund:create
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000011'), -- task:manage
('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000012')  -- task:execute
ON CONFLICT DO NOTHING;

-- RSA
INSERT INTO role_permissions (role_id, permission_id) VALUES
('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001'), -- vehicle:view
('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000002'), -- vehicle:request_state
('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000004'), -- job:create
('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000005'), -- job:complete
('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000007'), -- inventory:request
('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000012')  -- task:execute
ON CONFLICT DO NOTHING;

-- Mechanic
INSERT INTO role_permissions (role_id, permission_id) VALUES
('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000001'), -- vehicle:view
('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000002'), -- vehicle:request_state
('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000004'), -- job:create
('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000005'), -- job:complete
('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000007'), -- inventory:request
('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000012')  -- task:execute
ON CONFLICT DO NOTHING;

-- 4. SEED PROFILES & USER ROLES
INSERT INTO profiles (id, email, full_name, phone, avatar_url, is_active) VALUES
('c0000000-0000-0000-0000-000000000001', 'alex.owner@fleetops.com', 'Alexander Vance (Owner)', '+1-555-0101', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120', true),
('c0000000-0000-0000-0000-000000000002', 'sarah.manager@fleetops.com', 'Sarah Chen (Ops Manager)', '+1-555-0102', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120', true),
('c0000000-0000-0000-0000-000000000003', 'marcus.rsa@fleetops.com', 'Marcus Brody (Lead RSA)', '+1-555-0103', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', true),
('c0000000-0000-0000-0000-000000000004', 'raj.mechanic@fleetops.com', 'Rajesh Kumar (Senior Tech)', '+1-555-0104', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120', true),
('c0000000-0000-0000-0000-000000000005', 'elena.multi@fleetops.com', 'Elena Rostova (Dual: Mgr & RSA)', '+1-555-0105', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120', true)
ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO user_roles (user_id, role_id) VALUES
('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
('c0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'),
('c0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333'),
('c0000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444'),
('c0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222'), -- Multi-role: Manager
('c0000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333')  -- Multi-role: RSA
ON CONFLICT DO NOTHING;

-- 5. SEED HUBS
INSERT INTO hubs (id, name, code, address, poc_name, poc_phone, day_guard_details, night_guard_details, charging_points_total, charging_points_active, is_active) VALUES
('h0000000-0000-0000-0000-000000000001', 'Central Hub (North Zone)', 'HUB-NORTH-01', '104 Innovation Way, Tech District, Metro City', 'Arjun Mehta', '+1-555-7001', 'Ramesh (Shift: 06:00 - 18:00)', 'Suresh (Shift: 18:00 - 06:00)', 24, 22, true),
('h0000000-0000-0000-0000-000000000002', 'Downtown Hub (South Zone)', 'HUB-SOUTH-02', '45 Market Street, Financial Square, Metro City', 'Priya Nair', '+1-555-7002', 'Kiran (Shift: 07:00 - 19:00)', 'Anil (Shift: 19:00 - 07:00)', 18, 16, true),
('h0000000-0000-0000-0000-000000000003', 'Airport Express Hub (East Zone)', 'HUB-EAST-03', 'Terminal 2 Cargo Link, Airport Corridor', 'Vikram Seth', '+1-555-7003', 'Manoj (Shift: 06:00 - 18:00)', 'Deepak (Shift: 18:00 - 06:00)', 30, 28, true),
('h0000000-0000-0000-0000-000000000004', 'Westside Hub (West Zone)', 'HUB-WEST-04', '88 Sunset Boulevard, Harbor Pier, Metro City', 'Neha Sharma', '+1-555-7004', 'Vijay (Shift: 08:00 - 20:00)', 'Om Prakash (Shift: 20:00 - 08:00)', 12, 10, true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 6. SEED PARTS INVENTORY
INSERT INTO parts_inventory (id, sku, name, category, description, unit_cost, is_active) VALUES
('p0000000-0000-0000-0000-000000000001', 'PRT-BRK-001', 'Ceramic Brake Pads Set', 'Brakes', 'Heavy-duty ceramic front & rear brake pads set for E-Scooter Pro', 24.50, true),
('p0000000-0000-0000-0000-000000000002', 'PRT-BAT-002', '48V 20Ah Swappable Lithium Battery', 'Power', 'High-density NMC lithium battery cell pack with integrated BMS', 340.00, true),
('p0000000-0000-0000-0000-000000000003', 'PRT-TYR-003', 'Tubeless Front Tyre (10x2.5")', 'Wheels', 'Puncture-resistant anti-skid pneumatic tyre with reinforced sidewall', 32.00, true),
('p0000000-0000-0000-0000-000000000004', 'PRT-THR-004', 'Waterproof Throttle & Handlebar Grip', 'Controls', 'IP67 Hall-sensor magnetic acceleration grip assembly', 18.75, true),
('p0000000-0000-0000-0000-000000000005', 'PRT-LGT-005', 'High-Lumen Matrix LED Headlamp', 'Electrical', '1200 lumen LED dual-beam unit with day-running light halo', 28.00, true),
('p0000000-0000-0000-0000-000000000006', 'PRT-SUS-006', 'Hydraulic Front Fork Suspension', 'Chassis', 'Dual-tube damping hydraulic suspension with anodized alloy seals', 65.00, true),
('p0000000-0000-0000-0000-000000000007', 'PRT-ECU-007', 'CAN-Bus Motor Controller (ECU v3.2)', 'Electronics', 'Smart IoT telemetry enabled 500W brushless motor controller', 115.00, true),
('p0000000-0000-0000-0000-000000000008', 'PRT-SND-008', 'Reinforced Side Stand & Kill-Switch', 'Frame', 'Heavy-duty steel kickstand with magnetic safety interlock sensor', 15.20, true)
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, unit_cost = EXCLUDED.unit_cost;

-- 7. SEED HUB PARTS STOCK (Demonstrating Physical vs Pending Allocated)
INSERT INTO hub_parts_stock (hub_id, part_id, physical_stock, pending_allocated_stock, min_threshold) VALUES
-- Hub 1 (Central Hub)
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 14, 4, 5),   -- Brake Pads: 14 physical, 4 pending -> 10 available (14)
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000002', 8, 2, 4),    -- Battery: 8 physical, 2 pending -> 6 available (8)
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000003', 20, 5, 8),   -- Tyre: 20 physical, 5 pending -> 15 available (20)
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000004', 3, 2, 5),    -- Throttle: 3 physical, 2 pending -> 1 available (3) [ALERT: <5]
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000005', 9, 0, 4),    -- LED: 9 available
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000006', 4, 1, 3),    -- Fork: 3 available (4)
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000007', 5, 0, 3),    -- ECU: 5 available
('h0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000008', 12, 1, 4),   -- Stand: 11 available (12)

-- Hub 2 (Downtown Hub)
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000001', 8, 1, 5),
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000002', 4, 0, 3),
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000003', 12, 3, 6),
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000004', 6, 0, 4),
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000005', 2, 1, 4),    -- LED: 1 available (2) [ALERT]
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000006', 2, 0, 2),
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000007', 3, 1, 2),
('h0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000008', 7, 0, 3),

-- Hub 3 (Airport Hub)
('h0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000001', 25, 2, 10),
('h0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000002', 15, 3, 5),
('h0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000003', 18, 0, 8),
('h0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000007', 8, 0, 4),

-- Hub 4 (Westside Hub)
('h0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000001', 6, 0, 4),
('h0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000002', 3, 1, 3),
('h0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000003', 4, 1, 4)
ON CONFLICT (hub_id, part_id) DO NOTHING;

-- 8. SEED VEHICLES (With Two-Phase Status Staging Examples)
INSERT INTO vehicles (id, vin, plate_number, current_hub_id, key_number, current_status, pending_status, status_change_reason, soc_percentage, iot_status, odometer_km, model, is_active) VALUES
('v0000000-0000-0000-0000-000000000001', 'EV982736192847101', 'KA-01-EV-4412', 'h0000000-0000-0000-0000-000000000001', 'KEY-N01', 'AVAILABLE', 'UNDER_REPAIR', 'Mechanic reported disc brake grinding noise during morning patrol', 86, 'ONLINE', 3420, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000002', 'EV982736192847102', 'KA-01-EV-8823', 'h0000000-0000-0000-0000-000000000001', 'KEY-N02', 'AVAILABLE', NULL, NULL, 94, 'ONLINE', 1890, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000003', 'EV982736192847103', 'KA-01-EV-1904', 'h0000000-0000-0000-0000-000000000001', 'KEY-N03', 'IN_RIDE', NULL, NULL, 58, 'ONLINE', 5120, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000004', 'EV982736192847104', 'KA-01-EV-7721', 'h0000000-0000-0000-0000-000000000001', 'KEY-N04', 'UNDER_REPAIR', NULL, 'Battery BMS cell imbalance replacement', 12, 'ONLINE', 8430, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000005', 'EV982736192847105', 'KA-01-EV-3319', 'h0000000-0000-0000-0000-000000000001', 'KEY-N05', 'AVAILABLE', 'MAINTENANCE_REQUIRED', 'Routine 5000km scheduled service required', 78, 'ONLINE', 4995, 'E-Scooter Pro v2', true),

('v0000000-0000-0000-0000-000000000006', 'EV982736192847201', 'KA-05-EV-9011', 'h0000000-0000-0000-0000-000000000002', 'KEY-S01', 'AVAILABLE', NULL, NULL, 99, 'ONLINE', 1210, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000007', 'EV982736192847202', 'KA-05-EV-6420', 'h0000000-0000-0000-0000-000000000002', 'KEY-S02', 'RSA_IN_TRANSIT', NULL, 'Roadside flat tyre reported on 5th main, dispatched RSA truck', 42, 'ONLINE', 6320, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000008', 'EV982736192847203', 'KA-05-EV-1123', 'h0000000-0000-0000-0000-000000000002', 'KEY-S03', 'AVAILABLE', 'RSA_IN_TRANSIT', 'Battery dead in no-parking zone, requested pickup', 3, 'OFFLINE', 4200, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000009', 'EV982736192847204', 'KA-05-EV-8841', 'h0000000-0000-0000-0000-000000000002', 'KEY-S04', 'IMPOUNDED', NULL, 'Parked in unauthorized municipal transit zone', 34, 'NO_GPS', 7100, 'E-Scooter Pro v2', true),

('v0000000-0000-0000-0000-000000000010', 'EV982736192847301', 'KA-51-EV-3100', 'h0000000-0000-0000-0000-000000000003', 'KEY-E01', 'AVAILABLE', NULL, NULL, 91, 'ONLINE', 2800, 'E-Scooter Pro Max', true),
('v0000000-0000-0000-0000-000000000011', 'EV982736192847302', 'KA-51-EV-3102', 'h0000000-0000-0000-0000-000000000003', 'KEY-E02', 'IN_RIDE', NULL, NULL, 64, 'ONLINE', 3900, 'E-Scooter Pro Max', true),
('v0000000-0000-0000-0000-000000000012', 'EV982736192847303', 'KA-51-EV-3105', 'h0000000-0000-0000-0000-000000000003', 'KEY-E03', 'AVAILABLE', 'DECOMMISSIONED', 'Structural frame bend after severe pothole impact', 45, 'OFFLINE', 14200, 'E-Scooter Pro v2', true),

('v0000000-0000-0000-0000-000000000013', 'EV982736192847401', 'KA-04-EV-7182', 'h0000000-0000-0000-0000-000000000004', 'KEY-W01', 'AVAILABLE', NULL, NULL, 88, 'ONLINE', 950, 'E-Scooter Pro v2', true),
('v0000000-0000-0000-0000-000000000014', 'EV982736192847402', 'KA-04-EV-9912', 'h0000000-0000-0000-0000-000000000004', 'KEY-W02', 'UNDER_REPAIR', NULL, 'Throttle cable snap repair in progress', 20, 'ONLINE', 4890, 'E-Scooter Pro v2', true)
ON CONFLICT (vin) DO NOTHING;

-- 9. SEED JOB CARDS & PARTS
INSERT INTO job_cards (id, ticket_number, vehicle_id, reported_by, assigned_mechanic_id, hub_id, issue_description, solution_applied, photos_url, status, approved_by, approval_notes, created_at, resolved_at, approved_at) VALUES
('j0000000-0000-0000-0000-000000000001', 1001, 'v0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'h0000000-0000-0000-0000-000000000001', 'Front brake pad worn down to backing plate, grinding on rotor. Throttle grip loose.', 'Replaced ceramic brake pads and tightened throttle mounting clamp.', ARRAY['https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600'], 'PENDING', NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NULL),

('j0000000-0000-0000-0000-000000000002', 1002, 'v0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'h0000000-0000-0000-0000-000000000001', 'Battery SOC dropping drastically from 60% to 5% under acceleration load.', 'Diagnosed failed BMS balancing channel. Swapped out pack with new 48V 20Ah unit.', ARRAY['https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600'], 'PENDING', NULL, NULL, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '1 hour', NULL),

('j0000000-0000-0000-0000-000000000003', 1003, 'v0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'h0000000-0000-0000-0000-000000000001', 'Scheduled 2,000km routine brake check & tyre pressure calibration.', 'Adjusted front brake caliper, cleaned debris, lubricated kickstand spring.', ARRAY['https://images.unsplash.com/photo-1558980664-769d59546b3d?w=600'], 'APPROVED', 'c0000000-0000-0000-0000-000000000002', 'Verified work order. Vehicle tested and returned to available fleet pool.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (ticket_number) DO NOTHING;

INSERT INTO job_card_parts (id, job_card_id, part_id, quantity, unit_cost_snapshot, is_approved) VALUES
('jp000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 2, 24.50, false), -- 2 Brake pads pending
('jp000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000004', 1, 18.75, false), -- 1 Throttle grip pending
('jp000000-0000-0000-0000-000000000003', 'j0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000002', 1, 340.00, false), -- 1 Battery pending
('jp000000-0000-0000-0000-000000000004', 'j0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000001', 1, 24.50, true)   -- 1 Brake pad approved
ON CONFLICT DO NOTHING;

-- 10. SEED REFUNDS & DISPUTES
INSERT INTO refunds (id, user_phone, ride_id, ride_date, amount, reason, proof_urls, status, requested_by, approved_by, settlement_reference, created_at) VALUES
('r0000000-0000-0000-0000-000000000001', '+1-555-9921', 'RIDE-2026-90412', '2026-08-25', 18.50, 'Vehicle stalled 400m into journey due to faulty throttle grip. User charged full 45-minute minimum ride fee.', ARRAY['https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'], 'SUBMITTED', 'c0000000-0000-0000-0000-000000000002', NULL, NULL, NOW() - INTERVAL '1 day'),
('r0000000-0000-0000-0000-000000000002', '+1-555-4432', 'RIDE-2026-88190', '2026-08-24', 25.00, 'Overcharged parking penalty fee because hub drop geofence was temporarily miscalibrated during GPS drift.', ARRAY['https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600'], 'VERIFIED', 'c0000000-0000-0000-0000-000000000002', NULL, NULL, NOW() - INTERVAL '2 days'),
('r0000000-0000-0000-0000-000000000003', '+1-555-3311', 'RIDE-2026-77123', '2026-08-20', 12.00, 'QR scan unlock failed 3 times while timer continued ticking on app account.', ARRAY['https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600'], 'SETTLED', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'TXN-STRIPE-REF-998124', NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- 11. SEED OBJECTIVES & HIERARCHICAL TASKS
INSERT INTO objectives (id, title, description, target_date, hub_id, created_by, is_completed, created_at) VALUES
('ob000000-0000-0000-0000-000000000001', 'Hub 1 Fleet Overhaul & Safety Audit', 'Complete 100-point inspection across all 15 active North Zone vehicles and verify charging station cables before weekend peak.', CURRENT_DATE + INTERVAL '3 days', 'h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', false, NOW() - INTERVAL '1 day'),
('ob000000-0000-0000-0000-000000000002', 'Downtown Night Battery Sweep (02:00 AM)', 'Retrieve and swap all low-SOC (<25%) scooters in the South District corridor.', CURRENT_DATE + INTERVAL '1 day', 'h0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', false, NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (id, objective_id, title, description, assigned_to, priority, status, vehicle_id, due_date, completed_at, created_at) VALUES
('tk000000-0000-0000-0000-000000000001', 'ob000000-0000-0000-0000-000000000001', 'Inspect brake caliper torque on KA-01-EV-4412', 'Check rotor alignment and confirm pad friction coefficient with digital micrometer.', 'c0000000-0000-0000-0000-000000000004', 'HIGH', 'IN_PROGRESS', 'v0000000-0000-0000-0000-000000000001', NOW() + INTERVAL '1 day', NULL, NOW() - INTERVAL '1 day'),
('tk000000-0000-0000-0000-000000000002', 'ob000000-0000-0000-0000-000000000001', 'Calibrate IoT GPS antennas on Central Charging Bay 4', 'Verify telemetry packet ping response time is under 120ms.', 'c0000000-0000-0000-0000-000000000004', 'MEDIUM', 'TODO', NULL, NOW() + INTERVAL '2 days', NULL, NOW() - INTERVAL '1 day'),
('tk000000-0000-0000-0000-000000000003', 'ob000000-0000-0000-0000-000000000002', 'Dispatched RSA van for KA-05-EV-1123 battery recovery', 'Deploy swap pack #B-4811 and reset vehicle geofence state.', 'c0000000-0000-0000-0000-000000000003', 'CRITICAL', 'IN_PROGRESS', 'v0000000-0000-0000-0000-000000000008', NOW() + INTERVAL '4 hours', NULL, NOW() - INTERVAL '6 hours'),
('tk000000-0000-0000-0000-000000000004', 'ob000000-0000-0000-0000-000000000002', 'Verify Night Guard charging rotation sign-off sheet', 'Collect physical logs from Suresh and reconcile with dashboard active charging count.', 'c0000000-0000-0000-0000-000000000005', 'LOW', 'TODO', NULL, NOW() + INTERVAL '12 hours', NULL, NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

-- 12. SEED AUDIT LOGS
INSERT INTO audit_logs (id, table_name, record_id, action, performed_by, performer_name, old_data, new_data, timestamp) VALUES
('al000000-0000-0000-0000-000000000001', 'vehicles', 'v0000000-0000-0000-0000-000000000001', 'UPDATE', 'c0000000-0000-0000-0000-000000000004', 'Rajesh Kumar (Senior Tech)', '{"pending_status": null, "current_status": "AVAILABLE"}'::jsonb, '{"pending_status": "UNDER_REPAIR", "current_status": "AVAILABLE", "status_change_reason": "Mechanic reported disc brake grinding noise"}'::jsonb, NOW() - INTERVAL '2 hours'),
('al000000-0000-0000-0000-000000000002', 'hub_parts_stock', 'h0000000-0000-0000-0000-000000000001', 'UPDATE', 'c0000000-0000-0000-0000-000000000004', 'Rajesh Kumar (Senior Tech)', '{"physical_stock": 14, "pending_allocated_stock": 2}'::jsonb, '{"physical_stock": 14, "pending_allocated_stock": 4}'::jsonb, NOW() - INTERVAL '1 hour 45 minutes'),
('al000000-0000-0000-0000-000000000003', 'job_cards', 'j0000000-0000-0000-0000-000000000003', 'UPDATE', 'c0000000-0000-0000-0000-000000000002', 'Sarah Chen (Ops Manager)', '{"status": "PENDING"}'::jsonb, '{"status": "APPROVED", "approved_by": "c0000000-0000-0000-0000-000000000002", "approval_notes": "Verified work order."}'::jsonb, NOW() - INTERVAL '1 day');
