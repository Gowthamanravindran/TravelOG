CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`member_id` text,
	`item_id` text,
	`title` text NOT NULL,
	`at` text NOT NULL,
	`day_date` text NOT NULL,
	`lat` real,
	`lng` real,
	`accuracy_m` integer,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `check_ins_trip_day_idx` ON `check_ins` (`trip_id`,`day_date`,`at`);