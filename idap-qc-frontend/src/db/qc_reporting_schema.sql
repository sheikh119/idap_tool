-- =============================================================================
-- QC Reporting Dashboard — PostgreSQL Schema (v2)
-- Source: QC_Reporting_Dashboard_SRS_v2 + ERD_v2 + Business_Logic_v2 + chat context
--
-- Notes
-- -----
-- * role_name values are CONFIRMED (senior review).
-- * All other enums use draft values pending client confirmation.
-- * Soft-archive via is_active / status=ARCHIVED; avoid hard deletes of referenced data.
-- * Workflow actor for history triggers: SET LOCAL app.current_user_id = '<uuid>';
-- * Prefer calling sp_* for report workflow transitions (they set actor + validate).
-- * Section 0 drops existing objects so this file can be re-applied in full.
--   WARNING: re-running destroys all QC schema data.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. TEARDOWN (idempotent re-apply)
-- =============================================================================

-- Views (dependents first)
DROP VIEW IF EXISTS v_dashboard_metrics CASCADE;
DROP VIEW IF EXISTS v_report_observations CASCADE;
DROP VIEW IF EXISTS v_report_summary CASCADE;
DROP VIEW IF EXISTS v_unresolved_issues CASCADE;
DROP VIEW IF EXISTS v_issue_details CASCADE;
DROP VIEW IF EXISTS v_site_location_hierarchy CASCADE;
DROP VIEW IF EXISTS v_user_project_access CASCADE;

-- Routines by name (safe on first run; avoids enum-type signature issues)
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = current_schema()
          AND p.proname IN (
              'sp_reopen_report',
              'sp_reject_report',
              'sp_approve_report',
              'sp_start_review',
              'sp_submit_report',
              'fn_report_payload',
              'fn_role_allowed',
              'fn_assert_active_user',
              'fn_next_report_number',
              'fn_location_path',
              'fn_user_has_project_access',
              'fn_require_current_user',
              'fn_current_user_id',
              'fn_set_updated_at',
              'trg_fn_validate_package_project',
              'trg_fn_validate_location_scope',
              'trg_fn_snapshot_generic_issue',
              'trg_fn_issue_status_history',
              'trg_fn_issue_image_order',
              'trg_fn_report_observation_order',
              'trg_fn_validate_report_issue_scope',
              'trg_fn_validate_report_section_scope',
              'trg_fn_gm_only_report_approval',
              'trg_fn_report_status_timestamps',
              'trg_fn_report_status_history',
              'trg_fn_protect_approved_report',
              'trg_fn_history_append_only',
              'trg_fn_report_section_order'
          )
    LOOP
        EXECUTE format('DROP ROUTINE IF EXISTS %s CASCADE', r.sig);
    END LOOP;
END $$;

-- Tables (children / dependents first; CASCADE clears FKs, indexes, triggers)
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS report_history CASCADE;
DROP TABLE IF EXISTS report_issues CASCADE;
DROP TABLE IF EXISTS report_sections CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS report_templates CASCADE;
DROP TABLE IF EXISTS issue_history CASCADE;
DROP TABLE IF EXISTS issue_images CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS generic_issues CASCADE;
DROP TABLE IF EXISTS issue_categories CASCADE;
DROP TABLE IF EXISTS site_locations CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS user_projects CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enums
DROP TYPE IF EXISTS report_action CASCADE;
DROP TYPE IF EXISTS report_section_type CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
DROP TYPE IF EXISTS issue_severity CASCADE;
DROP TYPE IF EXISTS issue_status CASCADE;
DROP TYPE IF EXISTS location_type CASCADE;
DROP TYPE IF EXISTS package_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS role_name CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

CREATE TYPE role_name AS ENUM (
    'GENERAL_MANAGER',
    'MANAGER',
    'ASSISTANT_MANAGER',
    'ASSISTANT_ENGINEER',
    'INDIVIDUAL_CONSULTANT'
);

CREATE TYPE project_status AS ENUM (
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED',
    'ARCHIVED'
);

CREATE TYPE package_status AS ENUM (
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED',
    'ARCHIVED'
);

CREATE TYPE location_type AS ENUM (
    'SITE',
    'BUILDING',
    'FLOOR',
    'ROOM',
    'ROAD',
    'UTILITY',
    'DRAINAGE',
    'BOUNDARY',
    'LANDSCAPE',
    'EXTERNAL_WORK',
    'ROOFTOP',
    'OTHER'
);

-- Draft lifecycle; confirm RECTIFIED/VERIFIED/CLOSED vs RESOLVED with client
CREATE TYPE issue_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RECTIFIED',
    'VERIFIED',
    'CLOSED',
    'REJECTED'
);

CREATE TYPE issue_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE report_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'REOPENED'
);

CREATE TYPE report_section_type AS ENUM (
    'CRITICAL_OBSERVATIONS',
    'GENERAL_OBSERVATIONS',
    'LOCATION',
    'PROJECT_PROGRESS_SUBMITTAL_STATUS',
    'RISK_ASSESSMENT',
    'RECOMMENDATIONS',
    'OTHER'
);

CREATE TYPE report_action AS ENUM (
    'CREATED',
    'UPDATED',
    'SUBMITTED',
    'REVIEW_STARTED',
    'APPROVED',
    'REJECTED',
    'REOPENED',
    'GENERATED'
);

-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Users & project access (one role per user)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    email           text,
    employee_id     text,
    role_name       role_name NOT NULL,
    department      text NOT NULL DEFAULT 'QC',
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_employee_id UNIQUE (employee_id),
    CONSTRAINT ck_users_email_format CHECK (
        email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
);

CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE projects (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code    text NOT NULL,
    name            text NOT NULL,
    description     text,
    status          project_status NOT NULL DEFAULT 'PLANNING',
    start_date      date,
    end_date        date,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_projects_code UNIQUE (project_code),
    CONSTRAINT ck_projects_dates CHECK (
        end_date IS NULL OR start_date IS NULL OR end_date >= start_date
    )
);

CREATE TABLE user_projects (
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    is_active       boolean NOT NULL DEFAULT true,
    assigned_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, project_id)
);

CREATE TABLE packages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    package_code    text NOT NULL,
    name            text NOT NULL,
    description     text,
    status          package_status NOT NULL DEFAULT 'PLANNING',
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_packages_code_per_project UNIQUE (project_id, package_code)
);

