CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`added_by_member_id` text,
	`local_uri` text,
	`remote_key` text,
	`width` integer,
	`height` integer,
	`taken_at` text NOT NULL,
	`day_date` text,
	`caption` text
);
--> statement-breakpoint
CREATE INDEX `photos_trip_idx` ON `photos` (`trip_id`,`taken_at`);