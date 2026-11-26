-- Catalog photos (freely licensed, credited) and opt-in public event discovery.
alter table catalog_venues add column photo_url text;
alter table catalog_venues add column photo_credit text;
alter table catalog_venues add column photo_page text;
-- Proposed amendment to FR-M28-05: an organizer may opt a page into "Jelajah acara".
-- Default false keeps every page unlisted; the list also needs EVENT_DISCOVERY=on.
alter table event_pages add column listed boolean not null default false;
-- Illustrative stock photo for listings whose venue has not uploaded real photos yet
-- (set by `npm run demo:photos`). Shown as the thumbnail and labelled "Foto ilustrasi".
alter table spaces add column demo_photo_url text;
