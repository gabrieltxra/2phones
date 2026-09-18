-- Existing rooms keep their immutable version and Durable Object state.
INSERT INTO case_versions (id,case_id,version,definition_json,published_at,created_at)
VALUES ('room-404-v2','case-room-404',2,'{"engine":"room-404-investigation","version":2,"freeCheckpoint":3}',unixepoch()*1000,unixepoch()*1000)
ON CONFLICT(case_id,version) DO NOTHING;
UPDATE cases SET current_version=2,updated_at=unixepoch()*1000 WHERE id='case-room-404';
