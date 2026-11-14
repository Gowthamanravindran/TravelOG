CREATE TABLE `saved_places` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`title` text NOT NULL,
	`type` text DEFAULT 'place' NOT NULL,
	`address` text,
	`area` text,
	`country_code` text,
	`lat` real,
	`lng` real,
	`poi_id` text,
	`source` text DEFAULT 'typed' NOT NULL,
	`url` text,
	`source_title` text,
	`thumb_url` text,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `saved_places_country_idx` ON `saved_places` (`country_code`,`area`);