-- -----------------------------------------------------------------------------
-- Site locations (recursive)
-- -----------------------------------------------------------------------------
CREATE TABLE site_locations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    package_id          uuid REFERENCES packages(id) ON DELETE RESTRICT,
    parent_location_id  uuid REFERENCES site_locations(id) ON DELETE RESTRICT,
    name                text NOT NULL,
    location_code       text,
    location_type       location_type NOT NULL DEFAULT 'OTHER',
    description         text,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_site_locations_code_per_project
        UNIQUE (project_id, location_code),
    CONSTRAINT ck_site_locations_not_self_parent
        CHECK (parent_location_id IS NULL OR parent_location_id <> id)
);

-- -----------------------------------------------------------------------------
-- Generic issue catalogue
-- -----------------------------------------------------------------------------
CREATE TABLE issue_categories (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text NOT NULL,
    name            text NOT NULL,
    description     text,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_issue_categories_code UNIQUE (code)
);

CREATE TABLE generic_issues (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id             uuid NOT NULL REFERENCES issue_categories(id) ON DELETE RESTRICT,
    parent_issue_id         uuid REFERENCES generic_issues(id) ON DELETE RESTRICT,
    issue_code              text NOT NULL,
    title                   text NOT NULL,
    default_description     text NOT NULL,
    default_root_cause      text,
    default_risk_text       text,
    default_severity        issue_severity,
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_generic_issues_code UNIQUE (issue_code),
    CONSTRAINT ck_generic_issues_not_self_parent
        CHECK (parent_issue_id IS NULL OR parent_issue_id <> id)
);

