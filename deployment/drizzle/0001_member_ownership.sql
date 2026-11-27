CREATE TABLE cabin_members (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL COLLATE NOCASE UNIQUE,
    digest TEXT NOT NULL UNIQUE
);
--> statement-breakpoint
ALTER TABLE community_bots ADD COLUMN member_id TEXT REFERENCES cabin_members(id);
--> statement-breakpoint
ALTER TABLE community_bots ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX community_bots_member_seq ON community_bots (member_id, seq);
