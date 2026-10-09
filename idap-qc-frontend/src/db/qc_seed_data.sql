-- =============================================================================
-- QC Reporting Dashboard — Seed / Test Data
-- Run AFTER qc_reporting_schema.sql. Safe to re-run: all QC tables are truncated first.
--
-- Fixed UUIDs per entity so API tests can hard-code ids:
--   users            11111111-1111-1111-1111-0000000000NN
--   projects         22222222-2222-2222-2222-0000000000NN
--   packages         33333333-3333-3333-3333-0000000000NN
--   site_locations   44444444-4444-4444-4444-000000000NNN  (1xx = P1, 2xx = P2, 3xx = P3, 4xx = P4)
--   issue_categories 55555555-5555-5555-5555-0000000000NN
--   generic_issues   66666666-6666-6666-6666-0000000000NN
--   issues           77777777-7777-7777-7777-0000000000NN
--   report_templates 88888888-8888-8888-8888-0000000000NN
--   reports          99999999-9999-9999-9999-0000000000NN
--   report_sections  aaaaaaaa-aaaa-aaaa-aaaa-000000000RSS  (R = report number)
--
-- Image evidence is switched OFF in app_settings because images come later.
-- =============================================================================

BEGIN;

TRUNCATE TABLE
    report_history,
    report_issues,
    report_sections,
    reports,
    report_templates,
    issue_history,
    issue_images,
    issues,
    generic_issues,
    issue_categories,
    site_locations,
    packages,
    user_projects,
    projects,
    users
RESTART IDENTITY CASCADE;

SELECT set_config('app.current_user_id', '', true);