-- -----------------------------------------------------------------------------
-- Issues, images, history
-- -----------------------------------------------------------------------------
CREATE TABLE issues (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_location_id    uuid NOT NULL REFERENCES site_locations(id) ON DELETE RESTRICT,
    generic_issue_id    uuid REFERENCES generic_issues(id) ON DELETE SET NULL,
    reported_by         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title               text NOT NULL,
    description         text NOT NULL,
    root_cause          text,
    risk_description    text,
    severity            issue_severity NOT NULL DEFAULT 'MEDIUM',
    status              issue_status NOT NULL DEFAULT 'OPEN',
    location_details    text,
    observed_at         timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issue_images (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id                uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    uploaded_by             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    storage_path            text NOT NULL,
    annotated_storage_path  text,
    original_filename       text NOT NULL,
    mime_type               text NOT NULL,
    file_size               bigint NOT NULL,
    caption                 text,
    display_order           integer NOT NULL DEFAULT 0,
    created_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_issue_images_mime
        CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT ck_issue_images_file_size
        CHECK (file_size > 0),
    CONSTRAINT ck_issue_images_display_order
        CHECK (display_order > 0),
    CONSTRAINT uq_issue_images_order
        UNIQUE (issue_id, display_order)
);

CREATE TABLE issue_history (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    changed_by      uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    old_status      issue_status,
    new_status      issue_status NOT NULL,
    comment         text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Report templates & reports
-- -----------------------------------------------------------------------------
CREATE TABLE report_templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    version         text NOT NULL,
    template_path   text,
    template_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_report_templates_name_version UNIQUE (name, version)
);

CREATE TABLE reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    package_id          uuid REFERENCES packages(id) ON DELETE RESTRICT,
    report_template_id  uuid REFERENCES report_templates(id) ON DELETE RESTRICT,
    document_no         text NOT NULL,
    title               text NOT NULL,
    site_visit_date     date NOT NULL,
    created_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status              report_status NOT NULL DEFAULT 'DRAFT',
    submitted_at        timestamptz,
    reviewed_by         uuid REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_at         timestamptz,
    review_comments     text,
    approved_by         uuid REFERENCES users(id) ON DELETE RESTRICT,
    approved_at         timestamptz,
    generated_file_path text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_reports_document_no UNIQUE (document_no),
    CONSTRAINT ck_reports_approved_fields CHECK (
        (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        OR
        (status <> 'APPROVED' AND approved_by IS NULL AND approved_at IS NULL)
    ),
    CONSTRAINT ck_reports_submitted_ts CHECK (
        (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REOPENED')
            AND submitted_at IS NOT NULL)
        OR status IN ('DRAFT')
        OR submitted_at IS NULL
    )
);

CREATE TABLE report_sections (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id           uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    parent_section_id   uuid REFERENCES report_sections(id) ON DELETE CASCADE,
    site_location_id    uuid REFERENCES site_locations(id) ON DELETE RESTRICT,
    section_type        report_section_type NOT NULL,
    heading             text,
    body_text           text,
    display_order       integer NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_report_sections_not_self_parent
        CHECK (parent_section_id IS NULL OR parent_section_id <> id),
    CONSTRAINT ck_report_sections_display_order
        CHECK (display_order > 0),
    CONSTRAINT uq_report_sections_order
        UNIQUE (report_id, display_order)
);

CREATE TABLE report_issues (
    report_id       uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    issue_id        uuid NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
    section_id      uuid REFERENCES report_sections(id) ON DELETE SET NULL,
    observation_no  integer NOT NULL DEFAULT 0,
    display_order   integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (report_id, issue_id),
    CONSTRAINT ck_report_issues_observation_no CHECK (observation_no > 0),
    CONSTRAINT ck_report_issues_display_order CHECK (display_order > 0),
    CONSTRAINT uq_report_issues_observation_no UNIQUE (report_id, observation_no),
    CONSTRAINT uq_report_issues_display_order UNIQUE (report_id, display_order)
);

CREATE TABLE report_history (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    action_by       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action          report_action NOT NULL,
    old_status      report_status,
    new_status      report_status,
    comment         text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Optional app setting: require image evidence on submit
CREATE TABLE app_settings (
    key         text PRIMARY KEY,
    value       jsonb NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
    ('require_issue_images_on_submit', 'true'::jsonb),
    ('allowed_review_start_roles', '["GENERAL_MANAGER","MANAGER","ASSISTANT_MANAGER"]'::jsonb),
    ('allowed_reject_roles', '["GENERAL_MANAGER","MANAGER","ASSISTANT_MANAGER"]'::jsonb);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- FK / filter indexes
CREATE INDEX idx_user_projects_project ON user_projects (project_id) WHERE is_active;
CREATE INDEX idx_packages_project ON packages (project_id);
CREATE INDEX idx_site_locations_project ON site_locations (project_id);
CREATE INDEX idx_site_locations_package ON site_locations (package_id) WHERE package_id IS NOT NULL;
CREATE INDEX idx_site_locations_parent ON site_locations (parent_location_id) WHERE parent_location_id IS NOT NULL;
CREATE INDEX idx_site_locations_type ON site_locations (location_type);

CREATE INDEX idx_generic_issues_category ON generic_issues (category_id);
CREATE INDEX idx_generic_issues_parent ON generic_issues (parent_issue_id) WHERE parent_issue_id IS NOT NULL;
CREATE INDEX idx_generic_issues_active ON generic_issues (is_active) WHERE is_active;

CREATE INDEX idx_issues_site_location ON issues (site_location_id);
CREATE INDEX idx_issues_reported_by ON issues (reported_by);
CREATE INDEX idx_issues_generic ON issues (generic_issue_id) WHERE generic_issue_id IS NOT NULL;
CREATE INDEX idx_issues_status ON issues (status);
CREATE INDEX idx_issues_severity ON issues (severity);
CREATE INDEX idx_issues_observed_at ON issues (observed_at DESC);
CREATE INDEX idx_issues_status_severity ON issues (status, severity);

CREATE INDEX idx_issue_images_issue ON issue_images (issue_id, display_order);
CREATE INDEX idx_issue_history_issue ON issue_history (issue_id, created_at DESC);

CREATE INDEX idx_reports_project ON reports (project_id);
CREATE INDEX idx_reports_package ON reports (package_id) WHERE package_id IS NOT NULL;
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_created_by ON reports (created_by);
CREATE INDEX idx_reports_site_visit_date ON reports (site_visit_date DESC);
CREATE INDEX idx_reports_project_status ON reports (project_id, status);

CREATE INDEX idx_report_sections_report ON report_sections (report_id, display_order);
CREATE INDEX idx_report_sections_parent ON report_sections (parent_section_id) WHERE parent_section_id IS NOT NULL;
CREATE INDEX idx_report_issues_issue ON report_issues (issue_id);
CREATE INDEX idx_report_issues_section ON report_issues (section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_report_history_report ON report_history (report_id, created_at DESC);

-- Full-text search on issue content
ALTER TABLE issues ADD COLUMN search_tsv tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(root_cause, '')), 'C')
    ) STORED;

CREATE INDEX idx_issues_search_tsv ON issues USING gin (search_tsv);

-- =============================================================================
-- 4. SESSION / HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v text;
BEGIN
    v := nullif(current_setting('app.current_user_id', true), '');
    IF v IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN v::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION fn_require_current_user()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    uid uuid := fn_current_user_id();
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'app.current_user_id is not set for this transaction'
            USING ERRCODE = 'P0001';
    END IF;
    RETURN uid;
END;
$$;

CREATE OR REPLACE FUNCTION fn_user_has_project_access(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN user_projects up ON up.user_id = u.id
        WHERE u.id = p_user_id
          AND u.is_active
          AND up.project_id = p_project_id
          AND up.is_active
    );
$$;

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_location_path(p_location_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    WITH RECURSIVE loc AS (
        SELECT
            sl.id,
            sl.parent_location_id,
            sl.name,
            sl.project_id,
            sl.package_id,
            1 AS depth
        FROM site_locations sl
        WHERE sl.id = p_location_id

        UNION ALL

        SELECT
            p.id,
            p.parent_location_id,
            p.name,
            p.project_id,
            p.package_id,
            loc.depth + 1
        FROM site_locations p
        JOIN loc ON loc.parent_location_id = p.id
    ),
    ordered AS (
        SELECT name, depth FROM loc ORDER BY depth DESC
    ),
    path AS (
        SELECT string_agg(name, ' / ' ORDER BY depth DESC) AS location_path
        FROM ordered
    )
    SELECT
        trim(both ' / ' FROM concat_ws(
            ' / ',
            pr.name,
            pk.name,
            path.location_path
        ))
    FROM path
    CROSS JOIN LATERAL (
        SELECT project_id, package_id
        FROM site_locations
        WHERE id = p_location_id
    ) root
    JOIN projects pr ON pr.id = root.project_id
    LEFT JOIN packages pk ON pk.id = root.package_id;
$$;

CREATE OR REPLACE FUNCTION fn_next_report_number(p_project_id uuid, p_visit_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_code text;
    v_prefix text;
    v_seq int;
    v_doc text;
BEGIN
    SELECT project_code INTO v_code
    FROM projects
    WHERE id = p_project_id;

    IF v_code IS NULL THEN
        RAISE EXCEPTION 'Project % not found', p_project_id;
    END IF;

    v_prefix := format('QC-%s-%s-', upper(v_code), to_char(p_visit_date, 'YYYY'));

    SELECT coalesce(max(
        CASE
            WHEN document_no ~ ('^' || v_prefix || '[0-9]+$')
            THEN substring(document_no FROM length(v_prefix) + 1)::int
            ELSE 0
        END
    ), 0) + 1
    INTO v_seq
    FROM reports
    WHERE project_id = p_project_id
      AND document_no LIKE v_prefix || '%';

    v_doc := v_prefix || lpad(v_seq::text, 3, '0');
    RETURN v_doc;
END;
$$;

-- =============================================================================
-- 5. TRIGGER FUNCTIONS — validation / automation
-- =============================================================================

-- Package must belong to report/location project
CREATE OR REPLACE FUNCTION trg_fn_validate_package_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_id uuid;
BEGIN
    IF NEW.package_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT project_id INTO v_project_id
    FROM packages
    WHERE id = NEW.package_id;

    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'Package % does not exist', NEW.package_id;
    END IF;

    IF v_project_id <> NEW.project_id THEN
        RAISE EXCEPTION 'Package % does not belong to project %', NEW.package_id, NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_validate_location_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_parent site_locations%ROWTYPE;
    v_pkg_project uuid;
BEGIN
    IF NEW.package_id IS NOT NULL THEN
        SELECT project_id INTO v_pkg_project
        FROM packages WHERE id = NEW.package_id;

        IF v_pkg_project IS DISTINCT FROM NEW.project_id THEN
            RAISE EXCEPTION 'site_locations.package_id must belong to site_locations.project_id';
        END IF;
    END IF;

    IF NEW.parent_location_id IS NOT NULL THEN
        SELECT * INTO v_parent
        FROM site_locations
        WHERE id = NEW.parent_location_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent location % not found', NEW.parent_location_id;
        END IF;

        IF v_parent.project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Child location project must match parent project';
        END IF;

        -- Child package must match parent package when parent is package-scoped
        IF v_parent.package_id IS NOT NULL
           AND NEW.package_id IS DISTINCT FROM v_parent.package_id THEN
            RAISE EXCEPTION 'Child location package must match parent package scope';
        END IF;

        -- If parent has no package, child may introduce package only under same project (already checked)
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_snapshot_generic_issue()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    g generic_issues%ROWTYPE;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.generic_issue_id IS NOT NULL THEN
        SELECT * INTO g FROM generic_issues WHERE id = NEW.generic_issue_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'generic_issue % not found', NEW.generic_issue_id;
        END IF;

        IF NOT g.is_active THEN
            RAISE EXCEPTION 'generic_issue % is inactive', NEW.generic_issue_id;
        END IF;

        -- Copy defaults only when caller left fields empty / defaulted
        IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
            NEW.title := g.title;
        END IF;
        IF NEW.description IS NULL OR btrim(NEW.description) = '' THEN
            NEW.description := g.default_description;
        END IF;
        IF NEW.root_cause IS NULL THEN
            NEW.root_cause := g.default_root_cause;
        END IF;
        IF NEW.risk_description IS NULL THEN
            NEW.risk_description := g.default_risk_text;
        END IF;
        IF NEW.severity IS NULL AND g.default_severity IS NOT NULL THEN
            NEW.severity := g.default_severity;
        ELSIF TG_OP = 'INSERT'
              AND NEW.severity = 'MEDIUM'::issue_severity
              AND g.default_severity IS NOT NULL
              AND g.default_severity IS DISTINCT FROM 'MEDIUM'::issue_severity THEN
            -- If insert used column default MEDIUM, prefer catalogue severity when present
            NEW.severity := g.default_severity;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_issue_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor uuid;
BEGIN
    IF TG_OP = 'INSERT' THEN
        actor := coalesce(fn_current_user_id(), NEW.reported_by);
        INSERT INTO issue_history (issue_id, changed_by, old_status, new_status, comment)
        VALUES (NEW.id, actor, NULL, NEW.status, 'Issue created');
        RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        actor := coalesce(fn_current_user_id(), NEW.reported_by);
        INSERT INTO issue_history (issue_id, changed_by, old_status, new_status, comment)
        VALUES (NEW.id, actor, OLD.status, NEW.status, NULL);
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_issue_image_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
        SELECT coalesce(max(display_order), 0) + 1
        INTO NEW.display_order
        FROM issue_images
        WHERE issue_id = NEW.issue_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_report_observation_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.observation_no IS NULL OR NEW.observation_no = 0 THEN
        SELECT coalesce(max(observation_no), 0) + 1
        INTO NEW.observation_no
        FROM report_issues
        WHERE report_id = NEW.report_id;
    END IF;

    IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
        SELECT coalesce(max(display_order), 0) + 1
        INTO NEW.display_order
        FROM report_issues
        WHERE report_id = NEW.report_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_validate_report_issue_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    r reports%ROWTYPE;
    v_project_id uuid;
    v_package_id uuid;
    v_section_report uuid;
BEGIN
    SELECT * INTO r FROM reports WHERE id = NEW.report_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', NEW.report_id;
    END IF;

    IF r.status IN ('APPROVED') THEN
        RAISE EXCEPTION 'Cannot modify issues on an APPROVED report';
    END IF;

    SELECT sl.project_id, sl.package_id
    INTO v_project_id, v_package_id
    FROM issues i
    JOIN site_locations sl ON sl.id = i.site_location_id
    WHERE i.id = NEW.issue_id;

    IF v_project_id IS DISTINCT FROM r.project_id THEN
        RAISE EXCEPTION 'Issue % project does not match report project', NEW.issue_id;
    END IF;

    IF r.package_id IS NOT NULL
       AND v_package_id IS DISTINCT FROM r.package_id THEN
        RAISE EXCEPTION 'Issue % package does not match report package scope', NEW.issue_id;
    END IF;

    IF NEW.section_id IS NOT NULL THEN
        SELECT report_id INTO v_section_report
        FROM report_sections
        WHERE id = NEW.section_id;

        IF v_section_report IS DISTINCT FROM NEW.report_id THEN
            RAISE EXCEPTION 'section_id must belong to the same report';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_validate_report_section_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    r reports%ROWTYPE;
    v_loc_project uuid;
    v_loc_package uuid;
    v_parent_report uuid;
BEGIN
    SELECT * INTO r FROM reports WHERE id = NEW.report_id;

    IF r.status = 'APPROVED' AND TG_OP IN ('INSERT', 'UPDATE') THEN
        RAISE EXCEPTION 'Cannot modify sections of an APPROVED report';
    END IF;

    IF NEW.parent_section_id IS NOT NULL THEN
        SELECT report_id INTO v_parent_report
        FROM report_sections WHERE id = NEW.parent_section_id;

        IF v_parent_report IS DISTINCT FROM NEW.report_id THEN
            RAISE EXCEPTION 'parent_section_id must belong to the same report';
        END IF;
    END IF;

    IF NEW.site_location_id IS NOT NULL THEN
        SELECT project_id, package_id
        INTO v_loc_project, v_loc_package
        FROM site_locations
        WHERE id = NEW.site_location_id;

        IF v_loc_project IS DISTINCT FROM r.project_id THEN
            RAISE EXCEPTION 'Section location project must match report project';
        END IF;

        IF r.package_id IS NOT NULL
           AND v_loc_package IS DISTINCT FROM r.package_id THEN
            RAISE EXCEPTION 'Section location package must match report package scope';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_gm_only_report_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_role role_name;
    v_active boolean;
BEGIN
    IF NEW.status = 'APPROVED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'APPROVED') THEN
        IF NEW.approved_by IS NULL THEN
            RAISE EXCEPTION 'approved_by is required when status = APPROVED';
        END IF;

        SELECT role_name, is_active
        INTO v_role, v_active
        FROM users
        WHERE id = NEW.approved_by;

        IF NOT FOUND OR NOT v_active OR v_role <> 'GENERAL_MANAGER' THEN
            RAISE EXCEPTION 'Only an active GENERAL_MANAGER may approve a report';
        END IF;

        IF NOT fn_user_has_project_access(NEW.approved_by, NEW.project_id) THEN
            RAISE EXCEPTION 'Approver lacks project access';
        END IF;
    END IF;

    IF NEW.status IS DISTINCT FROM 'APPROVED' THEN
        NEW.approved_by := NULL;
        NEW.approved_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_report_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'SUBMITTED' THEN
            NEW.submitted_at := coalesce(NEW.submitted_at, now());
        ELSIF NEW.status = 'UNDER_REVIEW' THEN
            NEW.reviewed_at := coalesce(NEW.reviewed_at, now());
        ELSIF NEW.status = 'APPROVED' THEN
            NEW.approved_at := coalesce(NEW.approved_at, now());
        ELSIF NEW.status = 'REJECTED' THEN
            NEW.reviewed_at := coalesce(NEW.reviewed_at, now());
        ELSIF NEW.status IN ('DRAFT', 'REOPENED') THEN
            -- keep historical submitted_at; clear approval
            NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_report_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor uuid;
    act report_action;
BEGIN
    IF TG_OP = 'INSERT' THEN
        actor := coalesce(fn_current_user_id(), NEW.created_by);
        INSERT INTO report_history (report_id, action_by, action, old_status, new_status, comment)
        VALUES (NEW.id, actor, 'CREATED', NULL, NEW.status, NULL);
        RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        actor := coalesce(fn_current_user_id(), NEW.created_by);

        act := CASE NEW.status
            WHEN 'SUBMITTED' THEN 'SUBMITTED'::report_action
            WHEN 'UNDER_REVIEW' THEN 'REVIEW_STARTED'::report_action
            WHEN 'APPROVED' THEN 'APPROVED'::report_action
            WHEN 'REJECTED' THEN 'REJECTED'::report_action
            WHEN 'REOPENED' THEN 'REOPENED'::report_action
            ELSE 'UPDATED'::report_action
        END;

        INSERT INTO report_history (report_id, action_by, action, old_status, new_status, comment)
        VALUES (
            NEW.id,
            actor,
            act,
            OLD.status,
            NEW.status,
            CASE WHEN NEW.status = 'REJECTED' THEN NEW.review_comments ELSE NULL END
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_protect_approved_report()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'APPROVED' THEN
            RAISE EXCEPTION 'APPROVED reports cannot be deleted';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status = 'APPROVED' THEN
        -- Allow only generated_file_path / updated_at refresh after generation
        IF NEW.document_no IS DISTINCT FROM OLD.document_no
           OR NEW.title IS DISTINCT FROM OLD.title
           OR NEW.site_visit_date IS DISTINCT FROM OLD.site_visit_date
           OR NEW.project_id IS DISTINCT FROM OLD.project_id
           OR NEW.package_id IS DISTINCT FROM OLD.package_id
           OR NEW.report_template_id IS DISTINCT FROM OLD.report_template_id
           OR NEW.created_by IS DISTINCT FROM OLD.created_by
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
           OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
           OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
        THEN
            RAISE EXCEPTION 'APPROVED reports are immutable (except generated_file_path)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_history_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'History tables are append-only';
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_report_section_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
        SELECT coalesce(max(display_order), 0) + 1
        INTO NEW.display_order
        FROM report_sections
        WHERE report_id = NEW.report_id;
    END IF;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 6. ATTACH TRIGGERS
-- =============================================================================

-- updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_packages_updated_at
    BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_site_locations_updated_at
    BEFORE UPDATE ON site_locations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_issue_categories_updated_at
    BEFORE UPDATE ON issue_categories
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_generic_issues_updated_at
    BEFORE UPDATE ON generic_issues
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_report_sections_updated_at
    BEFORE UPDATE ON report_sections
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Scope validation
CREATE TRIGGER trg_reports_validate_package
    BEFORE INSERT OR UPDATE OF project_id, package_id ON reports
    FOR EACH ROW EXECUTE FUNCTION trg_fn_validate_package_project();

CREATE TRIGGER trg_validate_location_scope
    BEFORE INSERT OR UPDATE OF project_id, package_id, parent_location_id ON site_locations
    FOR EACH ROW EXECUTE FUNCTION trg_fn_validate_location_scope();

CREATE TRIGGER trg_snapshot_generic_issue
    BEFORE INSERT ON issues
    FOR EACH ROW EXECUTE FUNCTION trg_fn_snapshot_generic_issue();

CREATE TRIGGER trg_issue_status_history
    AFTER INSERT OR UPDATE OF status ON issues
    FOR EACH ROW EXECUTE FUNCTION trg_fn_issue_status_history();

CREATE TRIGGER trg_issue_image_order
    BEFORE INSERT ON issue_images
    FOR EACH ROW EXECUTE FUNCTION trg_fn_issue_image_order();

CREATE TRIGGER trg_report_observation_order
    BEFORE INSERT ON report_issues
    FOR EACH ROW EXECUTE FUNCTION trg_fn_report_observation_order();

CREATE TRIGGER trg_validate_report_issue_scope
    BEFORE INSERT OR UPDATE ON report_issues
    FOR EACH ROW EXECUTE FUNCTION trg_fn_validate_report_issue_scope();

CREATE TRIGGER trg_report_section_order
    BEFORE INSERT ON report_sections
    FOR EACH ROW EXECUTE FUNCTION trg_fn_report_section_order();

CREATE TRIGGER trg_validate_report_section_scope
    BEFORE INSERT OR UPDATE ON report_sections
    FOR EACH ROW EXECUTE FUNCTION trg_fn_validate_report_section_scope();

CREATE TRIGGER trg_gm_only_report_approval
    BEFORE INSERT OR UPDATE OF status, approved_by ON reports
    FOR EACH ROW EXECUTE FUNCTION trg_fn_gm_only_report_approval();

CREATE TRIGGER trg_report_status_timestamps
    BEFORE UPDATE OF status ON reports
    FOR EACH ROW EXECUTE FUNCTION trg_fn_report_status_timestamps();

CREATE TRIGGER trg_report_status_history
    AFTER INSERT OR UPDATE OF status ON reports
    FOR EACH ROW EXECUTE FUNCTION trg_fn_report_status_history();

CREATE TRIGGER trg_protect_approved_report
    BEFORE UPDATE OR DELETE ON reports
    FOR EACH ROW EXECUTE FUNCTION trg_fn_protect_approved_report();

CREATE TRIGGER trg_issue_history_append_only
    BEFORE UPDATE OR DELETE ON issue_history
    FOR EACH ROW EXECUTE FUNCTION trg_fn_history_append_only();

CREATE TRIGGER trg_report_history_append_only
    BEFORE UPDATE OR DELETE ON report_history
    FOR EACH ROW EXECUTE FUNCTION trg_fn_history_append_only();

-- =============================================================================
-- 7. WORKFLOW PROCEDURES
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_assert_active_user(p_user_id uuid)
RETURNS users
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    u users%ROWTYPE;
BEGIN
    SELECT * INTO u FROM users WHERE id = p_user_id;
    IF NOT FOUND OR NOT u.is_active THEN
        RAISE EXCEPTION 'User % is missing or inactive', p_user_id;
    END IF;
    RETURN u;
END;
$$;

CREATE OR REPLACE FUNCTION fn_role_allowed(p_role role_name, p_setting_key text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM app_settings s,
             jsonb_array_elements_text(s.value) AS role
        WHERE s.key = p_setting_key
          AND role = p_role::text
    );
$$;

CREATE OR REPLACE PROCEDURE sp_submit_report(p_report_id uuid, p_user_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
    r reports%ROWTYPE;
    u users%ROWTYPE;
    v_issue_count int;
    v_missing_images int;
    v_require_images boolean;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, true);
    u := fn_assert_active_user(p_user_id);

    SELECT * INTO r FROM reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    IF r.status NOT IN ('DRAFT', 'REJECTED', 'REOPENED') THEN
        RAISE EXCEPTION 'Report must be DRAFT, REJECTED or REOPENED to submit (current: %)', r.status;
    END IF;

    IF NOT fn_user_has_project_access(p_user_id, r.project_id) THEN
        RAISE EXCEPTION 'User lacks project access';
    END IF;

    IF r.title IS NULL OR btrim(r.title) = '' OR r.site_visit_date IS NULL THEN
        RAISE EXCEPTION 'Report metadata incomplete';
    END IF;

    SELECT count(*) INTO v_issue_count
    FROM report_issues WHERE report_id = p_report_id;

    IF v_issue_count < 1 THEN
        RAISE EXCEPTION 'Report must contain at least one issue';
    END IF;

    SELECT (value)::boolean INTO v_require_images
    FROM app_settings WHERE key = 'require_issue_images_on_submit';

    IF coalesce(v_require_images, true) THEN
        SELECT count(*) INTO v_missing_images
        FROM report_issues ri
        WHERE ri.report_id = p_report_id
          AND NOT EXISTS (
              SELECT 1 FROM issue_images ii WHERE ii.issue_id = ri.issue_id
          );

        IF v_missing_images > 0 THEN
            RAISE EXCEPTION '% observation(s) lack image evidence', v_missing_images;
        END IF;
    END IF;

    UPDATE reports
    SET status = 'SUBMITTED',
        submitted_at = now(),
        review_comments = NULL
    WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_start_review(p_report_id uuid, p_reviewer_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
    r reports%ROWTYPE;
    u users%ROWTYPE;
BEGIN
    PERFORM set_config('app.current_user_id', p_reviewer_id::text, true);
    u := fn_assert_active_user(p_reviewer_id);

    IF NOT fn_role_allowed(u.role_name, 'allowed_review_start_roles') THEN
        RAISE EXCEPTION 'Role % may not start review', u.role_name;
    END IF;

    SELECT * INTO r FROM reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    IF r.status <> 'SUBMITTED' THEN
        RAISE EXCEPTION 'Report must be SUBMITTED to start review (current: %)', r.status;
    END IF;

    IF NOT fn_user_has_project_access(p_reviewer_id, r.project_id) THEN
        RAISE EXCEPTION 'Reviewer lacks project access';
    END IF;

    UPDATE reports
    SET status = 'UNDER_REVIEW',
        reviewed_by = p_reviewer_id,
        reviewed_at = now()
    WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_approve_report(
    p_report_id uuid,
    p_gm_user_id uuid,
    p_comment text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    r reports%ROWTYPE;
    u users%ROWTYPE;
BEGIN
    PERFORM set_config('app.current_user_id', p_gm_user_id::text, true);
    u := fn_assert_active_user(p_gm_user_id);

    IF u.role_name <> 'GENERAL_MANAGER' THEN
        RAISE EXCEPTION 'Only GENERAL_MANAGER may approve reports';
    END IF;

    SELECT * INTO r FROM reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    IF r.status <> 'UNDER_REVIEW' THEN
        RAISE EXCEPTION 'Report must be UNDER_REVIEW to approve (current: %)', r.status;
    END IF;

    IF NOT fn_user_has_project_access(p_gm_user_id, r.project_id) THEN
        RAISE EXCEPTION 'Approver lacks project access';
    END IF;

    UPDATE reports
    SET status = 'APPROVED',
        approved_by = p_gm_user_id,
        approved_at = now(),
        review_comments = p_comment
    WHERE id = p_report_id;

    IF p_comment IS NOT NULL THEN
        INSERT INTO report_history (report_id, action_by, action, old_status, new_status, comment)
        VALUES (p_report_id, p_gm_user_id, 'UPDATED', 'APPROVED', 'APPROVED', p_comment);
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_reject_report(
    p_report_id uuid,
    p_user_id uuid,
    p_comment text
)
LANGUAGE plpgsql
AS $$
DECLARE
    r reports%ROWTYPE;
    u users%ROWTYPE;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, true);
    u := fn_assert_active_user(p_user_id);

    IF p_comment IS NULL OR btrim(p_comment) = '' THEN
        RAISE EXCEPTION 'Rejection comment is required';
    END IF;

    IF NOT fn_role_allowed(u.role_name, 'allowed_reject_roles') THEN
        RAISE EXCEPTION 'Role % may not reject reports', u.role_name;
    END IF;

    SELECT * INTO r FROM reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    IF r.status NOT IN ('SUBMITTED', 'UNDER_REVIEW') THEN
        RAISE EXCEPTION 'Report must be SUBMITTED or UNDER_REVIEW to reject (current: %)', r.status;
    END IF;

    IF NOT fn_user_has_project_access(p_user_id, r.project_id) THEN
        RAISE EXCEPTION 'User lacks project access';
    END IF;

    UPDATE reports
    SET status = 'REJECTED',
        reviewed_by = p_user_id,
        reviewed_at = now(),
        review_comments = p_comment,
        approved_by = NULL,
        approved_at = NULL
    WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_reopen_report(
    p_report_id uuid,
    p_user_id uuid,
    p_comment text
)
LANGUAGE plpgsql
AS $$
DECLARE
    r reports%ROWTYPE;
    u users%ROWTYPE;
BEGIN
    -- Optional; confirm with client whether reopen is allowed and by whom.
    PERFORM set_config('app.current_user_id', p_user_id::text, true);
    u := fn_assert_active_user(p_user_id);

    IF u.role_name <> 'GENERAL_MANAGER' THEN
        RAISE EXCEPTION 'Only GENERAL_MANAGER may reopen reports (pending client confirmation)';
    END IF;

    IF p_comment IS NULL OR btrim(p_comment) = '' THEN
        RAISE EXCEPTION 'Reopen comment is required';
    END IF;

    SELECT * INTO r FROM reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    IF r.status <> 'APPROVED' THEN
        RAISE EXCEPTION 'Only APPROVED reports can be reopened';
    END IF;

    -- Bypass immutability by temporarily changing via direct fields allowed path:
    -- protect trigger blocks status change from APPROVED; use a controlled update
    -- that the protect trigger must allow for reopen.
    -- We update protect function behavior: allow status APPROVED -> REOPENED when comment set.
    UPDATE reports
    SET status = 'REOPENED',
        approved_by = NULL,
        approved_at = NULL,
        review_comments = p_comment
    WHERE id = p_report_id;
END;
$$;

-- Adjust protect trigger to allow APPROVED -> REOPENED
CREATE OR REPLACE FUNCTION trg_fn_protect_approved_report()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'APPROVED' THEN
            RAISE EXCEPTION 'APPROVED reports cannot be deleted';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status = 'APPROVED' AND NEW.status = 'REOPENED' THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'APPROVED' THEN
        IF NEW.document_no IS DISTINCT FROM OLD.document_no
           OR NEW.title IS DISTINCT FROM OLD.title
           OR NEW.site_visit_date IS DISTINCT FROM OLD.site_visit_date
           OR NEW.project_id IS DISTINCT FROM OLD.project_id
           OR NEW.package_id IS DISTINCT FROM OLD.package_id
           OR NEW.report_template_id IS DISTINCT FROM OLD.report_template_id
           OR NEW.created_by IS DISTINCT FROM OLD.created_by
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
           OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
           OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
        THEN
            RAISE EXCEPTION 'APPROVED reports are immutable (except generated_file_path or reopen)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_report_payload(p_report_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    WITH sections AS (
        SELECT
            rs.id,
            rs.parent_section_id,
            rs.section_type,
            rs.heading,
            rs.body_text,
            rs.display_order,
            rs.site_location_id,
            CASE WHEN rs.site_location_id IS NOT NULL
                 THEN fn_location_path(rs.site_location_id)
                 ELSE NULL
            END AS location_path
        FROM report_sections rs
        WHERE rs.report_id = p_report_id
    ),
    observations AS (
        SELECT
            ri.report_id,
            ri.section_id,
            ri.observation_no,
            ri.display_order,
            i.id AS issue_id,
            i.title,
            i.description,
            i.root_cause,
            i.risk_description,
            i.severity,
            i.status,
            i.location_details,
            fn_location_path(i.site_location_id) AS location_path,
            coalesce(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', ii.id,
                            'storage_path', ii.storage_path,
                            'annotated_storage_path', ii.annotated_storage_path,
                            'effective_path', coalesce(ii.annotated_storage_path, ii.storage_path),
                            'caption', ii.caption,
                            'display_order', ii.display_order,
                            'mime_type', ii.mime_type
                        )
                        ORDER BY ii.display_order
                    )
                    FROM issue_images ii
                    WHERE ii.issue_id = i.id
                ),
                '[]'::jsonb
            ) AS images
        FROM report_issues ri
        JOIN issues i ON i.id = ri.issue_id
        WHERE ri.report_id = p_report_id
    )
    SELECT jsonb_build_object(
        'report', to_jsonb(r),
        'project', to_jsonb(p),
        'package', to_jsonb(pk),
        'template', to_jsonb(rt),
        'sections', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.display_order) FROM sections s), '[]'::jsonb),
        'observations', coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.display_order) FROM observations o), '[]'::jsonb)
    )
    FROM reports r
    JOIN projects p ON p.id = r.project_id
    LEFT JOIN packages pk ON pk.id = r.package_id
    LEFT JOIN report_templates rt ON rt.id = r.report_template_id
    WHERE r.id = p_report_id;
