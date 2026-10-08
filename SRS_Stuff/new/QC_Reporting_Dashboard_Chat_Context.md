# QC Reporting Dashboard — Chat Context Export

> Exported from the current ChatGPT conversation.
>
> This file contains the user-visible project context, decisions, schema evolution, business logic, attachment references, and generated artifact references from this chat. Hidden system/developer instructions and private model reasoning are not included.

---

## 1. Project Overview

The project is a **QC Reporting Dashboard** for a Civil Quality Control Department.

Primary use case:

- Civil/QC engineers inspect a project/site.
- They record issues/observations.
- Each issue can have **multiple photographs**.
- Each issue can include a title, description, root cause, risk/severity, location, and status.
- Engineers can use a predefined **Generic Issues** catalogue to auto-fill issue content.
- Issues are grouped into a standardized report.
- Reports are reviewed in a role-based QC workflow.
- **Only the General Manager (GM) can approve a report.**
- The system generates a standardized PDF/Word report similar to the supplied sample QC report.

The hierarchy initially discussed was:

```text
Project
  └── Package
       └── Building
            └── Issue
                 └── Images
```

This was later generalized so issues can occur **anywhere on site**, including buildings, roads, utilities, drainage, external works, rooftop, floors, rooms, etc.

The resulting location model uses hierarchical `site_locations`.

---

# 2. Original Proposed Tables

The user initially proposed:

- `Users`
- `Roles`
- `Projects`
- `Packages`
- `Buildings`
- `Issues`
- `Image`
- `Generic Issues`

The schema was progressively refined to support:

- flexible site locations
- report grouping
- review and approval
- multiple images per issue
- issue/report audit history
- generic issue templates
- report templates
- report sections
- report-specific observation numbering

---

# 3. Core Design Decisions

## 3.1 Projects

Projects are the highest-level entity.

Suggested fields:

```text
projects
--------
id                  PK
project_code        UNIQUE
name
description
status
start_date
end_date
created_at
updated_at
```

Relationship:

```text
Project 1 ---- N Packages
```

---

## 3.2 Packages

A project can have zero or many packages.

```text
packages
--------
id                  PK
project_id          FK -> projects.id
package_code
name
description
status
created_at
updated_at
```

Package codes should be unique within a project.

---

## 3.3 Site Locations

The original `Buildings` concept was generalized into `site_locations` because issues can occur anywhere on site.

Examples of locations:

- Site
- Building
- Basement
- Ground Floor
- First Floor
- Room
- Road
- Utility
- Drainage
- Boundary
- Landscaping
- External Works
- Rooftop
- Other

Recommended structure:

```text
site_locations
--------------
id                  PK
project_id          FK -> projects.id
package_id          FK -> packages.id NULL
parent_location_id  FK -> site_locations.id NULL
name
location_code
location_type
description
created_at
updated_at
```

The self-reference allows:

```text
Project
└── Package
    └── Building A
        ├── Basement
        ├── Ground Floor
        ├── First Floor
        │   ├── Room 101
        │   └── Room 102
        └── Rooftop
```

And also:

```text
Project
├── Road Network
├── External Drainage
├── Boundary Wall
├── Utilities
└── Landscaping
```

---

# 4. Users and QC Roles

## 4.1 Final QC Department Roles

The senior reviewer provided the final role hierarchy:

```text
General Manager (GM)
Manager (Mgr)
Assistant Manager (AM)
Assistant Engineer (AE)
Individual Consultant (IC)
```

Hierarchy:

```text
GM
↓
Mgr
↓
AM
↓
AE
↓
IC
```

Important confirmed rule:

> **Only GM can approve a report.**

Another revised rule from senior review:

> **Every user has one role.**

Therefore the earlier many-to-many `roles` / `user_roles` design was revised.

Recommended user structure:

```text
users
-----
id
name
email
employee_id
department
role_name
is_active
created_at
updated_at
```

`role_name` should be an enum.

A separate `user_projects` mapping is recommended if users can work on multiple projects:

```text
user_projects
-------------
user_id      FK -> users.id
project_id   FK -> projects.id
```