-- -----------------------------------------------------------------------------
-- App settings
-- -----------------------------------------------------------------------------
INSERT INTO app_settings (key, value) VALUES
    ('require_issue_images_on_submit', 'false'::jsonb),
    ('allowed_review_start_roles', '["GENERAL_MANAGER","MANAGER","ASSISTANT_MANAGER"]'::jsonb),
    ('allowed_reject_roles', '["GENERAL_MANAGER","MANAGER","ASSISTANT_MANAGER"]'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- Users (one role each)
-- -----------------------------------------------------------------------------
INSERT INTO users (id, name, email, employee_id, role_name, department, is_active) VALUES
    ('11111111-1111-1111-1111-000000000001', 'Tariq Mehmood', 'tariq.mehmood@idap.gop.pk', 'IDAP-QC-001', 'GENERAL_MANAGER',       'QC', true),
    ('11111111-1111-1111-1111-000000000002', 'Nadia Rehman',  'nadia.rehman@idap.gop.pk',  'IDAP-QC-002', 'GENERAL_MANAGER',       'QC', true),
    ('11111111-1111-1111-1111-000000000003', 'Sara Ali',      'sara.ali@idap.gop.pk',      'IDAP-QC-003', 'MANAGER',               'QC', true),
    ('11111111-1111-1111-1111-000000000004', 'Bilal Hussain', 'bilal.hussain@idap.gop.pk', 'IDAP-QC-004', 'ASSISTANT_MANAGER',     'QC', true),
    ('11111111-1111-1111-1111-000000000005', 'Ahsan Khan',    'ahsan.khan@idap.gop.pk',    'IDAP-QC-005', 'ASSISTANT_ENGINEER',    'QC', true),
    ('11111111-1111-1111-1111-000000000006', 'Fatima Noor',   'fatima.noor@idap.gop.pk',   'IDAP-QC-006', 'ASSISTANT_ENGINEER',    'QC', true),
    ('11111111-1111-1111-1111-000000000007', 'Usman Raza',    'usman.raza@consultant.pk',  'IDAP-QC-007', 'INDIVIDUAL_CONSULTANT', 'QC', true),
    ('11111111-1111-1111-1111-000000000008', 'Kamran Javed',  'kamran.javed@idap.gop.pk',  'IDAP-QC-008', 'MANAGER',               'QC', false),
    ('11111111-1111-1111-1111-000000000009', 'Hira Saleem',   'hira.saleem@idap.gop.pk',   'IDAP-QC-009', 'ASSISTANT_ENGINEER',    'QC', true),
    ('11111111-1111-1111-1111-000000000010', 'Zainab Akhtar', 'zainab.akhtar@idap.gop.pk', 'IDAP-QC-010', 'ASSISTANT_MANAGER',     'QC', true);

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------
INSERT INTO projects (id, project_code, name, description, status, start_date, end_date, is_active) VALUES
    ('22222222-2222-2222-2222-000000000001', 'NZE-LHR',  'Net Zero Energy Building Lahore',
        'Four-storey net zero energy office building with basement and rooftop solar.', 'ACTIVE',   '2025-03-01', '2027-06-30', true),
    ('22222222-2222-2222-2222-000000000002', 'RWP-ROAD', 'Rawalpindi Road Rehabilitation',
        'Rehabilitation of 6 km urban road with storm drainage and utility corridor.',  'ACTIVE',   '2026-01-15', '2027-01-15', true),
    ('22222222-2222-2222-2222-000000000003', 'MUL-HOSP', 'Multan Hospital Extension',
        'New hospital block; no packages defined yet.',                                 'PLANNING', '2026-11-01', NULL,         true),
    ('22222222-2222-2222-2222-000000000004', 'FSD-SCH',  'Faisalabad School Upgrade',
        'Completed and archived project kept for history.',                             'ARCHIVED', '2023-02-01', '2024-12-31', false);

-- -----------------------------------------------------------------------------
-- Project access
-- -----------------------------------------------------------------------------
INSERT INTO user_projects (user_id, project_id, is_active) VALUES
    -- Tariq (GM): all projects
    ('11111111-1111-1111-1111-000000000001', '22222222-2222-2222-2222-000000000001', true),
    ('11111111-1111-1111-1111-000000000001', '22222222-2222-2222-2222-000000000002', true),
    ('11111111-1111-1111-1111-000000000001', '22222222-2222-2222-2222-000000000003', true),
    ('11111111-1111-1111-1111-000000000001', '22222222-2222-2222-2222-000000000004', true),
    -- Nadia (GM): NZE only -> cannot approve RWP reports
    ('11111111-1111-1111-1111-000000000002', '22222222-2222-2222-2222-000000000001', true),
    -- Sara (Manager)
    ('11111111-1111-1111-1111-000000000003', '22222222-2222-2222-2222-000000000001', true),
    ('11111111-1111-1111-1111-000000000003', '22222222-2222-2222-2222-000000000002', true),
    ('11111111-1111-1111-1111-000000000003', '22222222-2222-2222-2222-000000000003', true),
    -- Bilal (AM)
    ('11111111-1111-1111-1111-000000000004', '22222222-2222-2222-2222-000000000001', true),
    -- Ahsan (AE)
    ('11111111-1111-1111-1111-000000000005', '22222222-2222-2222-2222-000000000001', true),
    ('11111111-1111-1111-1111-000000000005', '22222222-2222-2222-2222-000000000002', true),
    -- Fatima (AE)
    ('11111111-1111-1111-1111-000000000006', '22222222-2222-2222-2222-000000000002', true),
    -- Usman (IC)
    ('11111111-1111-1111-1111-000000000007', '22222222-2222-2222-2222-000000000001', true),
    -- Kamran (inactive Manager)
    ('11111111-1111-1111-1111-000000000008', '22222222-2222-2222-2222-000000000001', true),
    -- Zainab (AM): assignment disabled
    ('11111111-1111-1111-1111-000000000010', '22222222-2222-2222-2222-000000000002', false);
    -- Hira (AE) intentionally has no project assignments

-- -----------------------------------------------------------------------------
-- Packages (MUL-HOSP has none)
-- -----------------------------------------------------------------------------
INSERT INTO packages (id, project_id, package_code, name, description, status) VALUES
    ('33333333-3333-3333-3333-000000000011', '22222222-2222-2222-2222-000000000001', 'STR', 'Structural Works', 'RCC frame, slabs and basement.',       'ACTIVE'),
    ('33333333-3333-3333-3333-000000000012', '22222222-2222-2222-2222-000000000001', 'FIN', 'Finishing Works',  'Plaster, paint, tiles, doors, windows.', 'ACTIVE'),
    ('33333333-3333-3333-3333-000000000013', '22222222-2222-2222-2222-000000000001', 'MEP', 'MEP Services',     'Mechanical, electrical and plumbing.',   'ON_HOLD'),
    ('33333333-3333-3333-3333-000000000021', '22222222-2222-2222-2222-000000000002', 'PAV', 'Pavement Works',   'Subbase, base course and asphalt.',      'ACTIVE'),
    ('33333333-3333-3333-3333-000000000022', '22222222-2222-2222-2222-000000000002', 'DRN', 'Storm Drainage',   'Storm drain lines and inlets.',          'ACTIVE'),
    ('33333333-3333-3333-3333-000000000041', '22222222-2222-2222-2222-000000000004', 'CIV', 'Civil Works',      'Classroom block civil works.',           'COMPLETED');

-- -----------------------------------------------------------------------------
-- Site locations (inserted parent-first, one depth level per statement)
-- -----------------------------------------------------------------------------
-- Depth 0: sites
INSERT INTO site_locations (id, project_id, package_id, parent_location_id, name, location_code, location_type, description) VALUES
    ('44444444-4444-4444-4444-000000000101', '22222222-2222-2222-2222-000000000001', NULL, NULL, 'NZE Site',             'SITE', 'SITE', 'Whole NZE project site.'),
    ('44444444-4444-4444-4444-000000000201', '22222222-2222-2222-2222-000000000002', NULL, NULL, 'Rawalpindi Road Site', 'SITE', 'SITE', 'Full 6 km corridor.'),
    ('44444444-4444-4444-4444-000000000301', '22222222-2222-2222-2222-000000000003', NULL, NULL, 'Hospital Site',        'SITE', 'SITE', NULL),
    ('44444444-4444-4444-4444-000000000401', '22222222-2222-2222-2222-000000000004', NULL, NULL, 'School Site',          'SITE', 'SITE', NULL);

-- Depth 1
INSERT INTO site_locations (id, project_id, package_id, parent_location_id, name, location_code, location_type, description, is_active) VALUES
    ('44444444-4444-4444-4444-000000000102', '22222222-2222-2222-2222-000000000001', NULL,                                   '44444444-4444-4444-4444-000000000101', 'Main Building',          'MB',  'BUILDING',      NULL, true),
    ('44444444-4444-4444-4444-000000000110', '22222222-2222-2222-2222-000000000001', NULL,                                   '44444444-4444-4444-4444-000000000101', 'External Works',         'EXT', 'EXTERNAL_WORK', 'Parking, landscaping, boundary.', true),
    ('44444444-4444-4444-4444-000000000112', '22222222-2222-2222-2222-000000000001', NULL,                                   '44444444-4444-4444-4444-000000000101', 'Temporary Site Office',  'TSO', 'OTHER',         'Demolished; archived location.', false),
    ('44444444-4444-4444-4444-000000000202', '22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000021', '44444444-4444-4444-4444-000000000201', 'Road Section A (0+000 to 3+000)', 'RA', 'ROAD',  NULL, true),
    ('44444444-4444-4444-4444-000000000203', '22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000021', '44444444-4444-4444-4444-000000000201', 'Road Section B (3+000 to 6+000)', 'RB', 'ROAD',  NULL, true),
    ('44444444-4444-4444-4444-000000000204', '22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000022', '44444444-4444-4444-4444-000000000201', 'Storm Drain Line 1',     'SD1', 'DRAINAGE',      NULL, true),
    ('44444444-4444-4444-4444-000000000205', '22222222-2222-2222-2222-000000000002', NULL,                                   '44444444-4444-4444-4444-000000000201', 'Utilities Corridor',     'UC',  'UTILITY',       NULL, true),
    ('44444444-4444-4444-4444-000000000302', '22222222-2222-2222-2222-000000000003', NULL,                                   '44444444-4444-4444-4444-000000000301', 'Hospital Block',         'HB',  'BUILDING',      NULL, true);

-- Depth 2
INSERT INTO site_locations (id, project_id, package_id, parent_location_id, name, location_code, location_type) VALUES
    ('44444444-4444-4444-4444-000000000103', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000011', '44444444-4444-4444-4444-000000000102', 'Basement',     'MB-B1', 'FLOOR'),
    ('44444444-4444-4444-4444-000000000104', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000011', '44444444-4444-4444-4444-000000000102', 'Ground Floor', 'MB-GF', 'FLOOR'),
    ('44444444-4444-4444-4444-000000000105', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000012', '44444444-4444-4444-4444-000000000102', 'First Floor',  'MB-FF', 'FLOOR'),
    ('44444444-4444-4444-4444-000000000106', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000012', '44444444-4444-4444-4444-000000000102', 'Second Floor', 'MB-SF', 'FLOOR'),
    ('44444444-4444-4444-4444-000000000107', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000013', '44444444-4444-4444-4444-000000000102', 'Rooftop',      'MB-RF', 'ROOFTOP'),
    ('44444444-4444-4444-4444-000000000111', '22222222-2222-2222-2222-000000000001', NULL,                                   '44444444-4444-4444-4444-000000000110', 'Boundary Wall', 'EXT-BW', 'BOUNDARY'),
    ('44444444-4444-4444-4444-000000000303', '22222222-2222-2222-2222-000000000003', NULL,                                   '44444444-4444-4444-4444-000000000302', 'Ground Floor', 'HB-GF', 'FLOOR');

-- Depth 3
INSERT INTO site_locations (id, project_id, package_id, parent_location_id, name, location_code, location_type) VALUES
    ('44444444-4444-4444-4444-000000000108', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000012', '44444444-4444-4444-4444-000000000105', 'Room 101', 'MB-FF-101', 'ROOM'),
    ('44444444-4444-4444-4444-000000000109', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000012', '44444444-4444-4444-4444-000000000105', 'Room 102', 'MB-FF-102', 'ROOM');

-- -----------------------------------------------------------------------------
-- Issue categories & generic issue catalogue
-- -----------------------------------------------------------------------------
INSERT INTO issue_categories (id, code, name, description, is_active) VALUES
    ('55555555-5555-5555-5555-000000000001', 'CIV', 'Civil / Structural',         'Concrete, blockwork and structural defects.', true),
    ('55555555-5555-5555-5555-000000000002', 'ARC', 'Architectural / Finishes',   'Plaster, paint, tiles, doors and windows.',   true),
    ('55555555-5555-5555-5555-000000000003', 'MEP', 'MEP Services',               'Mechanical, electrical and plumbing.',        true),
    ('55555555-5555-5555-5555-000000000004', 'HSE', 'Health, Safety & Housekeeping', 'Site safety and housekeeping.',            true),
    ('55555555-5555-5555-5555-000000000005', 'INF', 'Infrastructure',             'Roads, drainage and utilities.',              true),
    ('55555555-5555-5555-5555-000000000006', 'LEG', 'Legacy',                     'Retired catalogue entries.',                  false);

-- Parent entry first
INSERT INTO generic_issues (id, category_id, parent_issue_id, issue_code, title, default_description, default_root_cause, default_risk_text, default_severity) VALUES
    ('66666666-6666-6666-6666-000000000001', '55555555-5555-5555-5555-000000000001', NULL, 'CIV-001', 'Concrete defects',
        'Defects observed in cast-in-place concrete elements.', NULL, NULL, NULL);

INSERT INTO generic_issues (id, category_id, parent_issue_id, issue_code, title, default_description, default_root_cause, default_risk_text, default_severity, is_active) VALUES
    ('66666666-6666-6666-6666-000000000002', '55555555-5555-5555-5555-000000000001', '66666666-6666-6666-6666-000000000001', 'CIV-001-01', 'Honeycombing and segregation',
        'Concrete surface shows voids and exposed aggregate. Repair with approved non-shrink grout as per method statement.',
        'Inadequate vibration/compaction during placement.', 'Reduced durability and possible corrosion of reinforcement.', 'HIGH', true),
    ('66666666-6666-6666-6666-000000000003', '55555555-5555-5555-5555-000000000001', '66666666-6666-6666-6666-000000000001', 'CIV-001-02', 'Exposed reinforcement',
        'Reinforcement bars are exposed due to insufficient cover. Treat bars and restore cover with approved repair mortar.',
        'Displaced or missing cover blocks.', 'Corrosion of reinforcement and loss of structural capacity.', 'CRITICAL', true),
    ('66666666-6666-6666-6666-000000000004', '55555555-5555-5555-5555-000000000001', '66666666-6666-6666-6666-000000000001', 'CIV-001-03', 'Hairline cracks',
        'Hairline cracks observed on concrete surface. Monitor and seal with approved crack filler.',
        'Plastic shrinkage due to inadequate curing.', 'Moisture ingress over time.', 'MEDIUM', true),
    ('66666666-6666-6666-6666-000000000005', '55555555-5555-5555-5555-000000000001', NULL, 'CIV-002', 'Incomplete blockwork joints',
        'Mortar joints in blockwork are not fully filled. Rake out and refill joints.',
        'Poor workmanship.', 'Reduced wall strength and plaster cracking.', 'MEDIUM', true),
    ('66666666-6666-6666-6666-000000000006', '55555555-5555-5555-5555-000000000002', NULL, 'ARC-001', 'Uneven wall finish',
        'Wall plaster is uneven and outside the approved tolerance. Rectify and obtain QC acceptance.',
        'Plaster applied without proper screeds.', 'Poor aesthetics; rework of paint.', 'LOW', true),
    ('66666666-6666-6666-6666-000000000007', '55555555-5555-5555-5555-000000000002', NULL, 'ARC-002', 'Paint peeling / delamination',
        'Paint film is peeling from the substrate. Scrape, prime and repaint.',
        'Paint applied on damp or unprimed surface.', 'Recurring defect and poor finish.', 'LOW', true),
    ('66666666-6666-6666-6666-000000000008', '55555555-5555-5555-5555-000000000002', NULL, 'ARC-003', 'Broken or missing floor tiles',
        'Floor tiles are cracked or missing. Replace with matching tiles.',
        'Impact damage or hollow bedding.', 'Trip hazard.', 'MEDIUM', true),
    ('66666666-6666-6666-6666-000000000009', '55555555-5555-5555-5555-000000000002', NULL, 'ARC-004', 'Missing windowsill marble',
        'Marble sill has not been installed at the window opening.',
        'Pending material delivery.', 'Water ingress at window base.', 'LOW', true),
    ('66666666-6666-6666-6666-000000000010', '55555555-5555-5555-5555-000000000002', NULL, 'ARC-005', 'Gaps around door frames',
        'Visible gaps between door frame and wall. Seal with approved sealant.',
        'Frame not fixed plumb or wall out of line.', 'Pest entry and poor finish.', 'LOW', true),
    ('66666666-6666-6666-6666-000000000011', '55555555-5555-5555-5555-000000000003', NULL, 'MEP-001', 'Unsealed pipe penetration',
        'Pipe penetration through slab/wall is not sealed. Seal with approved fire-rated sealant.',
        'Sealing activity not scheduled after pipe installation.', 'Fire and smoke spread; water leakage.', 'HIGH', true),
    ('66666666-6666-6666-6666-000000000012', '55555555-5555-5555-5555-000000000003', NULL, 'MEP-002', 'Missing pipe end caps',
        'Open pipe ends left without caps. Install temporary end caps.',
        'Poor site discipline.', 'Debris entering pipework and blockage.', 'MEDIUM', true),
    ('66666666-6666-6666-6666-000000000013', '55555555-5555-5555-5555-000000000003', NULL, 'MEP-003', 'Misaligned ductwork',
        'Ductwork is not aligned with the approved shop drawing. Realign and re-support.',
        'Clash with structure not resolved before installation.', 'Air leakage and ceiling clashes.', 'MEDIUM', true),
    ('66666666-6666-6666-6666-000000000014', '55555555-5555-5555-5555-000000000003', NULL, 'MEP-004', 'Electrical floor box level issue',
        'Floor box is not flush with finished floor level.',
        'Box set before screed level was fixed.', 'Trip hazard and damage to box.', 'LOW', true),
    ('66666666-6666-6666-6666-000000000015', '55555555-5555-5555-5555-000000000004', NULL, 'HSE-001', 'Inadequate barricading',
        'Open edges/excavations are not barricaded. Install rigid barricades and signage immediately.',
        'Barricades removed and not reinstated.', 'Fall from height; serious injury.', 'CRITICAL', true),
    ('66666666-6666-6666-6666-000000000016', '55555555-5555-5555-5555-000000000004', NULL, 'HSE-002', 'Poor housekeeping',
        'Debris and waste material scattered in work area. Clear and maintain housekeeping.',
        'No daily cleaning schedule.', 'Trip hazards and fire risk.', 'MEDIUM', true),
    ('66666666-6666-6666-6666-000000000017', '55555555-5555-5555-5555-000000000004', NULL, 'HSE-003', 'Stagnant water',
        'Stagnant water accumulated in the area. Dewater and fix the source.',
        'Blocked drainage or leakage.', 'Mosquito breeding and damage to finishes.', 'HIGH', true),
    ('66666666-6666-6666-6666-000000000018', '55555555-5555-5555-5555-000000000005', NULL, 'INF-001', 'Pavement surface cracking',
        'Longitudinal/transverse cracks in asphalt wearing course. Seal or patch as specified.',
        'Inadequate base compaction.', 'Water ingress and pavement failure.', 'HIGH', true),
    ('66666666-6666-6666-6666-000000000019', '55555555-5555-5555-5555-000000000005', NULL, 'INF-002', 'Blocked drain inlet',
        'Drain inlet blocked with silt and debris. Clean and protect the inlet.',
        'Construction debris washed into inlet.', 'Road flooding during rain.', 'MEDIUM', true),
    ('66666666-6666-6666-6666-000000000020', '55555555-5555-5555-5555-000000000006', NULL, 'LEG-001', 'Obsolete plaster thickness check',
        'Retired catalogue entry kept for history.',
        NULL, NULL, 'LOW', false);

-- -----------------------------------------------------------------------------
-- Issues
--   Rows with NULL title/description/severity use the generic-issue snapshot trigger.
--   All start OPEN; status changes below generate issue_history rows.
-- -----------------------------------------------------------------------------
INSERT INTO issues (id, site_location_id, generic_issue_id, reported_by, title, description, root_cause, risk_description, severity, location_details, observed_at) VALUES
    -- NZE-LHR
    ('77777777-7777-7777-7777-000000000001', '44444444-4444-4444-4444-000000000104', '66666666-6666-6666-6666-000000000002', '11111111-1111-1111-1111-000000000005',
        'Honeycombing in column C-12', 'Voids visible on the east face of column C-12 near the base. Repair per approved method statement.', NULL, NULL, 'CRITICAL', 'Grid C/12, east face', '2026-09-28 10:30+05'),
    ('77777777-7777-7777-7777-000000000002', '44444444-4444-4444-4444-000000000108', '66666666-6666-6666-6666-000000000006', '11111111-1111-1111-1111-000000000005',
        NULL, NULL, NULL, NULL, NULL, 'North wall of Room 101', '2026-09-30 11:00+05'),
    ('77777777-7777-7777-7777-000000000003', '44444444-4444-4444-4444-000000000103', '66666666-6666-6666-6666-000000000003', '11111111-1111-1111-1111-000000000007',
        NULL, NULL, NULL, NULL, NULL, 'Retaining wall RW-3', '2026-09-28 09:45+05'),
    ('77777777-7777-7777-7777-000000000004', '44444444-4444-4444-4444-000000000103', '66666666-6666-6666-6666-000000000017', '11111111-1111-1111-1111-000000000005',
        NULL, NULL, NULL, NULL, NULL, 'Near sump pit', '2026-09-28 10:05+05'),
    ('77777777-7777-7777-7777-000000000005', '44444444-4444-4444-4444-000000000104', '66666666-6666-6666-6666-000000000011', '11111111-1111-1111-1111-000000000004',
        NULL, NULL, NULL, NULL, NULL, 'Shaft S-2 slab penetration', '2026-09-28 11:20+05'),
    ('77777777-7777-7777-7777-000000000006', '44444444-4444-4444-4444-000000000105', '66666666-6666-6666-6666-000000000007', '11111111-1111-1111-1111-000000000005',
        NULL, NULL, NULL, NULL, NULL, 'Corridor ceiling', '2026-09-30 12:10+05'),
    ('77777777-7777-7777-7777-000000000007', '44444444-4444-4444-4444-000000000106', '66666666-6666-6666-6666-000000000008', '11111111-1111-1111-1111-000000000007',
        NULL, NULL, NULL, NULL, NULL, 'Lift lobby', '2026-09-30 14:00+05'),
    ('77777777-7777-7777-7777-000000000008', '44444444-4444-4444-4444-000000000106', '66666666-6666-6666-6666-000000000009', '11111111-1111-1111-1111-000000000005',
        NULL, NULL, NULL, NULL, NULL, 'Window W-14', '2026-09-30 14:20+05'),
    ('77777777-7777-7777-7777-000000000009', '44444444-4444-4444-4444-000000000107', '66666666-6666-6666-6666-000000000013', '11111111-1111-1111-1111-000000000004',
        NULL, NULL, NULL, NULL, NULL, 'AHU-2 supply duct', '2026-10-02 10:00+05'),
    ('77777777-7777-7777-7777-000000000010', '44444444-4444-4444-4444-000000000107', '66666666-6666-6666-6666-000000000012', '11111111-1111-1111-1111-000000000007',
        NULL, NULL, NULL, NULL, NULL, 'Chilled water risers', '2026-10-02 10:25+05'),
    ('77777777-7777-7777-7777-000000000011', '44444444-4444-4444-4444-000000000110', '66666666-6666-6666-6666-000000000015', '11111111-1111-1111-1111-000000000005',
        NULL, NULL, NULL, NULL, NULL, 'Open excavation near parking ramp', '2026-10-04 09:15+05'),
    ('77777777-7777-7777-7777-000000000012', '44444444-4444-4444-4444-000000000111', NULL, '11111111-1111-1111-1111-000000000005',
        'Cracks at boundary wall expansion joint', 'Diagonal cracks observed either side of the expansion joint on the east boundary wall.',
        'Joint filler omitted during construction.', 'Progressive cracking and water ingress.', 'HIGH', 'East boundary, panel 7', '2026-10-04 09:40+05'),
    ('77777777-7777-7777-7777-000000000013', '44444444-4444-4444-4444-000000000109', '66666666-6666-6666-6666-000000000010', '11111111-1111-1111-1111-000000000005',
        NULL, NULL, NULL, NULL, NULL, 'Door D-102', '2026-09-30 12:40+05'),
    ('77777777-7777-7777-7777-000000000014', '44444444-4444-4444-4444-000000000104', '66666666-6666-6666-6666-000000000016', '11111111-1111-1111-1111-000000000007',
        NULL, NULL, NULL, NULL, NULL, 'Main lobby', '2026-09-28 12:00+05'),
    ('77777777-7777-7777-7777-000000000015', '44444444-4444-4444-4444-000000000102', NULL, '11111111-1111-1111-1111-000000000005',
        'Damaged staircase railing', 'Handrail bracket loose and railing deflects under light load.',
        NULL, 'Fall risk for users of the stair.', 'HIGH', 'Stair core 2, between GF and FF', '2026-10-04 10:30+05'),
    ('77777777-7777-7777-7777-000000000016', '44444444-4444-4444-4444-000000000105', '66666666-6666-6666-6666-000000000004', '11111111-1111-1111-1111-000000000005',
        NULL, 'Hairline cracks on slab soffit along grid line 4; monitor for 14 days before sealing.', NULL, NULL, NULL, 'Grid line 4 soffit', '2026-10-06 11:30+05'),
    -- RWP-ROAD
    ('77777777-7777-7777-7777-000000000017', '44444444-4444-4444-4444-000000000202', '66666666-6666-6666-6666-000000000018', '11111111-1111-1111-1111-000000000006',
        NULL, NULL, NULL, NULL, NULL, 'Chainage 1+250, left carriageway', '2026-09-25 10:00+05'),
    ('77777777-7777-7777-7777-000000000018', '44444444-4444-4444-4444-000000000203', NULL, '11111111-1111-1111-1111-000000000005',
        'Uneven road camber', 'Camber does not match design cross-section; ponding expected at edge.',
        'Grader levels not checked.', 'Water ponding and edge failure.', 'MEDIUM', 'Chainage 4+100 to 4+300', '2026-10-01 09:30+05'),
    ('77777777-7777-7777-7777-000000000019', '44444444-4444-4444-4444-000000000204', '66666666-6666-6666-6666-000000000019', '11111111-1111-1111-1111-000000000006',
        NULL, NULL, NULL, NULL, NULL, 'Inlet SD1-07', '2026-10-01 10:15+05'),
    ('77777777-7777-7777-7777-000000000020', '44444444-4444-4444-4444-000000000205', NULL, '11111111-1111-1111-1111-000000000006',
        'Exposed live electrical cable', 'LV cable exposed in open trench without protection or warning tape.',
        'Cable protection not installed before backfill stage.', 'Electrocution risk to workers and public.', 'CRITICAL', 'Utility trench UT-3', '2026-10-01 11:00+05'),
    ('77777777-7777-7777-7777-000000000021', '44444444-4444-4444-4444-000000000202', '66666666-6666-6666-6666-000000000015', '11111111-1111-1111-1111-000000000006',
        NULL, NULL, NULL, NULL, NULL, 'Chainage 2+000 manhole excavation', '2026-09-25 10:40+05'),
    -- MUL-HOSP
    ('77777777-7777-7777-7777-000000000022', '44444444-4444-4444-4444-000000000303', NULL, '11111111-1111-1111-1111-000000000003',
        'Setting-out deviation of column grid', 'Column grid B is 25 mm off the approved setting-out.',
        'Survey control point disturbed.', NULL, 'LOW', 'Grid B/1 to B/6', '2026-10-07 09:00+05');

-- Issue lifecycle transitions (actor drives issue_history.changed_by)
SELECT set_config('app.current_user_id', '11111111-1111-1111-1111-000000000005', true);  -- Ahsan
UPDATE issues SET status = 'IN_PROGRESS'
WHERE id IN (
    '77777777-7777-7777-7777-000000000002', '77777777-7777-7777-7777-000000000009', '77777777-7777-7777-7777-000000000016',
    '77777777-7777-7777-7777-000000000018', '77777777-7777-7777-7777-000000000004', '77777777-7777-7777-7777-000000000014',
    '77777777-7777-7777-7777-000000000005', '77777777-7777-7777-7777-000000000021', '77777777-7777-7777-7777-000000000006',
    '77777777-7777-7777-7777-000000000013', '77777777-7777-7777-7777-000000000019'
);
UPDATE issues SET status = 'RECTIFIED'
WHERE id IN (
    '77777777-7777-7777-7777-000000000004', '77777777-7777-7777-7777-000000000014', '77777777-7777-7777-7777-000000000005',
    '77777777-7777-7777-7777-000000000021', '77777777-7777-7777-7777-000000000006', '77777777-7777-7777-7777-000000000013',
    '77777777-7777-7777-7777-000000000019'
);

SELECT set_config('app.current_user_id', '11111111-1111-1111-1111-000000000004', true);  -- Bilal
UPDATE issues SET status = 'VERIFIED'
WHERE id IN ('77777777-7777-7777-7777-000000000005', '77777777-7777-7777-7777-000000000006', '77777777-7777-7777-7777-000000000013');

SELECT set_config('app.current_user_id', '11111111-1111-1111-1111-000000000003', true);  -- Sara
UPDATE issues SET status = 'VERIFIED'
WHERE id IN ('77777777-7777-7777-7777-000000000021', '77777777-7777-7777-7777-000000000019');
UPDATE issues SET status = 'CLOSED'
WHERE id IN ('77777777-7777-7777-7777-000000000006', '77777777-7777-7777-7777-000000000013', '77777777-7777-7777-7777-000000000019');
UPDATE issues SET status = 'REJECTED'
WHERE id = '77777777-7777-7777-7777-000000000008';

SELECT set_config('app.current_user_id', '', true);

-- -----------------------------------------------------------------------------
-- Report templates (v1.0 retired, still referenced by an approved report)
-- -----------------------------------------------------------------------------
INSERT INTO report_templates (id, name, version, template_path, template_config, is_active) VALUES
    ('88888888-8888-8888-8888-000000000001', 'IDAP Standard QC Report', '1.0', 'templates/idap-standard-qc/v1.0.docx',
        '{"header": "Infrastructure Development Authority of Punjab", "subheader": "Government of the Punjab", "output": ["PDF"]}'::jsonb, false),
    ('88888888-8888-8888-8888-000000000002', 'IDAP Standard QC Report', '1.1', 'templates/idap-standard-qc/v1.1.docx',
        '{"header": "Infrastructure Development Authority of Punjab", "subheader": "Government of the Punjab", "output": ["PDF", "DOCX"], "imagesPerRow": 2}'::jsonb, true),
    ('88888888-8888-8888-8888-000000000003', 'IDAP Road Inspection Report', '1.0', 'templates/idap-road-inspection/v1.0.docx',
        '{"header": "Infrastructure Development Authority of Punjab", "output": ["PDF"], "showChainage": true}'::jsonb, true);

-- -----------------------------------------------------------------------------
-- Reports (all inserted as DRAFT; workflow procedures move them below)
--   R1 NZE  project-wide  -> DRAFT (full section structure)
--   R2 NZE  STR           -> APPROVED (old template v1.0)
--   R3 NZE  FIN           -> REJECTED
--   R4 NZE  MEP           -> UNDER_REVIEW (submitted by IC)
--   R5 NZE  project-wide  -> SUBMITTED
--   R6 RWP  PAV           -> APPROVED
--   R7 RWP  project-wide  -> REOPENED (approved, then reopened)
--   R8 RWP  DRN           -> DRAFT with no issues (submit should fail)
-- -----------------------------------------------------------------------------
INSERT INTO reports (id, project_id, package_id, report_template_id, document_no, title, site_visit_date, created_by) VALUES
    ('99999999-9999-9999-9999-000000000001', '22222222-2222-2222-2222-000000000001', NULL,                                   '88888888-8888-8888-8888-000000000002', 'QC-NZE-LHR-2026-005', 'Weekly Site Quality Inspection',        '2026-10-06', '11111111-1111-1111-1111-000000000005'),
    ('99999999-9999-9999-9999-000000000002', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000011', '88888888-8888-8888-8888-000000000001', 'QC-NZE-LHR-2026-001', 'Structural Works Quality Inspection',   '2026-09-28', '11111111-1111-1111-1111-000000000005'),
    ('99999999-9999-9999-9999-000000000003', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000012', '88888888-8888-8888-8888-000000000002', 'QC-NZE-LHR-2026-002', 'Finishing Works Quality Inspection',    '2026-09-30', '11111111-1111-1111-1111-000000000005'),
    ('99999999-9999-9999-9999-000000000004', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000013', '88888888-8888-8888-8888-000000000002', 'QC-NZE-LHR-2026-003', 'MEP Rooftop Inspection',                '2026-10-02', '11111111-1111-1111-1111-000000000007'),
    ('99999999-9999-9999-9999-000000000005', '22222222-2222-2222-2222-000000000001', NULL,                                   '88888888-8888-8888-8888-000000000002', 'QC-NZE-LHR-2026-004', 'External Works and Safety Walkthrough', '2026-10-04', '11111111-1111-1111-1111-000000000005'),
    ('99999999-9999-9999-9999-000000000006', '22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000021', '88888888-8888-8888-8888-000000000003', 'QC-RWP-ROAD-2026-001', 'Pavement Works Inspection - Section A', '2026-09-25', '11111111-1111-1111-1111-000000000006'),
    ('99999999-9999-9999-9999-000000000007', '22222222-2222-2222-2222-000000000002', NULL,                                   '88888888-8888-8888-8888-000000000003', 'QC-RWP-ROAD-2026-002', 'Road and Drainage Monthly Inspection',  '2026-10-01', '11111111-1111-1111-1111-000000000006'),
    ('99999999-9999-9999-9999-000000000008', '22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000022', '88888888-8888-8888-8888-000000000003', 'QC-RWP-ROAD-2026-003', 'Storm Drain Pre-Monsoon Check',         '2026-10-07', '11111111-1111-1111-1111-000000000006');

-- -----------------------------------------------------------------------------
-- Report sections: top-level first, then children
-- -----------------------------------------------------------------------------
INSERT INTO report_sections (id, report_id, parent_section_id, site_location_id, section_type, heading, body_text, display_order) VALUES
    -- R1
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000101', '99999999-9999-9999-9999-000000000001', NULL, NULL, 'CRITICAL_OBSERVATIONS', 'CRITICAL OBSERVATIONS', NULL, 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000102', '99999999-9999-9999-9999-000000000001', NULL, NULL, 'GENERAL_OBSERVATIONS',  'GENERAL OBSERVATIONS',  NULL, 2),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000108', '99999999-9999-9999-9999-000000000001', NULL, NULL, 'PROJECT_PROGRESS_SUBMITTAL_STATUS', 'PROJECT PROGRESS AND SUBMITTAL STATUS',
        'Structural frame complete up to roof slab. Finishing works 45% complete. Pending submittals: facade shop drawings (Rev B), MEP coordination drawings for level 2.', 8),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000109', '99999999-9999-9999-9999-000000000001', NULL, NULL, 'RISK_ASSESSMENT', 'RISK ASSESSMENT',
        'Open excavation near the parking ramp presents an immediate fall hazard. Exposed reinforcement in the basement retaining wall poses a durability risk if not treated before backfilling.', 9),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000110', '99999999-9999-9999-9999-000000000001', NULL, NULL, 'RECOMMENDATIONS', 'RECOMMENDATIONS',
        '1. Barricade all open edges within 24 hours. 2. Submit repair method statement for honeycombing. 3. Implement daily housekeeping checklist.', 10),
    -- R2
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000201', '99999999-9999-9999-9999-000000000002', NULL, NULL, 'CRITICAL_OBSERVATIONS', 'CRITICAL OBSERVATIONS', NULL, 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000202', '99999999-9999-9999-9999-000000000002', NULL, NULL, 'GENERAL_OBSERVATIONS',  'GENERAL OBSERVATIONS',  NULL, 2),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000205', '99999999-9999-9999-9999-000000000002', NULL, NULL, 'RECOMMENDATIONS', 'RECOMMENDATIONS',
        'Close out critical structural observations before casting the next pour.', 5),
    -- R3
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000301', '99999999-9999-9999-9999-000000000003', NULL, NULL, 'GENERAL_OBSERVATIONS', 'GENERAL OBSERVATIONS', NULL, 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000304', '99999999-9999-9999-9999-000000000003', NULL, NULL, 'RISK_ASSESSMENT', 'RISK ASSESSMENT',
        'Finishing defects are cosmetic but will delay handover if not rectified before painting.', 4),
    -- R4
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000401', '99999999-9999-9999-9999-000000000004', NULL, NULL, 'GENERAL_OBSERVATIONS', 'GENERAL OBSERVATIONS', NULL, 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000403', '99999999-9999-9999-9999-000000000004', NULL, NULL, 'RECOMMENDATIONS', 'RECOMMENDATIONS',
        'Resolve duct clash with the structural beam before ceiling closure.', 3),
    -- R5
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000501', '99999999-9999-9999-9999-000000000005', NULL, NULL, 'CRITICAL_OBSERVATIONS', 'CRITICAL OBSERVATIONS', NULL, 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000502', '99999999-9999-9999-9999-000000000005', NULL, NULL, 'GENERAL_OBSERVATIONS',  'GENERAL OBSERVATIONS',  NULL, 2),
    -- R6
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000601', '99999999-9999-9999-9999-000000000006', NULL, NULL, 'CRITICAL_OBSERVATIONS', 'CRITICAL OBSERVATIONS', NULL, 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000602', '99999999-9999-9999-9999-000000000006', NULL, NULL, 'GENERAL_OBSERVATIONS',  'GENERAL OBSERVATIONS',  NULL, 2),
    -- R7
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000701', '99999999-9999-9999-9999-000000000007', NULL, NULL, 'CRITICAL_OBSERVATIONS', 'CRITICAL OBSERVATIONS', NULL, 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000702', '99999999-9999-9999-9999-000000000007', NULL, NULL, 'GENERAL_OBSERVATIONS',  'GENERAL OBSERVATIONS',  NULL, 2),
    -- R8: narrative-only section, no observations
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000801', '99999999-9999-9999-9999-000000000008', NULL, NULL, 'PROJECT_PROGRESS_SUBMITTAL_STATUS', 'PROJECT PROGRESS AND SUBMITTAL STATUS',
        'Drain line SD1 excavation 60% complete. Inspection of inlets scheduled after desilting.', 1);