$$;

-- =============================================================================
-- 8. VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW v_user_project_access AS
SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.email,
    u.employee_id,
    u.role_name,
    u.department,
    u.is_active AS user_is_active,
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    p.status AS project_status,
    up.is_active AS assignment_is_active,
    up.assigned_at
FROM users u
JOIN user_projects up ON up.user_id = u.id
JOIN projects p ON p.id = up.project_id;

CREATE OR REPLACE VIEW v_site_location_hierarchy AS
SELECT
    sl.id AS location_id,
    sl.name AS location_name,
    sl.location_code,
    sl.location_type,
    sl.project_id,
    pr.project_code,
    pr.name AS project_name,
    sl.package_id,
    pk.package_code,
    pk.name AS package_name,
    sl.parent_location_id,
    fn_location_path(sl.id) AS full_path,
    sl.is_active
FROM site_locations sl
JOIN projects pr ON pr.id = sl.project_id
LEFT JOIN packages pk ON pk.id = sl.package_id;

CREATE OR REPLACE VIEW v_issue_details AS
SELECT
    i.id AS issue_id,
    i.title,
    i.description,
    i.root_cause,
    i.risk_description,
    i.severity,
    i.status,
    i.location_details,
    i.observed_at,
    i.created_at,
    i.updated_at,
    i.reported_by,
    u.name AS reporter_name,
    u.role_name AS reporter_role,
    i.generic_issue_id,
    gi.issue_code AS generic_issue_code,
    gi.title AS generic_issue_title,
    ic.id AS category_id,
    ic.code AS category_code,
    ic.name AS category_name,
    sl.id AS site_location_id,
    sl.name AS site_location_name,
    sl.location_type,
    fn_location_path(sl.id) AS location_path,
    pr.id AS project_id,
    pr.project_code,
    pr.name AS project_name,
    pk.id AS package_id,
    pk.package_code,
    pk.name AS package_name,
    (
        SELECT count(*)::int
        FROM issue_images ii
        WHERE ii.issue_id = i.id
    ) AS image_count