This allows:

- one global QC role per user
- multiple project assignments per user

---

# 5. Generic Issue Catalogue

The supplied Excel file:

```text
QC Issues with description.xlsx
```

was used to refine the Generic Issues design.

The catalogue contains reusable QC issue data such as:

- issue family/category
- issue/subtype
- title
- description
- root cause
- severity/risk information

Recommended tables:

## 5.1 Issue Categories

```text
issue_categories
----------------
id
code            UNIQUE
name
description
is_active
```

This was preferred over a hard-coded category enum because the catalogue can evolve.

## 5.2 Generic Issues

```text
generic_issues
--------------
id
category_id             FK -> issue_categories.id
parent_issue_id          FK -> generic_issues.id NULL
issue_code               UNIQUE
title
default_description
default_root_cause
default_risk_text
default_severity
is_active
created_at
updated_at
```

Important business logic:

- Selecting a generic issue is optional.
- When selected, its default values are **copied into the actual issue record**.
- Engineers may edit the copied values.
- Future edits to the generic template must **not modify historical issues**.

---

# 6. Issues

The issue is the primary inspection observation.

Recommended schema:

```text
issues
------
id
site_location_id        FK -> site_locations.id
generic_issue_id        FK -> generic_issues.id NULL
reported_by             FK -> users.id

title
description
root_cause              NULL
risk_description        NULL

severity
status

location_details        NULL
observed_at

created_at
updated_at
```

Important normalization decision:

The issue should **not** separately store `project_id` and `package_id` because those are derivable through `site_location_id`.

Example:

```text
Issue
  -> Site Location
      -> Package
          -> Project
```

This avoids inconsistent duplicated hierarchy data.

---

# 7. Issue Images

One issue can have **multiple images**.

Recommended schema:

```text
issue_images
------------
id
issue_id                FK -> issues.id
uploaded_by             FK -> users.id

storage_path
annotated_storage_path  NULL

original_filename
mime_type
file_size

caption                 NULL
display_order

created_at
```

Important rules:

- Images are stored in object storage such as S3 or Supabase Storage.
- The relational DB stores stable paths/keys and metadata.
- One issue may have any number of images.
- Original images should be preserved.
- An optional annotated image can be stored separately.
- Annotated images support the red-box style used in the sample QC report.
- Image display order must be preserved.

Correct cardinality:

```text
Issue 1 ---- N Issue Images
```

---

# 8. Issue Status and History

Issue status is independent from report status.

Suggested issue lifecycle discussed:

```text
OPEN
IN_PROGRESS
RESOLVED
REJECTED
```

Later a dummy enum set was also suggested for client validation:

```text
OPEN
IN_PROGRESS
RECTIFIED
VERIFIED
CLOSED
REJECTED
```

The exact enum values are still to be finalized with the client.

Recommended history table:

```text
issue_history
-------------
id
issue_id        FK -> issues.id
changed_by      FK -> users.id

old_status
new_status
comment

created_at
```

Changing issue status should automatically create a history record.

---

# 9. Reports

Reports group issues for an inspection/building/site scope.

Important requirements:

- One report belongs to one project.
- A report may optionally belong to a package.
- A report can contain issues from multiple locations.
- Report numbers/document numbers must be unique.
- Reports use a standardized template.
- Reports are reviewed before approval.
- **Only GM approves reports.**

Recommended schema:

```text
reports
-------
id
project_id              FK -> projects.id
package_id              FK -> packages.id NULL

report_template_id      FK -> report_templates.id NULL

document_no             UNIQUE
title
site_visit_date

created_by              FK -> users.id

status
submitted_at            NULL

reviewed_by             FK -> users.id NULL
reviewed_at             NULL
review_comments         NULL

approved_by             FK -> users.id NULL
approved_at             NULL

generated_file_path     NULL

created_at
updated_at
```

Business rule:

```text
approved_by.role_name MUST equal GM
```

---

# 10. Report Sections

The supplied sample report contained sections/headings such as:

- Critical Observations
- General Observations
- Basement
- Ground Floor
- First Floor
- Second Floor
- Rooftop
- External Works
- Project Progress and Submittal Status
- Risk Assessment
- Recommendations

Therefore `report_sections` was added.

Recommended structure:

```text
report_sections
---------------
id
report_id              FK -> reports.id
parent_section_id      FK -> report_sections.id NULL
site_location_id       FK -> site_locations.id NULL

section_type
heading
body_text              NULL
display_order
```

`parent_section_id` supports nested structure such as:

```text
GENERAL OBSERVATIONS
  ├── Basement
  ├── Ground Floor
  ├── First Floor
  └── Rooftop
```

`body_text` supports narrative sections such as:

- Risk Assessment
- Recommendations
- Project Progress & Submittal Status

---

# 11. Report-Issue Relationship

A report and its issues are connected through a junction table.

```text
report_issues
-------------
report_id          PK/FK -> reports.id
issue_id           PK/FK -> issues.id
section_id         FK -> report_sections.id NULL

observation_no
display_order
```

Important logic:

- Each issue gets a report-specific observation number.
- Observation number does not need to match the global issue ID.
- Observation number must be unique inside a report.
- Display order is stored independently.
- An issue may appear in more than one report if follow-up/history reports are supported.

Example:

```text
Report 2026-001
├── Observation 1 -> Issue #15
├── Observation 2 -> Issue #24
├── Observation 3 -> Issue #41
└── Observation 4 -> Issue #55
```

---

# 12. Report Templates

The report format should be versioned.

Recommended structure:

```text
report_templates
----------------
id
name
version
template_path / config
is_active
created_at
```

Important rule:

- A report references the template version used to generate it.
- Updating the company report template must not change previously approved reports.

---

# 13. Report Workflow

Suggested report workflow:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ↓
APPROVED
```

or:

```text
UNDER_REVIEW
  ↓
REJECTED
  ↓
DRAFT / editable correction
  ↓
SUBMITTED
```

Important rules:

- Draft reports can be edited.
- Submitted reports should not be silently changed while under review.
- Rejected reports become editable for correction/resubmission.
- Approved reports become immutable.
- **Only GM can approve.**

The exact permissions for Mgr/AM regarding starting review/rejecting were identified as still needing final confirmation.

---

# 14. Report History

Recommended table:

```text
report_history
--------------
id
report_id       FK -> reports.id
action_by       FK -> users.id

action
comment

created_at
```

Possible actions discussed:

```text
CREATED
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
REOPENED
```

The exact `report_action` enum still needs final client confirmation.

Every workflow transition should create a history row.

---

# 15. Report Output Ordering

Recommended generated report order:

```text
Report
  -> Section
      -> Location/Floor heading
          -> Observation Number
              -> Observation Title
              -> Observation Description
              -> Images in display order
