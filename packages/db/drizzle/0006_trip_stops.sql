CREATE TABLE `trip_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`kind` text NOT NULL,
	`place_id` text,
	`to_place_id` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`label` text,
	`address` text,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `trip_stops_trip_idx` ON `trip_stops` (`trip_id`,`start_date`);--> statement-breakpoint
ALTER TABLE `bookings` ADD `from_place_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `to_place_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `place_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `address` text;