FROM issues i
JOIN users u ON u.id = i.reported_by
JOIN site_locations sl ON sl.id = i.site_location_id
JOIN projects pr ON pr.id = sl.project_id
LEFT JOIN packages pk ON pk.id = sl.package_id
LEFT JOIN generic_issues gi ON gi.id = i.generic_issue_id
LEFT JOIN issue_categories ic ON ic.id = gi.category_id;

CREATE OR REPLACE VIEW v_unresolved_issues AS
SELECT *
FROM v_issue_details
WHERE status IN ('OPEN', 'IN_PROGRESS', 'RECTIFIED', 'VERIFIED');

CREATE OR REPLACE VIEW v_report_summary AS
SELECT
    r.id AS report_id,
    r.document_no,
    r.title,
    r.site_visit_date,
    r.status,
    r.submitted_at,
    r.reviewed_at,
    r.approved_at,
    r.generated_file_path,
    r.created_at,
    r.updated_at,
    r.project_id,
    p.project_code,
    p.name AS project_name,
    r.package_id,
    pk.package_code,
    pk.name AS package_name,
    r.created_by,
    cu.name AS created_by_name,
    r.reviewed_by,
    ru.name AS reviewed_by_name,
    r.approved_by,
    au.name AS approved_by_name,
    au.role_name AS approved_by_role,
    count(ri.issue_id)::int AS issue_count,
    count(*) FILTER (WHERE i.severity = 'CRITICAL')::int AS critical_count,
    count(*) FILTER (WHERE i.severity = 'HIGH')::int AS high_count,
    count(*) FILTER (WHERE i.severity = 'MEDIUM')::int AS medium_count,
    count(*) FILTER (WHERE i.severity = 'LOW')::int AS low_count,
    count(*) FILTER (WHERE i.status = 'OPEN')::int AS open_issue_count,
    count(*) FILTER (WHERE i.status = 'CLOSED')::int AS closed_issue_count