```

Annotated image should be used when available.

Otherwise use the original image.

---

# 16. Submission Validation

Before report submission:

- report must contain at least one issue
- all issues must belong to the correct project
- package scope must be valid if package is specified
- observation numbers must be unique
- required report metadata must exist
- image evidence must exist if configured as mandatory
- no invalid/inactive references should be included

The rule requiring at least one image per issue was considered potentially configurable because legitimate text-only observations may exist.

---

# 17. Approval Rules

Final confirmed role approval rule:

```text
ONLY GM CAN APPROVE A REPORT
```

Potential database/service validation:

```text
IF NEW.status = 'APPROVED'
THEN approved_by must reference an active user with role_name = 'GM'
```

Also discussed:

- rejection should require a comment
- self-approval should normally be prohibited unless client explicitly allows it
- reviewer must have access to the project

The exact rules for self-approval still require client confirmation.

---

# 18. Approved Report Immutability

Once approved:

- issue text shown in the report must not silently change
- report ordering must not change
- observation numbers must remain fixed
- report template version must remain fixed
- image references used for the report should remain reproducible
- the generated approved report should be treated as a frozen artifact

If changes are required:

- reopen the report, or
- create a superseding report/version

Exact reopen behavior still requires confirmation.

---

# 19. Generated Document Handling

The report may generate:

- PDF
- Word document
- potentially both

The generated file path should be stored in `reports.generated_file_path`.

Regeneration should use:

- stored issue text
- stored report ordering
- stored template version
- stored image references

---

# 20. Dashboard Metrics

Dashboard data should be derived from the database.

Examples:

- total issues
- open issues
- in-progress issues
- resolved issues
- critical issues
- issues by category
- issues by location
- issues by project/package
- reports awaiting review
- approved reports
- rejected reports

Filters:

- project
- package
- date
- location
- category
- severity
- issue status
- report status
- reporter

---

# 21. Audit and Deletion

Historical data should generally not be hard-deleted.

Recommended:

- `is_active`
- archive states
- soft deletion where necessary

Rules:

- historical reports must remain reproducible
- history tables should not be user-editable
- referenced generic issues should be disabled rather than deleted
- referenced locations/packages/projects should be archived rather than deleted

---

# 22. Database Integrity Rules

Important constraints:

- package must belong to its project
- child site location must match parent project/package scope
- report project/package must match included issues
- all FKs must be enforced
- observation number unique within report
- report/document number unique
- project code unique
- package code unique within project
- generic issue code unique
- users must be active to perform workflow actions

---

# 23. Automatic Database Behavior

Recommended automatic behavior:

## updated_at

Automatically update `updated_at` on mutable entities.

## Issue history

When issue status changes:

```text
INSERT issue_history(...)
```

## Report history

When report status changes:

```text
INSERT report_history(...)
```

## Workflow timestamps

Automatically assign:

- `submitted_at`
- `reviewed_at`
- `approved_at`

according to status transitions.

## Image ordering

Auto-assign next `display_order` if omitted.

## Observation ordering

Auto-assign:

- `observation_no`
- `display_order`

if omitted.

## Generic issue snapshot

When a generic issue is selected, copy:

- title
- description
- root cause
- risk text
- severity

into the actual issue.

---

# 24. Recommended Views

Suggested views:

## `v_issue_details`

Combines:

- issue
- reporter
- site location hierarchy
- package
- project
- generic issue/category

## `v_report_summary`

Combines:

- report metadata
- project/package
- issue totals
- severity counts
- status counts

## `v_report_observations`

Returns:

- report
- section
- observation number
- issue
- location
- image count

## `v_site_location_hierarchy`

Recursive location path:

```text
Project / Package / Building / Floor / Room
```

## `v_unresolved_issues`

All open/in-progress issues with project/location.

## `v_user_project_roles`

Originally proposed for user/role/project scope.

After the senior revision, role is now directly on the user, so this should effectively become:

```text
v_user_project_access
```

combining:

- user
- role_name
- user_projects
- project

## `v_dashboard_metrics`

Aggregated dashboard counts.

---

# 25. Recommended Triggers

Suggested triggers/business enforcement:

```text
trg_set_updated_at
```

Updates timestamps.

```text
trg_issue_status_history
```

Creates issue audit history.

```text
trg_report_status_history
```

Creates report audit history.

```text
trg_report_status_timestamps
```

Sets submit/review/approval timestamps.

```text
trg_issue_image_order
```

Assigns image display order.

```text
trg_report_observation_order
```

Assigns report observation number/display order.

```text
trg_validate_location_scope
```

Ensures project/package/location consistency.

```text
trg_snapshot_generic_issue
```

Copies generic issue defaults into issue.

```text
trg_validate_gm_approval
```

Recommended after senior review:

- if report is transitioning to APPROVED
- `approved_by` must be active
- `approved_by.role_name = GM`

---

# 26. Recommended Functions / Stored Procedures

Suggested:

```text
fn_location_path(location_id)
```

Returns recursive location string.

Example:

```text
Project A / Package 1 / Building B / Third Floor
```

---

```text
fn_next_report_number(project_id, visit_date)
```

Generates unique report/document number.

---

```text
sp_submit_report(report_id, user_id)
```

Validates and transitions:

```text
DRAFT -> SUBMITTED
```

---

```text
sp_start_review(report_id, reviewer_id)
```

Transitions:

```text
SUBMITTED -> UNDER_REVIEW
```

Role permission still needs exact client confirmation.

---

```text
sp_approve_report(report_id, user_id, comment)
```

Must validate:

```text
user.role_name = GM
```

Then:

```text
UNDER_REVIEW -> APPROVED
```

---

```text
sp_reject_report(report_id, user_id, comment)
```

Rejects report with mandatory comment.

Exact roles allowed to reject need confirmation.

---

```text
fn_report_payload(report_id)
```

Returns the fully ordered report data:

- sections
- locations
- observations
- issue text
- images

for report generation.

---

# 27. Enum Candidates

The following were identified as strong enum candidates:

```text
project_status
package_status
location_type
issue_status
issue_severity
report_status
report_section_type
report_action
role_name
```

## Dummy values proposed for client review

### `project_status`

```text
PLANNING
ACTIVE
ON_HOLD
COMPLETED
CANCELLED
ARCHIVED
```

### `package_status`

```text
PLANNING
ACTIVE
ON_HOLD
COMPLETED
CANCELLED
ARCHIVED
```

### `location_type`

```text
SITE
BUILDING
FLOOR
ROOM
ROAD
UTILITY
DRAINAGE
BOUNDARY
LANDSCAPE
EXTERNAL_WORK
OTHER
```

Possible addition from senior logic/sample report:

```text
ROOFTOP
```

Though rooftop can also be modeled as a `FLOOR`-like site location.

### `issue_status`

Dummy proposal:

```text
OPEN
IN_PROGRESS
RECTIFIED
VERIFIED
CLOSED
REJECTED
```

Earlier simpler proposal:

```text
OPEN
IN_PROGRESS
RESOLVED
REJECTED
```

Exact client values are still pending.

### `issue_severity`

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### `report_status`

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
REOPENED
```

