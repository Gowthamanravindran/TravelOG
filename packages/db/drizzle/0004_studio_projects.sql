CREATE TABLE `studio_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`slides` integer NOT NULL,
	`doc` text NOT NULL,
	`thumbnail_uri` text,
	`exported_at` text
);
--> statement-breakpoint
CREATE INDEX `studio_projects_trip_idx` ON `studio_projects` (`trip_id`,`updated_at`);