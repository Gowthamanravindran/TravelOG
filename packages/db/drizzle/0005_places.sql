CREATE TABLE `place_names` (
	`place_id` text NOT NULL,
	`key` text NOT NULL,
	`text` text NOT NULL,
	`own` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `place_names_pk` ON `place_names` (`place_id`,`key`);--> statement-breakpoint
CREATE INDEX `place_names_key_idx` ON `place_names` (`key`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`country_code` text,
	`country_name` text,
	`region` text,
	`continent` text,
	`lat` real,
	`lng` real,
	`time_zone` text,
	`currency` text,
	`population` integer DEFAULT 0 NOT NULL,
	`boost` real DEFAULT 0 NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `places_country_idx` ON `places` (`country_code`);--> statement-breakpoint
ALTER TABLE `trips` ADD `destination_place_id` text;