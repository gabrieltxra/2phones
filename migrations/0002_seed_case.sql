INSERT INTO cases (id,slug,title,active,cover_key,duration_min,duration_max,price_cents,currency,free_checkpoint,current_version,created_at,updated_at)
VALUES ('case-room-404','room-404','ROOM 404',1,'room-404/door.webp',25,40,499,'USD',3,1,unixepoch()*1000,unixepoch()*1000)
ON CONFLICT(id) DO UPDATE SET title=excluded.title,updated_at=excluded.updated_at;
