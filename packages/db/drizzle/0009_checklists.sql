CREATE TABLE `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`list` text NOT NULL,
	`title` text NOT NULL,
	`section` text DEFAULT 'other' NOT NULL,
	`due_date` text,
	`remind` integer DEFAULT false NOT NULL,
	`note` text,
	`done_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`check_in_id` text
);
--> statement-breakpoint
CREATE INDEX `checklist_items_trip_idx` ON `checklist_items` (`trip_id`,`list`,`sort_order`);--> statement-breakpoint
ALTER TABLE `itinerary_items` ADD `must_do` integer DEFAULT false NOT NULL;