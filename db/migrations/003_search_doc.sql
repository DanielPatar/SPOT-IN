-- Search document for keyword search (FR-M7-10, NFR search p95 ≤ 500 ms): a stored,
-- unaccented, lower-case text of space, property, city, area and type words, kept up to
-- date by triggers and indexed for trigram word similarity and full-text search.

create or replace function spotin_type_words(t text) returns text language sql immutable as $$
  select case t
    when 'atrium' then 'atrium'
    when 'booth' then 'booth promo spot stand'
    when 'popup_unit' then 'pop-up popup unit toko'
    when 'event_hall' then 'hall aula ballroom gedung'
    when 'function_room' then 'ruang meeting function room'
    when 'outdoor_area' then 'outdoor lapangan taman'
    else '' end $$;

create or replace function spotin_space_doc(s_name text, s_type text, p_name text, p_city text, p_area text) returns text
  language sql immutable as $$
  select lower(spotin_unaccent(coalesce(s_name, '') || ' ' || coalesce(p_name, '') || ' ' || coalesce(p_city, '') || ' ' ||
         coalesce(p_area, '') || ' ' || spotin_type_words(s_type))) $$;

alter table spaces add column search_doc text not null default '';

create or replace function spotin_spaces_doc_trigger() returns trigger language plpgsql as $$
begin
  select spotin_space_doc(new.name, new.type, p.name, p.city, p.area) into new.search_doc from properties p where p.id = new.property_id;
  return new;
end $$;
create trigger spaces_search_doc before insert or update of name, type, property_id on spaces
  for each row execute function spotin_spaces_doc_trigger();

create or replace function spotin_properties_doc_trigger() returns trigger language plpgsql as $$
begin
  update spaces s set search_doc = spotin_space_doc(s.name, s.type, new.name, new.city, new.area) where s.property_id = new.id;
  return new;
end $$;
create trigger properties_search_doc after update of name, city, area on properties
  for each row execute function spotin_properties_doc_trigger();

update spaces s set search_doc = spotin_space_doc(s.name, s.type, p.name, p.city, p.area) from properties p where p.id = s.property_id;

alter table spaces add column search_tsv tsvector generated always as (to_tsvector('simple', search_doc)) stored;
create index spaces_search_doc_trgm on spaces using gin (search_doc gin_trgm_ops);
create index spaces_search_tsv on spaces using gin (search_tsv);
create index spaces_published_idx on spaces (published_at desc) where status = 'published';

-- Word-similarity threshold used by the `<%` operator in search (new sessions pick it up).
do $$ begin
  execute format('alter database %I set pg_trgm.word_similarity_threshold = 0.5', current_database());
end $$;