-- Location sub-sections under GENERAL OBSERVATIONS
INSERT INTO report_sections (id, report_id, parent_section_id, site_location_id, section_type, heading, display_order) VALUES
    -- R1
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000103', '99999999-9999-9999-9999-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000102', '44444444-4444-4444-4444-000000000103', 'LOCATION', 'Basement',       3),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000104', '99999999-9999-9999-9999-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000102', '44444444-4444-4444-4444-000000000104', 'LOCATION', 'Ground Floor',   4),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000105', '99999999-9999-9999-9999-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000102', '44444444-4444-4444-4444-000000000105', 'LOCATION', 'First Floor',    5),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000106', '99999999-9999-9999-9999-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000102', '44444444-4444-4444-4444-000000000107', 'LOCATION', 'Rooftop',        6),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000107', '99999999-9999-9999-9999-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000102', '44444444-4444-4444-4444-000000000110', 'LOCATION', 'External Works', 7),
    -- R2
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000203', '99999999-9999-9999-9999-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000202', '44444444-4444-4444-4444-000000000103', 'LOCATION', 'Basement',       3),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000204', '99999999-9999-9999-9999-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000202', '44444444-4444-4444-4444-000000000104', 'LOCATION', 'Ground Floor',   4),
    -- R3
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000302', '99999999-9999-9999-9999-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000301', '44444444-4444-4444-4444-000000000105', 'LOCATION', 'First Floor',    2),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000303', '99999999-9999-9999-9999-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000301', '44444444-4444-4444-4444-000000000106', 'LOCATION', 'Second Floor',   3),
    -- R4
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000402', '99999999-9999-9999-9999-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000401', '44444444-4444-4444-4444-000000000107', 'LOCATION', 'Rooftop',        2),
    -- R5
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000503', '99999999-9999-9999-9999-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000502', '44444444-4444-4444-4444-000000000110', 'LOCATION', 'External Works', 3),
    -- R6
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000603', '99999999-9999-9999-9999-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000602', '44444444-4444-4444-4444-000000000202', 'LOCATION', 'Road Section A', 3),
    -- R7
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000703', '99999999-9999-9999-9999-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000702', '44444444-4444-4444-4444-000000000203', 'LOCATION', 'Road Section B',     3),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000704', '99999999-9999-9999-9999-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000702', '44444444-4444-4444-4444-000000000204', 'LOCATION', 'Storm Drain Line 1', 4);

