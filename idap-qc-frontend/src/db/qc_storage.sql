-- =============================================================================
-- QC Reporting Dashboard: Supabase Storage buckets
-- Run once in the Supabase SQL editor (safe to re-run).
--
-- Both buckets are private. The Next.js API uses SUPABASE_SECRET_KEY, which
-- bypasses storage RLS, and hands out short-lived signed URLs for reading.
--
-- Object paths (only the path is stored in the database, never a URL):
--   issue-images  <PROJECT_CODE>/<issue_id>/<image_id>.<ext>      -> issue_images.storage_path
--   reports       <PROJECT_CODE>/<document_no>.<pdf|docx>          -> reports.generated_file_path
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('issue-images', 'issue-images', false, 10485760,  -- 10 MB
        ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('reports', 'reports', false, 52428800,            -- 50 MB
        ARRAY['application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE
SET public             = EXCLUDED.public,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Sanity check
-- SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id IN ('issue-images', 'reports');