FROM reports r
JOIN projects p ON p.id = r.project_id
LEFT JOIN packages pk ON pk.id = r.package_id
JOIN users cu ON cu.id = r.created_by
LEFT JOIN users ru ON ru.id = r.reviewed_by
LEFT JOIN users au ON au.id = r.approved_by
LEFT JOIN report_issues ri ON ri.report_id = r.id
LEFT JOIN issues i ON i.id = ri.issue_id
GROUP BY
    r.id, p.project_code, p.name, pk.package_code, pk.name,
    cu.name, ru.name, au.name, au.role_name;

CREATE OR REPLACE VIEW v_report_observations AS
SELECT
    r.id AS report_id,
    r.document_no,
    r.status AS report_status,
    rs.id AS section_id,
    rs.section_type,
    rs.heading AS section_heading,
    rs.display_order AS section_display_order,
    ri.observation_no,
    ri.display_order AS observation_display_order,
    i.id AS issue_id,
    i.title AS issue_title,
    i.description AS issue_description,
    i.severity,
    i.status AS issue_status,
    fn_location_path(i.site_location_id) AS location_path,
    (
        SELECT count(*)::int
        FROM issue_images ii
        WHERE ii.issue_id = i.id
    ) AS image_count
FROM reports r
JOIN report_issues ri ON ri.report_id = r.id
JOIN issues i ON i.id = ri.issue_id
LEFT JOIN report_sections rs ON rs.id = ri.section_id
ORDER BY r.document_no, ri.display_order;