-- -----------------------------------------------------------------------------
-- Report observations (issue 01 appears in both R1 and R2 as a follow-up)
-- -----------------------------------------------------------------------------
INSERT INTO report_issues (report_id, issue_id, section_id, observation_no, display_order) VALUES
    -- R1
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000101',  1,  1),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000101',  2,  2),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000101',  3,  3),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000103',  4,  4),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000104',  5,  5),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000104',  6,  6),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000105',  7,  7),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000105',  8,  8),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000106',  9,  9),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000106', 10, 10),
    ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000107', 11, 11),
    -- R2 (STR only)
    ('99999999-9999-9999-9999-000000000002', '77777777-7777-7777-7777-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000201', 1, 1),
    ('99999999-9999-9999-9999-000000000002', '77777777-7777-7777-7777-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000201', 2, 2),
    ('99999999-9999-9999-9999-000000000002', '77777777-7777-7777-7777-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000203', 3, 3),
    ('99999999-9999-9999-9999-000000000002', '77777777-7777-7777-7777-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000204', 4, 4),
    ('99999999-9999-9999-9999-000000000002', '77777777-7777-7777-7777-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000204', 5, 5),
    -- R3 (FIN only)
    ('99999999-9999-9999-9999-000000000003', '77777777-7777-7777-7777-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000302', 1, 1),
    ('99999999-9999-9999-9999-000000000003', '77777777-7777-7777-7777-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000302', 2, 2),
    ('99999999-9999-9999-9999-000000000003', '77777777-7777-7777-7777-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000302', 3, 3),
    ('99999999-9999-9999-9999-000000000003', '77777777-7777-7777-7777-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000303', 4, 4),
    -- R4 (MEP only)
    ('99999999-9999-9999-9999-000000000004', '77777777-7777-7777-7777-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000402', 1, 1),
    ('99999999-9999-9999-9999-000000000004', '77777777-7777-7777-7777-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000402', 2, 2),
    -- R5 (issue 15 deliberately has no section)
    ('99999999-9999-9999-9999-000000000005', '77777777-7777-7777-7777-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000501', 1, 1),
    ('99999999-9999-9999-9999-000000000005', '77777777-7777-7777-7777-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000503', 2, 2),
    ('99999999-9999-9999-9999-000000000005', '77777777-7777-7777-7777-000000000015', NULL,                                   3, 3),
    -- R6 (PAV only)
    ('99999999-9999-9999-9999-000000000006', '77777777-7777-7777-7777-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000601', 1, 1),
    ('99999999-9999-9999-9999-000000000006', '77777777-7777-7777-7777-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000603', 2, 2),
    -- R7 (project-wide)
    ('99999999-9999-9999-9999-000000000007', '77777777-7777-7777-7777-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000701', 1, 1),
    ('99999999-9999-9999-9999-000000000007', '77777777-7777-7777-7777-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000703', 2, 2),
    ('99999999-9999-9999-9999-000000000007', '77777777-7777-7777-7777-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000704', 3, 3);

