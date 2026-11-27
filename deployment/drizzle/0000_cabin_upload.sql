CREATE TABLE community_bots (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    data TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE cabin_upload_key (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    digest TEXT NOT NULL
);