CREATE OR REPLACE VIEW v_dashboard_metrics AS
SELECT
    pr.id AS project_id,
    pr.project_code,
    pr.name AS project_name,
    pk.id AS package_id,
    pk.package_code,
    pk.name AS package_name,
    count(DISTINCT i.id)::int AS total_issues,
    count(DISTINCT i.id) FILTER (WHERE i.status = 'OPEN')::int AS open_issues,
    count(DISTINCT i.id) FILTER (WHERE i.status = 'IN_PROGRESS')::int AS in_progress_issues,
    count(DISTINCT i.id) FILTER (WHERE i.status IN ('RECTIFIED', 'VERIFIED'))::int AS rectified_issues,
    count(DISTINCT i.id) FILTER (WHERE i.status = 'CLOSED')::int AS closed_issues,
    count(DISTINCT i.id) FILTER (WHERE i.severity = 'CRITICAL')::int AS critical_issues,
    count(DISTINCT r.id)::int AS total_reports,
    count(DISTINCT r.id) FILTER (WHERE r.status IN ('SUBMITTED', 'UNDER_REVIEW'))::int AS reports_awaiting_review,
    count(DISTINCT r.id) FILTER (WHERE r.status = 'APPROVED')::int AS approved_reports,
    count(DISTINCT r.id) FILTER (WHERE r.status = 'REJECTED')::int AS rejected_reports