-- -----------------------------------------------------------------------------
-- Report workflow (through the real procedures, so history/timestamps are genuine)
-- -----------------------------------------------------------------------------
-- R2: submit -> review -> approve
CALL sp_submit_report('99999999-9999-9999-9999-000000000002', '11111111-1111-1111-1111-000000000005');
CALL sp_start_review ('99999999-9999-9999-9999-000000000002', '11111111-1111-1111-1111-000000000003');
CALL sp_approve_report('99999999-9999-9999-9999-000000000002', '11111111-1111-1111-1111-000000000001',
    'Approved. Close out critical items within 7 days.');

-- R3: submit -> review -> reject
CALL sp_submit_report('99999999-9999-9999-9999-000000000003', '11111111-1111-1111-1111-000000000005');
CALL sp_start_review ('99999999-9999-9999-9999-000000000003', '11111111-1111-1111-1111-000000000004');
CALL sp_reject_report('99999999-9999-9999-9999-000000000003', '11111111-1111-1111-1111-000000000004',
    'Room 102 observation lacks detail; re-check finish tolerances on the second floor.');

-- R4: submitted by IC -> under review
CALL sp_submit_report('99999999-9999-9999-9999-000000000004', '11111111-1111-1111-1111-000000000007');
CALL sp_start_review ('99999999-9999-9999-9999-000000000004', '11111111-1111-1111-1111-000000000003');