### `report_section_type`

Earlier:

```text
CRITICAL_OBSERVATIONS
GENERAL_OBSERVATIONS
OTHER
```

After senior review, the system also needs to represent:

```text
PROJECT_PROGRESS_AND_SUBMITTAL_STATUS
RISK_ASSESSMENT
RECOMMENDATIONS
```

This could either be handled by expanding the enum or treating section headings as data with a smaller section-kind enum.

### `report_action`

Dummy proposal:

```text
CREATED
UPDATED
SUBMITTED
REVIEW_STARTED
APPROVED
REJECTED
REOPENED
GENERATED
```

### `role_name`

Final confirmed QC roles:

```text
GM
MGR
AM
AE
IC
```

Meaning:

```text
GM  = General Manager
MGR = Manager
AM  = Assistant Manager
AE  = Assistant Engineer
IC  = Individual Consultant
```

Only:

```text
GM
```

can approve reports.

---

# 28. Normalization Discussion

The schema was evaluated as approximately 3NF-oriented.

Important normalization choices:

## Removed redundant hierarchy from `issues`

Avoid:

```text
issues.project_id
issues.package_id
issues.site_location_id
```

because project/package can be derived from `site_location_id`.

Use:

```text
issues.site_location_id
```

and join upward.

## Reports retain project/package

Reports retain:

```text
project_id
package_id NULL
```

because a report can span multiple site locations.

## Images normalized correctly

Do not store:

```text
image1
image2
image3
```

or comma-separated image URLs in `issues`.

Instead:

```text
issues 1 ---- N issue_images
```

---

# 29. Sample Report Findings

Uploaded sample:

```text
Quality Report of Net Zero Energy Building Lhr(28-09-2026).pdf
```

The sample report showed:

- Infrastructure Development Authority of Punjab / Government of Punjab header
- document/report identifier
- project/site title
- site visit date
- Critical Observations
- General Observations
- floor/location headings
- sequential observation numbering
- observation title
- observation description
- one or more photographs
- red-box annotation around defects

Examples found in the report included:

- Damaged and uneven surface finish
- Uneven wall finish
- Unsealed pipe penetration
- Damaged ceiling finish around services
- Paint bubbles
- Exposed reinforcement
- Stagnant water
- Incomplete blockwork joints
- Damaged plaster edges
- Unsealed core-cut openings
- Misaligned ductwork
- Missing pipe end caps
- Missing windowsill marble
- Broken stair finish
- Poor housekeeping
- Broken/missing floor tiles
- Electrical floor box level issue
- Gaps around door frames
- Cracks at joints
- Broken staircase marble
- Damaged staircase railing
- Inadequate barricading
- Paint peeling/delamination
- Honeycombing and segregation
- Hairline cracks
- Floor-tile installation issues

These observations reinforced the need for:

- flexible location hierarchy
- generic issue catalogue
- multiple images per issue
- annotated images
- report sections
- report-specific observation numbering

---

# 30. Senior-Reviewed Business Logic Changes

The senior reviewer revised the earlier business logic.

Key explicit changes/requirements:

## User role

> Every user has one role.

## QC Department Roles

```text
General Manager (GM)
Manager (Mgr)
Assistant Manager (AM)
Assistant Engineer (AE)
Individual Consultant (IC)
```

GM is top level.

## Approval

> Only GM can approve a report.

## Report sections expanded

The reviewed logic included:

```text
CRITICAL OBSERVATIONS
GENERAL OBSERVATIONS

Basement
Ground Floor
First Floor
Second Floor
...
Rooftop
External Works

Project Progress and Submittal Status
Risk Assessment
Recommendations
```

## Generated documents

Generated output may be:

```text
PDF
Document
Word file
```

and its path should be stored against the report.

---

# 31. Remaining Decisions Before Building the DB

Before writing final PostgreSQL DDL/migrations, the following still need exact confirmation.

## Enum values

Exact enumerations for:

- `project_status`
- `package_status`
- `location_type`
- `issue_status`
- `issue_severity`
- `report_status`
- `report_section_type`
- `report_action`
- `role_name` (roles themselves are now confirmed)

## Report review permissions

Confirmed:

```text
GM -> approve
```

Still needs clarification:

- Can Mgr start review?
- Can AM start review?
- Who may reject a report?
- Can AE submit?
- Can IC submit?
- Who can reopen an approved report?

## Self approval

Should GM be allowed to approve a report they created themselves?

Earlier recommendation:

```text
No self approval
```

unless the organization explicitly permits it.

## Cross-package reports

Can one report contain issues from multiple packages?

Current default design:

```text
report.package_id may be NULL
```

which can represent project-wide reports.

## Image requirement

Must every issue included in a report have at least one photo?

Current recommendation:

- normally yes
- configurable if text-only issues are valid

## Issue reuse

Can an issue appear in multiple reports?

Current design supports yes through `report_issues`.

## Rejected reports

Should rejected reports:

- remain `REJECTED` but editable, or
- transition back to `DRAFT`?

## Approved report changes

Should approved reports ever be reopened?

If yes:

- who can reopen?
- GM only?
- should a new version/report be created instead?

---

# 32. Generated Artifacts from This Chat

The following artifacts were generated during the conversation.

## Initial / Intermediate

```text
wide_clean_infographic_diagram_image_a_detailed.png
a_clean_technical_infographic_on_a_white_backgroun.png
a_detailed_infographic_diagram_image_on_a_white_ba.png
```

These were early ER/business-logic diagrams.

## First SRS revision

```text
QC_Reporting_Dashboard_SRS.docx
qc_reporting_er_diagram_revised.png
qc_reporting_business_logic_diagram.png
```

## Senior-review revision

Latest generated artifacts:

```text
QC_Reporting_Dashboard_SRS_v2.docx
QC_Reporting_ERD_v2.png
QC_Reporting_Business_Logic_v2.png
```

These incorporated:

- one role per user
- GM/Mgr/AM/AE/IC hierarchy
- GM-only approval
- report section refinements
- updated schema/business logic

---

# 33. Uploaded Source Files

Files supplied by the user:

```text
QC Issues with description.xlsx
Quality Report of Net Zero Energy Building Lhr(28-09-2026).pdf
Pasted text(6).txt
```

Purpose:

### `QC Issues with description.xlsx`

Used to understand:

- generic issue structure
- categories
- issue titles/subtypes
- descriptions
- root causes
- severity/risk content

### `Quality Report of Net Zero Energy Building Lhr(28-09-2026).pdf`

Used to understand:

- actual report layout
- floor/location grouping
- observation numbering
- image layout
- multiple images
- annotation style
- critical/general observations

### `Pasted text(6).txt`

Contained the senior-reviewed business logic and revisions.

---

# 34. Suggested Final Schema State Before DB Build

At the end of this chat, the expected schema is approximately:

```text
projects
packages

site_locations

users
user_projects

issue_categories
generic_issues

issues
issue_images
issue_history

report_templates

reports
report_sections
report_issues
report_history
```

High-level ER structure:

```text
PROJECTS
   |
   +---- PACKAGES
   |
   +---- SITE_LOCATIONS
   |        |
   |        +---- SITE_LOCATIONS (recursive)
   |        |
   |        +---- ISSUES
   |               |
   |               +---- ISSUE_IMAGES
   |               |
   |               +---- ISSUE_HISTORY
   |               |
   |               +---- GENERIC_ISSUES
   |                       |
   |                       +---- ISSUE_CATEGORIES
   |
   +---- REPORTS
            |
            +---- REPORT_SECTIONS
            |
            +---- REPORT_ISSUES ---- ISSUES
            |
            +---- REPORT_HISTORY
            |
            +---- REPORT_TEMPLATES

USERS
   |
   +---- USER_PROJECTS ---- PROJECTS
   |
   +---- role_name enum
```

Approval invariant:

```text
REPORT.status = APPROVED
    =>
REPORT.approved_by references ACTIVE USERS.role_name = GM
```

---

# 35. Visible Conversation Transcript

## User

> i want to design a backend for a project.  
> Its about a reporting dashboard where civil engineers from Quality Control Dept would upload photos with description of the issue on a particular site and it would compile all of it in a standard template.  
> Now for the database, i was thinking of the following tables

## Assistant

Asked the user to list the proposed tables and described the expected workflow:

```text
QC Engineer -> Site -> Issue/Report -> Photos -> Description -> Review/Status -> Standardized Report
```

and offered to refine:

- tables/relationships
- keys
- normalization
- image storage
- multiple photos
- users/roles
- report generation
- audit/history

---

## User

Proposed:

```text
Users Table
Roles Table
Projects Table
Packages
Buildings
Issues
Image
Generic Issues
```

---

## Assistant

Refined the proposal and recommended:

- users
- roles
- projects
- packages
- buildings/site locations
- issues
- issue_images
- generic_issues
- reports
- issue_history

Also noted that one issue should support multiple images and suggested separating report status from issue status.

---

## User

Requested:

> Refine the QC reporting dashboard database schema. Report mode: one report grouping issues for a building or inspection. Review workflow: senior engineer/manager approval required. Issue locations: anywhere on site, including external works and utilities. Give me the recommended relational schema and foreign-key relationships.

---

## Assistant

Introduced the flexible `site_locations` model and a first-class `reports` entity.

Recommended:

```text
PROJECT
  -> PACKAGE
  -> SITE_LOCATION
  -> ISSUE
```

with:

```text
REPORT -> REPORT_ISSUES -> ISSUES
```

and supporting:

- users
- roles
- generic issues
- issue images
- issue history
- report history

---

## User

Requested an ER diagram.

---

## Assistant

Generated an ER diagram image.

---

## User

Asked:

> one issue can have multiple pictures attached to it, also is this schema normalized?

---

## Assistant

Confirmed:

```text
issues 1 ---- N issue_images
```

and explained 3NF concerns around redundant `project_id` / `package_id` fields on `issues`.

Recommended deriving project/package through `site_location_id`.

Also clarified that reports can retain project/package because they can span multiple locations.

---

## User

Requested:

> now make a similar er diagram and also in another diagram list all the views/triggers enums (and other business logic) necessary for this db

---

## Assistant

Generated two diagrams:

- ER diagram
- database logic diagram including:
  - enums
  - views
  - triggers
  - procedures
  - business rules

---

## User

Requested an SRS and attached:

```text
QC Issues with description.xlsx
Quality Report of Net Zero Energy Building Lhr(28-09-2026).pdf
```

User asked to revise schema and diagrams based on the files.

---

## Assistant

Reviewed both sources and generated:

```text
QC_Reporting_Dashboard_SRS.docx
qc_reporting_er_diagram_revised.png
qc_reporting_business_logic_diagram.png
```

Key changes included:

- `issue_categories`
- parent/child `generic_issues`
- root cause and risk snapshots
- `report_sections`
- report-specific `observation_no`
- versioned `report_templates`
- annotated image path
- expanded location types

---

## User

Asked to list the business logic first for verification.

---

## Assistant

Listed 24 business logic groups including:

- user/role scope
- project/package/location hierarchy
- generic issue catalogue
- issue creation
- issue locations
- images
- minimum evidence
- issue lifecycle
- report creation
- report sections
- adding issues
- ordering
- workflow
- validation
- review
- self-approval
- history
- immutability
- template versioning
- generated files
- dashboard metrics
- audit/deletion
- integrity
- automatic behavior

---

## User

Asked to list all enums.

---

## Assistant

Listed enum candidates:

```text
project_status
package_status
location_type
issue_status
issue_severity
report_status
report_section_type
report_action
mime_type
issue_category
role_name
```

and recommended that issue category and MIME type not necessarily be PostgreSQL enums.

---

## User

Selected these as enums:

```text
project_status
package_status
location_type
issue_status
issue_severity
report_status
report_section_type
report_action
role_name
```

and requested dummy values to validate with the client.

---

## Assistant

Suggested dummy values such as:

```text
project_status:
PLANNING
ACTIVE
ON_HOLD
COMPLETED
CANCELLED
ARCHIVED
```

```text
issue_status:
OPEN
IN_PROGRESS
RECTIFIED
VERIFIED
CLOSED
REJECTED
```

```text
issue_severity:
LOW
MEDIUM
HIGH
CRITICAL
```

and other proposed enum values.

---

## User

Shared senior-reviewed logic and final QC roles:

```text
General Manager (GM)
Manager (Mgr)
Assistant Manager (AM)
Assistant Engineer (AE)
Individual Consultant (IC)
```

with:

> GM Top level  
> only GM can approve a report

Requested:

> revise the schema, diagrams and srs according to this logic, we will start building the db in the next phase

---

## Assistant

Revised the design and generated:

```text
QC_Reporting_Dashboard_SRS_v2.docx
QC_Reporting_ERD_v2.png
QC_Reporting_Business_Logic_v2.png
```

Key changes stated:

- removed many-to-many roles
- `users.role_name` enum
- added `user_projects`
- only GM can approve
- `reports.approved_by`
- `reports.approved_at`
- nested `report_sections.parent_section_id`
- `report_sections.body_text`
- location-driven floor/external headings
- retained images, generic issue snapshots, histories, observation numbering and template versioning

---

## User

Requested:

> export the entire context of this chat in an MD file

---

# 36. Recommended Next Phase

The next phase is to build the database.

Recommended implementation order:

1. Finalize exact enum values.
2. Finalize role permissions for:
   - submit
   - start review
   - reject
   - reopen
   - approve
3. Finalize cross-package report policy.
4. Finalize image evidence requirement.
5. Finalize report reopen/versioning behavior.
6. Freeze the schema.
7. Write PostgreSQL DDL/migrations.
8. Add indexes and constraints.
9. Add triggers/functions.
10. Seed enums/master data.
11. Import Generic Issues catalogue.
12. Build API/service layer.
13. Implement object storage.
14. Implement report generation.
15. Implement dashboard queries/views.

The most important confirmed rule entering the DB-build phase is:

```text
ONLY GM CAN APPROVE A REPORT.
```