FROM projects pr
LEFT JOIN packages pk ON pk.project_id = pr.id
LEFT JOIN site_locations sl
    ON sl.project_id = pr.id
   AND (pk.id IS NULL OR sl.package_id = pk.id OR sl.package_id IS NULL)
LEFT JOIN issues i ON i.site_location_id = sl.id
LEFT JOIN reports r
    ON r.project_id = pr.id
   AND (pk.id IS NULL OR r.package_id = pk.id OR r.package_id IS NULL)
GROUP BY pr.id, pr.project_code, pr.name, pk.id, pk.package_code, pk.name;

-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON TYPE role_name IS 'Confirmed QC roles; only GENERAL_MANAGER may approve reports.';
COMMENT ON TABLE reports IS 'Report grouping; APPROVED reports are immutable except generated_file_path or formal reopen.';
COMMENT ON COLUMN reports.approved_by IS 'Must be active GENERAL_MANAGER when status=APPROVED.';
COMMENT ON TABLE report_issues IS 'M:N report↔issue with report-specific observation_no.';
COMMENT ON TABLE issue_history IS 'Append-only audit of issue status changes.';
COMMENT ON TABLE report_history IS 'Append-only audit of report workflow actions.';

COMMIT;

-- =============================================================================
-- USAGE SNIPPETS
-- =============================================================================
-- SET LOCAL app.current_user_id = '<user-uuid>';
-- SELECT fn_next_report_number('<project-uuid>', CURRENT_DATE);
-- CALL sp_submit_report('<report-uuid>', '<user-uuid>');
-- CALL sp_start_review('<report-uuid>', '<reviewer-uuid>');
-- CALL sp_approve_report('<report-uuid>', '<gm-uuid>', 'Approved');
-- CALL sp_reject_report('<report-uuid>', '<reviewer-uuid>', 'Missing evidence');
-- SELECT fn_report_payload('<report-uuid>');