-- R5: submitted only
CALL sp_submit_report('99999999-9999-9999-9999-000000000005', '11111111-1111-1111-1111-000000000005');

-- R6: submit -> review -> approve
CALL sp_submit_report('99999999-9999-9999-9999-000000000006', '11111111-1111-1111-1111-000000000006');
CALL sp_start_review ('99999999-9999-9999-9999-000000000006', '11111111-1111-1111-1111-000000000003');
CALL sp_approve_report('99999999-9999-9999-9999-000000000006', '11111111-1111-1111-1111-000000000001', NULL);

-- R7: submit -> review -> approve -> reopen
CALL sp_submit_report('99999999-9999-9999-9999-000000000007', '11111111-1111-1111-1111-000000000006');
CALL sp_start_review ('99999999-9999-9999-9999-000000000007', '11111111-1111-1111-1111-000000000003');
CALL sp_approve_report('99999999-9999-9999-9999-000000000007', '11111111-1111-1111-1111-000000000001', NULL);
CALL sp_reopen_report ('99999999-9999-9999-9999-000000000007', '11111111-1111-1111-1111-000000000001',
    'Drainage observation needs re-inspection after rainfall.');

SELECT set_config('app.current_user_id', '', true);

COMMIT;

-- =============================================================================
-- SANITY CHECKS (run after seeding)
-- =============================================================================
-- SELECT 'users' t, count(*) FROM users
-- UNION ALL SELECT 'projects', count(*) FROM projects
-- UNION ALL SELECT 'packages', count(*) FROM packages
-- UNION ALL SELECT 'site_locations', count(*) FROM site_locations
-- UNION ALL SELECT 'generic_issues', count(*) FROM generic_issues
-- UNION ALL SELECT 'issues', count(*) FROM issues
-- UNION ALL SELECT 'issue_history', count(*) FROM issue_history
-- UNION ALL SELECT 'reports', count(*) FROM reports
-- UNION ALL SELECT 'report_sections', count(*) FROM report_sections
-- UNION ALL SELECT 'report_issues', count(*) FROM report_issues
-- UNION ALL SELECT 'report_history', count(*) FROM report_history;
--
-- SELECT document_no, status, submitted_at, reviewed_at, approved_at FROM reports ORDER BY document_no;
-- SELECT * FROM v_site_location_hierarchy ORDER BY full_path;
-- SELECT * FROM v_issue_details ORDER BY observed_at;
-- SELECT * FROM v_report_summary ORDER BY document_no;
-- SELECT * FROM v_report_observations;
-- SELECT * FROM v_unresolved_issues;
-- SELECT * FROM v_dashboard_metrics;
-- SELECT * FROM v_user_project_access ORDER BY user_name;
-- SELECT fn_report_payload('99999999-9999-9999-9999-000000000001');
-- SELECT fn_next_report_number('22222222-2222-2222-2222-000000000001', '2026-10-08');  -- QC-NZE-LHR-2026-006
-- SELECT fn_next_report_number('22222222-2222-2222-2222-000000000003', '2026-10-08');  -- QC-MUL-HOSP-2026-001

