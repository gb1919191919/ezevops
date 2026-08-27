-- ====================================================================
-- EZEV OPS PRODUCTION SEED DATA SCRIPT (MUMBAI FLEET)
-- ====================================================================

-- 1. Insert System Roles
INSERT INTO public.roles (id, code, label, description, is_system) VALUES
('role-01', 'owner', 'Super Admin (Owner)', 'Full system sovereignty, master audits, and financial oversight', TRUE),
('role-02', 'manager', 'Hub Operations Manager', 'Approvals, hub inventory, staff scheduling, dispute verification', TRUE),
('role-03', 'rsa', 'Roadside Assistance (RSA)', 'Rapid field inspection, towing, roadside recovery, battery sweeps', TRUE),
('role-04', 'mechanic', 'Hub Maintenance Mechanic', 'Job tickets, defect inspections, part requests, safety audits', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Real Mumbai Hubs (Including Single Central Warehouse: Store 1)
INSERT INTO public.hubs (id, name, code, type, city, address, poc_name, poc_phone, day_guard_name, day_guard_phone, night_guard_name, night_guard_phone, charging_points_total, charging_points_active, is_warehouse) VALUES
('hub-store-01', 'Store 1', 'STORE-01', 'STOCK_HUB', 'Mumbai', 'Central Spare Parts Warehouse, 24th Avenue, Shree Ram Nagar, Andheri West, Mumbai - 400058', 'Rajkumar Mandal / Ritik Mandal', '+91 62392 49085', 'Jayash', '+91 91373 96039', 'Mangesh', '+91 98213 24903', 16, 16, TRUE),
('hub-mum-01', 'Della By Hive', 'HUB-MUM-DEL', 'BIKE_HUB', 'Mumbai', 'Bhagatsingh Rd, Navpada, Kamala, Vile Parle West, Mumbai - 400056', 'Somnath / Shirin / Siddhant', '+91 89205 12687', 'Uma Shankar / Abdul', '+91 98673 25140', 'Santosh Tiwari', '+91 91270 92767', 12, 12, FALSE),
('hub-mum-02', 'Aster By Hive', 'HUB-MUM-AST', 'BIKE_HUB', 'Mumbai', '5, N S Rd No. 5, Vallabh Nagar Society, Juhu, Mumbai - 400056', 'Komal Negi', '+91 77150 24068', 'Nadim / Santosh', '+91 88795 85795', 'Shradda', '+91 84510 34561', 8, 0, FALSE),
('hub-mum-03', 'Oblik by Livlit', 'HUB-MUM-OBL', 'BIKE_HUB', 'Mumbai', 'Near Juhu Circle, Vile Parle West, Mumbai - 400056', 'Naaz', '+91 85911 88225', 'Shashank / Sarvesh', '+91 99563 86214', 'Shashank', '+91 99563 86214', 8, 0, FALSE),
('hub-mum-04', 'H Square Bay', 'HUB-MUM-HSB', 'BIKE_HUB', 'Mumbai', 'Bay Area, Juhu Tara Road, Mumbai - 400049', 'Deepa / Aditi', '+91 83569 95024', 'Jitendar', '+91 98894 04089', 'Rakesh', '+91 98000 85638', 10, 0, FALSE),
('hub-mum-05', 'H Square Juhu', 'HUB-MUM-HSJ', 'BIKE_HUB', 'Mumbai', 'Juhu Jawa Showroom, Juhu, Mumbai - 400049', 'Jagdish (Manager)', '+91 89280 53977', 'Ashok', '+91 84607 03880', 'Shahin', '+91 80974 34606', 10, 0, FALSE),
('hub-mum-06', 'Hive Aurus Chapter 2', 'HUB-MUM-AUR2', 'BIKE_HUB', 'Mumbai', 'Shree Mangal Corp, S. Ponda Rd, Vile Parle, Mumbai - 400056', 'Chanchal Ma''am', '+91 90046 76110', 'Radhika', '+91 98191 48272', 'Mumtaz', '+91 89288 97182', 12, 0, FALSE),
('hub-mum-08', 'Hive Aurus Chapter 4', 'HUB-MUM-AUR4', 'BIKE_HUB', 'Mumbai', 'Link Road Extension, Andheri West, Mumbai - 400058', 'Subham / Abhishek', '+91 91247 96463', 'Ritesh', '+91 91373 96040', 'Manoj', '+91 98213 24904', 10, 10, FALSE),
('hub-mum-09', 'NMIMS Back Gate', 'HUB-MUM-NMI', 'BIKE_HUB', 'Mumbai', 'NMIMS University Back Gate, V.L. Mehta Road, Vile Parle West, Mumbai - 400056', 'Zaffar / Ashish', '+91 96198 56561', 'Prince', '+91 89821 91213', 'Prince', '+91 89821 91213', 16, 16, FALSE),
('hub-mum-10', 'Aurua Chpt 1', 'HUB-MUM-AUR1', 'BIKE_HUB', 'Mumbai', '5, N S Rd No. 5, Vallabh Nagar Society, Juhu, Mumbai - 400056', 'Tina', '+91 77374 11689', 'Parveen', '+91 72768 24151', 'Parveen', '+91 72768 24151', 10, 10, FALSE),
('hub-mum-11', 'Anugrah by LivLit', 'HUB-MUM-ANU', 'BIKE_HUB', 'Mumbai', 'Opp Criticare Hospital, Vile Parle West, Mumbai - 400056', 'Nilesh / Trupti Parekh', '+91 79901 69147', 'Guptaji', '+91 84472 13458', 'Guptaji', '+91 84472 13458', 12, 12, FALSE),
('hub-mum-12', 'Bayside by HIVE', 'HUB-MUM-BAY', 'BIKE_HUB', 'Mumbai', 'Road No. 5 End, Juhu Scheme, Mumbai - 400049', 'Varsha', '+91 90041 01982', 'Juhi', '+91 91537 11664', 'Yashmeen', '+91 87262 82049', 10, 10, FALSE),
('hub-mum-13', 'Ganga Niwas', 'HUB-MUM-GAN', 'BIKE_HUB', 'Mumbai', 'Station Road, Vile Parle East, Mumbai - 400057', 'Nilesh', '+91 79901 69147', 'Ramu', '+91 98210 12345', 'Shyam', '+91 98210 12346', 8, 8, FALSE)
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Real Staff Profiles (Owner bhuvnesh3568@gmail.com mapped)
INSERT INTO public.profiles (id, email, full_name, phone, avatar_url, assigned_hub_id) VALUES
('usr-01', 'bhuvnesh3568@gmail.com', 'Bhuvnesh Kumar', '+91 70560 55476', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120', NULL),
('usr-02', 'yugdeep@ezev.in', 'Yugdeep Handa', '+91 82981 47755', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', NULL),
('usr-03', 'zaffar.patel@ezev.in', 'Zaffar Patel', '+91 96198 56561', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120', 'hub-mum-09'),
('usr-04', 'ashish.vaishya@ezev.in', 'Ashish Vaishya', '+91 82866 45521', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120', 'hub-mum-09'),
('usr-05', 'ankita.gangwani@ezev.in', 'Ankita Gangwani', '+91 90502 19307', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120', NULL),
('usr-06', 'rajkumar.mandal@ezev.in', 'Rajkumar Mandal', '+91 62392 49085', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120', 'hub-store-01'),
('usr-07', 'ritik.mandal@ezev.in', 'Ritik Mandal', '+91 77398 74590', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120', 'hub-store-01')
ON CONFLICT (email) DO NOTHING;

-- Map Profile Roles
INSERT INTO public.profile_roles (profile_id, role_id) VALUES
('usr-01', 'role-01'),
('usr-02', 'role-01'),
('usr-03', 'role-02'),
('usr-03', 'role-03'),
('usr-04', 'role-02'),
('usr-05', 'role-02'),
('usr-06', 'role-03'),
('usr-06', 'role-04'),
('usr-07', 'role-03'),
('usr-07', 'role-04')
ON CONFLICT DO NOTHING;

-- 4. Insert 28 Spare Parts & Stock Exclusively in Store 1
INSERT INTO public.parts (id, sku, name, category, description, unit_cost, min_threshold, supplier) VALUES
('p-01', 'EZEV-BRK-PAD-01', 'Disc Pad Set', 'Brakes', 'Pakshal ceramic disc pads', 150.00, 10, 'Pakshal Auto Parts'),
('p-02', 'EZEV-IND-LGT-01', 'Indicator Light', 'Electrical', 'Amber LED indicator unit', 20.00, 20, 'Pakshal Auto Parts'),
('p-03', 'EZEV-THR-123-01', 'Throttle 123 (3-Speed)', 'Controls', '3-speed acceleration throttle grip', 380.00, 4, 'Pakshal Auto Parts'),
('p-04', 'EZEV-HRN-48V-01', 'Horn 48V', 'Electrical', 'Electric horn unit', 120.00, 5, 'Pakshal Auto Parts'),
('p-05', 'EZEV-BRK-CBL-01', 'Brake Cable', 'Brakes', 'Steel braided brake cable', 300.00, 6, 'Pakshal Auto Parts'),
('p-06', 'EZEV-BRK-BLB-01', 'Brake Bulb', 'Electrical', 'Rear tail brake bulb', 10.00, 15, 'Pakshal Auto Parts'),
('p-07', 'EZEV-IND-BTN-01', 'Indicator Button', 'Controls', 'Handlebar indicator button', 60.00, 5, 'Pakshal Auto Parts'),
('p-08', 'EZEV-NUT-WSH-13', '13 No. Spring Washer (Pack 200)', 'Fasteners', 'Spring washer packet', 70.00, 5, 'Pakshal Auto Parts'),
('p-09', 'EZEV-BLT-1016', '10x16 Collar Bolt (Pack 100)', 'Fasteners', 'Collar bolt packet', 130.00, 4, 'Pakshal Auto Parts'),
('p-10', 'EZEV-BLT-1205', '12x1/2 Collar Bolt (Pack 50)', 'Fasteners', 'Collar bolts 12x1/2 inch', 115.00, 4, 'Pakshal Auto Parts'),
('p-11', 'EZEV-BLT-1210', '12x1 Collar Bolt (Pack 50)', 'Fasteners', 'Collar bolts 12x1 inch', 130.00, 4, 'Pakshal Auto Parts'),
('p-12', 'EZEV-BAT-BLT-08', '8 No. Battery Nut Bolt Set', 'Fasteners', 'Battery nut and bolt kit', 85.00, 5, 'Pakshal Auto Parts'),
('p-13', 'EZEV-PNC-PTC-20', 'Patches BP-1 (Box of 20)', 'Tyres', 'Cold tyre puncture patches', 480.00, 3, 'Pakshal Auto Parts'),
('p-14', 'EZEV-PNC-OMN-25', 'Yellow Omni Strips (Box of 25)', 'Tyres', 'Puncture sealing string strips', 220.00, 3, 'Pakshal Auto Parts'),
('p-15', 'EZEV-PNC-SOL-01', 'Omni Solution Tube', 'Tyres', 'Vulcanizing fluid', 50.00, 5, 'Pakshal Auto Parts'),
('p-16', 'EZEV-PNC-VLV-10', 'Tyre Valve (10 Pcs)', 'Tyres', 'Tubeless wheel valve set', 300.00, 4, 'Pakshal Auto Parts'),
('p-17', 'EZEV-SWT-KIT-30', 'Switches N/M & Headlight Kit', 'Controls', 'Multi-switch cluster', 80.00, 6, 'SMH E Ventures'),
('p-18', 'EZEV-THR-WTR-01', 'Throttle 123 (Waterproof SMH)', 'Controls', 'Waterproof throttle grip', 150.00, 4, 'SMH E Ventures'),
('p-19', 'EZEV-DRM-PLT-01', 'Drum Plate Swing Arm', 'Chassis', 'Rear drum brake swing arm plate', 420.00, 3, 'SMH E Ventures'),
('p-20', 'EZEV-ELC-MCB-01', 'MCB (Miniature Circuit Breaker)', 'Electrical', 'DC safety cutout breaker', 90.00, 5, 'SMH E Ventures'),
('p-21', 'EZEV-LCK-SHT-01', 'Shutter Lock Set', 'Chassis', 'Ignition shutter lock', 520.00, 2, 'SMH E Ventures'),
('p-22', 'EZEV-LVR-DRM-01', 'Drum Lever Assy Set', 'Brakes', 'Drum brake lever handle set', 300.00, 4, 'SMH E Ventures'),
('p-23', 'EZEV-STR-CON-01', 'Coneset Steering Bearing', 'Chassis', 'Steering head ball bearing set', 150.00, 5, 'SMH E Ventures'),
('p-24', 'EZEV-ELC-DCC-01', 'DC Converter (Waterproof)', 'Electrical', '48V to 12V step-down converter', 220.00, 4, 'SMH E Ventures'),
('p-25', 'EZEV-LGT-HLD-01', 'Tail Light Holder', 'Electrical', 'Tail light connector socket', 60.00, 5, 'SMH E Ventures'),
('p-26', 'EZEV-WIR-KIT-01', 'Wire Kit Main Harness', 'Electrical', 'Main frame wiring kit', 150.00, 4, 'SMH E Ventures'),
('p-27', 'EZEV-STN-SPR-01', 'Side Stand Spring', 'Chassis', 'Stand return tension spring', 15.00, 10, 'SMH E Ventures'),
('p-28', 'EZEV-LCK-STU-01', 'Seat Lock U-Type Catch', 'Chassis', 'Underseat lock catch', 60.00, 4, 'SMH E Ventures')
ON CONFLICT (sku) DO NOTHING;

-- Seed Store 1 Physical Inventory Stock
INSERT INTO public.hub_part_stock (hub_id, part_id, physical_stock, min_threshold)
SELECT 'hub-store-01', p.id, 25, p.min_threshold FROM public.parts p
ON CONFLICT (hub_id, part_id) DO NOTHING;

-- 5. Insert 40 Real Vehicles with 15-Digit IoT IDs
INSERT INTO public.vehicles (id, vehicle_id, vin, key_number, model, current_hub_id, current_status, odometer_km) VALUES
('veh-01', '860141073026917', 'MD625CK192846917', '6917', 'CS Model', 'hub-mum-01', 'Available', 3420),
('veh-02', '860141073025646', 'MD625CK192845646', '5646', 'CS Model', 'hub-mum-09', 'Needs Maintenance', 6240),
('veh-03', '860141073022087', 'MD625CK192842087', '2087', 'Ola Model', 'hub-mum-02', 'Available', 4180),
('veh-04', '860141073025596', 'MD625CK192845596', '5596', 'CS Model', 'hub-mum-03', 'Available', 2950),
('veh-05', '860141073025729', 'MD625CK192845729', '5729', 'CS Model', 'hub-mum-04', 'Available', 5120),
('veh-06', '860141073029640', 'MD625CK192849640', '9640', 'Single Light Model', 'hub-mum-05', 'Under Repair', 7830),
('veh-07', '860141073025349', 'MD625CK192845349', '5349', 'CS Model', 'hub-store-01', 'Available', 3640),
('veh-08', '860141073025554', 'MD625CK192845554', '5554', 'Ola Model', 'hub-mum-11', 'Needs Maintenance', 8200),
('veh-09', '860141073045321', 'MD625CK192845321', '5321', 'CS Model', 'hub-mum-09', 'Available', 2150),
('veh-10', '860141073025281', 'MD625CK192845281', '5281', 'Ola Model', 'hub-mum-09', 'Available', 4890),
('veh-11', '860141073026040', 'MD625CK192846040', '6040', 'Single Light Model', 'hub-mum-09', 'Available', 3100),
('veh-12', '860141073025471', 'MD625CK192845471', '5471', 'CS Model', 'hub-mum-05', 'Available', 5400),
('veh-13', '860141073025414', 'MD625CK192845414', '5414', 'CS Model', 'hub-mum-09', 'Available', 1800),
('veh-14', '860141073025745', 'MD625CK192845745', '5745', 'Ola Model', 'hub-mum-09', 'Available', 6200),
('veh-15', '860141073026172', 'MD625CK192846172', '6172', 'CS Model', 'hub-mum-11', 'Available', 4300),
('veh-16', '860141073026461', 'MD625CK192846461', '6461', 'Single Light Model', 'hub-mum-09', 'Needs Maintenance', 7100),
('veh-17', '860141073073760', 'MD625CK192843760', '3760', 'CS Model', 'hub-mum-09', 'Not Available', 2900),
('veh-18', '860141073026214', 'MD625CK192846214', '6214', 'Ola Model', 'hub-mum-08', 'Available', 5200),
('veh-19', '860141073052467', 'MD625CK192842467', '2467', 'CS Model', 'hub-mum-09', 'Available', 3800),
('veh-20', '860141073026073', 'MD625CK192846073', '6073', 'CS Model', 'hub-mum-09', 'Available', 4400),
('veh-21', '860141073025588', 'MD625CK192845588', '5588', 'Single Light Model', 'hub-mum-09', 'Available', 6100),
('veh-22', '860141073042880', 'MD625CK192842880', '2880', 'Ola Model', 'hub-mum-03', 'Not Available', 1950),
('veh-23', '860141073023914', 'MD625CK192843914', '3914', 'CS Model', 'hub-mum-09', 'Available', 3300),
('veh-24', '860141073025356', 'MD625CK192845356', '5356', 'CS Model', 'hub-mum-09', 'Available', 4700),
('veh-25', '860141073025703', 'MD625CK192845703', '5703', 'Ola Model', 'hub-mum-09', 'Available', 5800),
('veh-26', '860141073025059', 'MD625CK192845059', '5059', 'CS Model', 'hub-mum-09', 'Available', 2400),
('veh-27', '860141073025679', 'MD625CK192845679', '5679', 'Single Light Model', 'hub-mum-09', 'Needs Maintenance', 6900),
('veh-28', '860141073026388', 'MD625CK192846388', '6388', 'CS Model', 'hub-mum-09', 'Available', 3100),
('veh-29', '860141073026032', 'MD625CK192846032', '6032', 'Ola Model', 'hub-mum-09', 'Available', 4200),
('veh-30', '860141073026099', 'MD625CK192846099', '6099', 'CS Model', 'hub-mum-01', 'Available', 1600),
('veh-31', '860141073052657', 'MD625CK192842657', '2657', 'CS Model', 'hub-mum-09', 'Not Available', 5300),
('veh-32', '860141073052087', 'MD625CK192842087', '2087', 'Single Light Model', 'hub-mum-09', 'Available', 3750),
('veh-33', '860141073052293', 'MD625CK192842293', '2293', 'Ola Model', 'hub-mum-09', 'Not Available', 4600),
('veh-34', '860141073001167', 'MD625CK192841167', '1167', 'CS Model', 'hub-mum-09', 'Available', 2800),
('veh-35', '860141073056484', 'MD625CK192846484', '6484', 'CS Model', 'hub-mum-08', 'Available', 3900),
('veh-36', '860141073052442', 'MD625CK192842442', '2442', 'Ola Model', 'hub-mum-09', 'Available', 5100),
('veh-37', '860141073051915', 'MD625CK192841915', '1915', 'CS Model', 'hub-mum-09', 'Under Repair', 6400),
('veh-38', '860141073052640', 'MD625CK192842640', '2640', 'Single Light Model', 'hub-mum-09', 'Needs Maintenance', 7200),
('veh-39', '860141073052434', 'MD625CK192842434', '2434', 'CS Model', 'hub-mum-05', 'Available', 1400),
('veh-40', '860141073001514', 'MD625CK192841514', '1514', 'Ola Model', 'hub-mum-09', 'Available', 4900)
ON CONFLICT (vehicle_id) DO NOTHING;

-- 6. Insert 41 Real Customer Refund Disputes
INSERT INTO public.refunds (id, user_phone, ride_id, ride_date, amount, payout_type, reason, status, requested_by, requester_name, requester_role, frappe_reference) VALUES
('r-01', '+91 9871305639', 'RIDE-MUM-2026-0101', '2026-07-29', 26.250, 'EzEv Wallet', 'Ashish didnt give bike because user creates disturbance at Public hub', 'SETTLED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', 'FRAP-MUM-2026-08001'),
('r-02', '+91 8171784227', 'RIDE-MUM-2026-0102', '2026-07-29', 26.250, 'EzEv Wallet', 'Bike had issues', 'SETTLED', 'usr-05', 'Ankita Gangwani', 'Operations Manager', 'FRAP-MUM-2026-08002'),
('r-03', '+91 7694085885', 'RIDE-MUM-2026-0103', '2026-07-27', 26.250, 'EzEv Wallet', 'Base Charge Refund', 'SETTLED', 'usr-05', 'Ankita Gangwani', 'Operations Manager', 'FRAP-MUM-2026-08003'),
('r-04', '+91 7778088909', 'RIDE-MUM-2026-0104', '2026-07-27', 26.250, 'EzEv Wallet', 'Base Charge Refund', 'SETTLED', 'usr-05', 'Ankita Gangwani', 'Operations Manager', 'FRAP-MUM-2026-08004'),
('r-05', '+91 7304003536', 'RIDE-MUM-2026-0105', '2026-08-02', 420.000, 'Bank Payout', 'Customer left scootie 7:20 am on Resume', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08005'),
('r-06', '+91 9830022696', 'RIDE-MUM-2026-0106', '2026-08-02', 193.000, 'Bank Payout', 'Customer left scootie 2:41 am on Pause (Key 2087)', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08006'),
('r-07', '+91 9136079505', 'RIDE-MUM-2026-0107', '2026-08-02', 47.250, 'EzEv Wallet', 'Customer left scootie 8:29 am on Pause (Key 5596)', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08007'),
('r-08', '+91 9324773610', 'RIDE-MUM-2026-0108', '2026-08-02', 538.000, 'Bank Payout', 'Customer left scootie 4:52 am on Resume (Key 5729)', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08008'),
('r-09', '+91 9150617666', 'RIDE-MUM-2026-0109', '2026-08-02', 51.000, 'EzEv Wallet', 'Customer sending details on WhatsApp', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08009'),
('r-10', '+91 8269675500', 'RIDE-MUM-2026-0110', '2026-08-03', 268.000, 'Bank Payout', 'Customer got ride back with rim bent issue and left bike on Pause (Key 9640)', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08010'),
('r-11', '+91 8780083670', 'RIDE-MUM-2026-0111', '2026-08-02', 26.630, 'EzEv Wallet', 'Base Charge Refund', 'SETTLED', 'usr-01', 'Bhuvnesh Kumar', 'Super Admin', 'FRAP-MUM-2026-08011'),
('r-12', '+91 8780083670', 'RIDE-MUM-2026-0112', '2026-07-16', 14.000, 'EzEv Wallet', 'Anugrah - Parking time was 50 mins, but charged extra', 'SETTLED', 'usr-05', 'Ankita Gangwani', 'Operations Manager', 'FRAP-MUM-2026-08012'),
('r-13', '+91 8780083670', 'RIDE-MUM-2026-0113', '2026-07-17', 8.000, 'EzEv Wallet', 'Anugrah - Parking time was 30 mins, but charged extra', 'SETTLED', 'usr-05', 'Ankita Gangwani', 'Operations Manager', 'FRAP-MUM-2026-08013'),
('r-14', '+91 6284565258', 'RIDE-MUM-2026-0114', '2026-08-05', 50.000, 'EzEv Wallet', 'Declined: Anugrah user forgot to end ride', 'REJECTED', 'usr-05', 'Ankita Gangwani', 'Operations Manager', NULL),
('r-15', '+91 7458983910', 'RIDE-MUM-2026-0115', '2026-08-06', 226.000, 'Bank Payout', 'Aurus Chpt 3 - Parking time was 23 min, but charged extra. Customer left scootie 23:08 on Resume (Key 5349)', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08015'),
('r-16', '+91 9875556957', 'RIDE-MUM-2026-0116', '2026-08-06', 105.000, 'EzEv Wallet', 'NMIMS - Charged extra between 20:08 to 20:48. Customer paused scooter but it did not pause', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08016'),
('r-17', '+91 9356002633', 'RIDE-MUM-2026-0117', '2026-08-08', 26.250, 'EzEv Wallet', 'Refund Base charge', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08017'),
('r-18', '+91 7037133606', 'RIDE-MUM-2026-0118', '2026-08-08', 26.250, 'EzEv Wallet', 'Refund Base charge', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08018'),
('r-19', '+91 9371262497', 'RIDE-MUM-2026-0119', '2026-08-09', 26.250, 'EzEv Wallet', 'Refund Base charge', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08019'),
('r-20', '+91 7073570147', 'RIDE-MUM-2026-0120', '2026-08-09', 26.250, 'EzEv Wallet', 'Refund Base charge', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08020'),
('r-21', '+91 9374735336', 'RIDE-MUM-2026-0121', '2026-08-10', 171.000, 'Bank Payout', 'RSA waale time ka Refund', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08021'),
('r-22', '+91 8866597953', 'RIDE-MUM-2026-0122', '2026-08-11', 132.000, 'Bank Payout', 'Standing in Anugrah for 8 hours', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08022'),
('r-23', '+91 7717379955', 'RIDE-MUM-2026-0123', '2026-08-12', 6.000, 'EzEv Wallet', 'Sobo network issue, android access', 'SETTLED', 'usr-05', 'Ankita Gangwani', 'Operations Manager', 'FRAP-MUM-2026-08023'),
('r-24', '+91 7046211613', 'RIDE-MUM-2026-0124', '2026-08-14', 40.000, 'EzEv Wallet', 'Rim bent issue on trip', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08024'),
('r-25', '+91 9363476441', 'RIDE-MUM-2026-0125', '2026-08-15', 63.790, 'EzEv Wallet', 'Bike was not charging thus testing, nor changing status', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08025'),
('r-26', '+91 9770835092', 'RIDE-MUM-2026-0126', '2026-08-07', 497.460, 'Bank Payout', 'Customer says was charged wrong on long session', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08026'),
('r-27', '+91 7408408070', 'RIDE-MUM-2026-0127', '2026-08-16', 200.000, 'Bank Payout', 'They were 3 rides in all. Customer says he had paused but was charged more', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08027'),
('r-28', '+91 9727616455', 'RIDE-MUM-2026-0128', '2026-08-16', 90.000, 'EzEv Wallet', 'Customer had left scooty, but ride didnt end due to network issue', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08028'),
('r-29', '+91 8899986900', 'RIDE-MUM-2026-0129', '2026-08-16', 68.350, 'EzEv Wallet', 'Scooty faulty need to refund', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08029'),
('r-30', '+91 8905511966', 'RIDE-MUM-2026-0130', '2026-08-19', 59.450, 'EzEv Wallet', 'Network Issue scooty not getting on', 'SETTLED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', 'FRAP-MUM-2026-08030'),
('r-31', '+91 8405000619', 'RIDE-MUM-2026-0131', '2026-08-20', 26.250, 'EzEv Wallet', 'Refund as booked without permission', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08031'),
('r-32', '+91 9589315149', 'RIDE-MUM-2026-0132', '2026-08-20', 45.000, 'EzEv Wallet', 'Took scooty on rent 12:53 AM showing extra running time after pause', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08032'),
('r-33', '+91 6266720022', 'RIDE-MUM-2026-0133', '2026-08-18', 35.000, 'EzEv Wallet', 'Put vehicle in charge but forgot to switch off from phone', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08033'),
('r-34', '+91 9509926417', 'RIDE-MUM-2026-0134', '2026-08-23', 86.810, 'Bank Payout', 'Payout: Wants to deactivate the account', 'SETTLED', 'usr-03', 'Zaffar Patel', 'Operations Manager', 'FRAP-MUM-2026-08034'),
('r-35', '+91 7767000056', 'RIDE-MUM-2026-0135', '2026-08-15', 26.250, 'EzEv Wallet', '4 mins ride, scooter had startup issue', 'SETTLED', 'usr-01', 'Bhuvnesh Kumar', 'Super Admin', 'FRAP-MUM-2026-08035'),
('r-36', '+91 9871305639', 'RIDE-MUM-2026-0136', '2026-08-25', 26.910, 'EzEv Wallet', 'Key 5554 bike had damages and user replaced bike in 5mins', 'SETTLED', 'usr-01', 'Bhuvnesh Kumar', 'Super Admin', 'FRAP-MUM-2026-08036'),
('r-37', '+91 8235058703', 'RIDE-MUM-2026-0137', '2026-08-25', 30.160, 'EzEv Wallet', 'Bike had issue on pickup', 'SETTLED', 'usr-01', 'Bhuvnesh Kumar', 'Super Admin', 'FRAP-MUM-2026-08037'),
('r-38', '+91 9835490560', 'RIDE-MUM-2026-0138', '2026-08-26', 26.250, 'EzEv Wallet', 'Bike Not starting display Not getting on in App ride started (YTS)', 'SUBMITTED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', NULL),
('r-39', '+91 7058332474', 'RIDE-MUM-2026-0139', '2026-08-26', 26.250, 'EzEv Wallet', 'Bike had server issue not starting, display not getting on (YTS)', 'SUBMITTED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', NULL),
('r-40', '+91 9825011157', 'RIDE-MUM-2026-0140', '2026-08-27', 26.250, 'EzEv Wallet', 'Bike had server issue not starting, display not getting on (YTS)', 'SUBMITTED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', NULL),
('r-41', '+91 9724190000', 'RIDE-MUM-2026-0141', '2026-08-27', 32.500, 'EzEv Wallet', 'Bike not pause in app showing paused because of App glitch (YTS)', 'SUBMITTED', 'usr-04', 'Ashish Vaishya', 'Operations Manager', NULL)
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Blocked Users & Recovery Case
INSERT INTO public.blocked_users (id, employee_name, date, user_email, user_name, phone, vehicle_no, reason, recovery_status, recovery_amount) VALUES
('blk-01', 'Zaffar Patel', '2026-08-26', '917016411890@example.com', 'Dwarkesh Kansagara', '+91 63772 93303', '5646', 'Left bike in Churchgate. Regular user made excuse of low battery (10% battery was available). Account blocked for 15 days, unblockable on payment of Rs. 200 vehicle collection fee.', 'Pending', 200.00)
ON CONFLICT (id) DO NOTHING;

-- 8. Insert Standard Operating Procedures (SOPs)
INSERT INTO public.sops (id, code, title, category, version, status, summary, content, author_id, author_name, access_roles, view_count, acknowledged_by) VALUES
('sop-01', 'SOP-OPS-001', 'Roadside Breakdown & Towing Protocol', 'Operations', '1.2', 'PUBLISHED', 'Standard operating procedure for RSA dispatch, roadside triage, towing, and IoT vehicle state locking.', '## 1. Objective\nEstablish safe, rapid, and verifiable procedures when an EzEv electric vehicle suffers a roadside failure or battery depletion.\n\n## 2. Immediate Field Triage\n1. Locate & Ping: Confirm 15-digit IoT GPS ping. Check if battery SOC is below 10%.\n2. Customer Safety: Direct the customer to a safe pavement zone away from active traffic.\n3. App Staging: Mark vehicle status as Under Repair / RSA In Transit on the command app.\n\n## 3. Vehicle Retrieval & Towing\n- Verify that key number and VIN match the assigned ticket.\n- Securely load the EV onto the RSA vehicle using certified nylon tie-down straps.\n- Transport vehicle directly to Store 1 for diagnostic inspection.\n\n## 4. Ticket Resolution\n- Log drop-off timestamp, odometer reading, and battery condition in the maintenance job card.', 'usr-01', 'Bhuvnesh Kumar', '{owner,manager,rsa,mechanic}', 42, '{usr-03,usr-04,usr-06,usr-07}'),
('sop-02', 'SOP-BAT-002', 'Battery Swap & Charging Bay Safety SOP', 'Safety', '2.0', 'PUBLISHED', 'Safety protocol for 48V battery swapping, MCB isolation, connector maintenance, and fire safety.', '## 1. Scope\nApplies to all charging hubs (Della, NMIMS, Store 1, Anugrah, Bayside).\n\n## 2. Pre-Swap Safety Checklist\n- Ensure hands are dry and insulated nitrile gloves are worn.\n- Verify MCB breaker is in OFF position before disconnecting Anderson power harnesses.\n- Inspect battery casing for swelling, odor, or moisture ingress.\n\n## 3. Charging Dock Connection\n- Align the 48V charging connector firmly until mechanical lock clicks.\n- Check LED indicator: RED (Charging), GREEN (Fully Charged >95%).\n- If a connector sparks or shows corrosion, isolate the port immediately and report in Charger Logs.', 'usr-02', 'Yugdeep Handa', '{owner,manager,rsa,mechanic}', 58, '{usr-01,usr-03,usr-04,usr-06,usr-07}'),
('sop-03', 'SOP-SEC-003', 'Hub Closing & Night Security Handover SOP', 'Security', '1.1', 'PUBLISHED', 'Guidelines for night watchman shift handover, vehicle count reconciliation, and charger security.', '## 1. Daily Night Handover (20:00 to 21:00)\n1. Reconciliation: Count all physical EVs at the hub and match against the live app Hub Inventory.\n2. Charger Verification: Ensure active chargers are powered ON only for parked EVs below 80% SOC.\n3. Guard Contact Check: Confirm Night Watchman (e.g. Santosh Tiwari @ Della, Mangesh @ Store 1) is on-site and has emergency contact numbers saved.\n\n## 2. Emergency Escalations\nIn case of unauthorized tampering or vehicle movement after 23:00, notify Operations Manager immediately via WhatsApp and lock IoT ignition.', 'usr-03', 'Zaffar Patel', '{owner,manager,rsa}', 31, '{usr-01,usr-04}'),
('sop-04', 'SOP-DIS-004', 'Customer Dispute Resolution & Payout SOP', 'Finance', '1.0', 'PUBLISHED', 'Rules for verifying pause-time glitches, battery drops, and executing instant Frappe ERP refunds.', '## 1. Eligibility Criteria\n- Base charge refunds for immediate cancellations (<5 mins) with no ride distance.\n- Parking/Pause time overcharges where telemetry confirms vehicle stood stationary inside hub radius.\n- Account deactivations requesting remaining wallet balance payout.\n\n## 2. Settlement Execution\n- Refunds under ₹100 may be settled directly by Operations Managers.\n- Bank payouts (> ₹200) require secondary verification of UPI / Account details.\n- Record auto-generated Frappe voucher reference on settlement.', 'usr-05', 'Ankita Gangwani', '{owner,manager}', 45, '{usr-01,usr-03,usr-04}')
ON CONFLICT (id) DO NOTHING;
