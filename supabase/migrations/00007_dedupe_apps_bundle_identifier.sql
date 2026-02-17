-- Ensure one app row per (user_id, bundle_identifier)
-- 1) Deduplicate existing rows by re-pointing references to the earliest row
-- 2) Enforce uniqueness going forward

create temporary table if not exists tmp_duplicate_apps on commit drop as
with ranked as (
  select
    app_id,
    user_id,
    bundle_identifier,
    row_number() over (
      partition by user_id, bundle_identifier
      order by created_at asc, app_id asc
    ) as row_num,
    first_value(app_id) over (
      partition by user_id, bundle_identifier
      order by created_at asc, app_id asc
    ) as canonical_app_id
  from apps
  where user_id is not null
    and nullif(trim(bundle_identifier), '') is not null
)
select
  app_id as duplicate_app_id,
  canonical_app_id
from ranked
where row_num > 1;

-- Re-point dependent records to canonical app rows before deleting duplicates
update campaigns c
set app_id = d.canonical_app_id
from tmp_duplicate_apps d
where c.app_id = d.duplicate_app_id;

update app_tokens t
set app_id = d.canonical_app_id
from tmp_duplicate_apps d
where t.app_id = d.duplicate_app_id;

update ad_requests r
set app_id = d.canonical_app_id
from tmp_duplicate_apps d
where r.app_id = d.duplicate_app_id;

-- Remove duplicate app records
delete from apps a
using tmp_duplicate_apps d
where a.app_id = d.duplicate_app_id;

-- Enforce one app per user per bundle identifier
create unique index if not exists idx_apps_user_bundle_identifier_unique
on apps(user_id, bundle_identifier)
where user_id is not null
  and nullif(trim(bundle_identifier), '') is not null;