-- =============================================================================
-- NEGATIVE TESTS (each should raise an error; run one at a time, then ROLLBACK)
-- =============================================================================
-- Non-GM approval:
-- CALL sp_approve_report('99999999-9999-9999-9999-000000000004', '11111111-1111-1111-1111-000000000003', NULL);
-- GM without project access (Nadia on an RWP report: resubmit R7 and review it first):
-- CALL sp_submit_report('99999999-9999-9999-9999-000000000007', '11111111-1111-1111-1111-000000000006');
-- CALL sp_start_review ('99999999-9999-9999-9999-000000000007', '11111111-1111-1111-1111-000000000003');
-- CALL sp_approve_report('99999999-9999-9999-9999-000000000007', '11111111-1111-1111-1111-000000000002', NULL);
-- Submit report with no issues:
-- CALL sp_submit_report('99999999-9999-9999-9999-000000000008', '11111111-1111-1111-1111-000000000006');
-- Inactive user action:
-- CALL sp_start_review('99999999-9999-9999-9999-000000000005', '11111111-1111-1111-1111-000000000008');
-- Role not allowed to start review (AE):
-- CALL sp_start_review('99999999-9999-9999-9999-000000000005', '11111111-1111-1111-1111-000000000005');
-- User without project access (Hira):
-- CALL sp_submit_report('99999999-9999-9999-9999-000000000001', '11111111-1111-1111-1111-000000000009');
-- Disabled project assignment (Zainab on RWP):
-- CALL sp_submit_report('99999999-9999-9999-9999-000000000008', '11111111-1111-1111-1111-000000000010');
-- Reject without comment:
-- CALL sp_reject_report('99999999-9999-9999-9999-000000000005', '11111111-1111-1111-1111-000000000003', '');
-- Approve a report that is only SUBMITTED:
-- CALL sp_approve_report('99999999-9999-9999-9999-000000000005', '11111111-1111-1111-1111-000000000001', NULL);
-- Edit an APPROVED report:
-- UPDATE reports SET title = 'Changed' WHERE id = '99999999-9999-9999-9999-000000000002';
-- Add sections/issues to an APPROVED report:
-- INSERT INTO report_issues (report_id, issue_id) VALUES ('99999999-9999-9999-9999-000000000002', '77777777-7777-7777-7777-000000000015');
-- Issue from another project:
-- INSERT INTO report_issues (report_id, issue_id) VALUES ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000017');
-- Issue from another package (STR issue into FIN report):
-- INSERT INTO report_issues (report_id, issue_id) VALUES ('99999999-9999-9999-9999-000000000003', '77777777-7777-7777-7777-000000000001');
-- Duplicate observation number:
-- INSERT INTO report_issues (report_id, issue_id, observation_no) VALUES ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000015', 1);
-- Issue from an inactive generic issue:
-- INSERT INTO issues (site_location_id, generic_issue_id, reported_by) VALUES ('44444444-4444-4444-4444-000000000104', '66666666-6666-6666-6666-000000000020', '11111111-1111-1111-1111-000000000005');
-- Child location outside parent package (FIN room under STR floor):
-- INSERT INTO site_locations (project_id, package_id, parent_location_id, name, location_type) VALUES ('22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000012', '44444444-4444-4444-4444-000000000104', 'Bad Room', 'ROOM');
-- Package from another project on a report:
-- INSERT INTO reports (project_id, package_id, document_no, title, site_visit_date, created_by) VALUES ('22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000021', 'BAD-001', 'Bad', '2026-10-08', '11111111-1111-1111-1111-000000000005');
-- History is append-only:
-- UPDATE issue_history SET comment = 'tamper';
-- DELETE FROM report_history;
-- Duplicate codes:
-- INSERT INTO projects (project_code, name) VALUES ('NZE-LHR', 'Duplicate');
-- INSERT INTO packages (project_id, package_code, name) VALUES ('22222222-2222-2222-2222-000000000001', 'STR', 'Duplicate');

-- =============================================================================
-- POSITIVE FLOW TESTS
-- =============================================================================
-- Resubmit the rejected report:
-- CALL sp_submit_report('99999999-9999-9999-9999-000000000003', '11111111-1111-1111-1111-000000000005');
-- Auto observation number / display order (expect 12 on R1):
-- INSERT INTO report_issues (report_id, issue_id) VALUES ('99999999-9999-9999-9999-000000000001', '77777777-7777-7777-7777-000000000015');
-- Generic snapshot: create from template with no text (title/description/severity copied):
-- INSERT INTO issues (site_location_id, generic_issue_id, reported_by) VALUES ('44444444-4444-4444-4444-000000000106', '66666666-6666-6666-6666-000000000005', '11111111-1111-1111-1111-000000000005') RETURNING *;
-- Template edits must not change existing issues:
-- UPDATE generic_issues SET default_description = 'CHANGED' WHERE issue_code = 'ARC-001';
-- SELECT description FROM issues WHERE id = '77777777-7777-7777-7777-000000000002';
-- Turn image evidence back on and watch R1 submission fail:
-- UPDATE app_settings SET value = 'true'::jsonb WHERE key = 'require_issue_images_on_submit';
-- CALL sp_submit_report('99999999-9999-9999-9999-000000000001', '11111111-1111-1111-1111-000000000005');
-- Allowed after approval: setting the generated file path
-- UPDATE reports SET generated_file_path = 'reports/QC-NZE-LHR-2026-001.pdf' WHERE id = '99999999-9999-9999-9999-000000000002';
