CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`booking_id` text,
	`name` text NOT NULL,
	`mime_type` text,
	`size_bytes` integer,
	`local_uri` text,
	`remote_key` text
);
--> statement-breakpoint
CREATE INDEX `attachments_booking_idx` ON `attachments` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`provider` text,
	`reference` text,
	`starts_at` text,
	`ends_at` text,
	`cost_minor` integer,
	`currency` text,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `bookings_trip_idx` ON `bookings` (`trip_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`category` text NOT NULL,
	`amount_minor` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_trip_category_idx` ON `budgets` (`trip_id`,`category`);--> statement-breakpoint
CREATE TABLE `expense_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`expense_id` text NOT NULL,
	`member_id` text NOT NULL,
	`share_minor` integer NOT NULL,
	`weight` integer
);
--> statement-breakpoint
CREATE INDEX `expense_splits_expense_idx` ON `expense_splits` (`expense_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`trip_amount_minor` integer NOT NULL,
	`paid_by_member_id` text NOT NULL,
	`split_method` text NOT NULL,
	`spent_at` text NOT NULL,
	`booking_id` text,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `expenses_trip_idx` ON `expenses` (`trip_id`,`spent_at`);--> statement-breakpoint
CREATE TABLE `itinerary_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`start_time` text,
	`duration_min` integer,
	`est_cost_minor` integer,
	`currency` text,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itinerary_items_variant_idx` ON `itinerary_items` (`variant_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`client_ts` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `outbox_client_ts_idx` ON `outbox` (`client_ts`);--> statement-breakpoint
CREATE TABLE `plan_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`day_date` text NOT NULL,
	`name` text NOT NULL,
	`author_member_id` text,
	`is_main` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plan_variants_trip_day_idx` ON `plan_variants` (`trip_id`,`day_date`);--> statement-breakpoint
CREATE TABLE `poll_options` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`poll_id` text NOT NULL,
	`label` text NOT NULL,
	`payload` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `poll_options_poll_idx` ON `poll_options` (`poll_id`);--> statement-breakpoint
CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`type` text NOT NULL,
	`question` text NOT NULL,
	`style` text DEFAULT 'single' NOT NULL,
	`deadline` text,
	`locked_option_id` text,
	`locked_at` text,
	`created_by_member_id` text
);
--> statement-breakpoint
CREATE INDEX `polls_trip_idx` ON `polls` (`trip_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`from_member_id` text NOT NULL,
	`to_member_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`method` text NOT NULL,
	`settled_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `settlements_trip_idx` ON `settlements` (`trip_id`);--> statement-breakpoint
CREATE TABLE `trip_members` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`trip_id` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`is_me` integer DEFAULT false NOT NULL,
	`upi_id` text
);
--> statement-breakpoint
CREATE INDEX `trip_members_trip_idx` ON `trip_members` (`trip_id`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`title` text NOT NULL,
	`emoji` text DEFAULT '🧳' NOT NULL,
	`destination` text,
	`start_date` text,
	`end_date` text,
	`time_zone` text NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`ended_at` text,
	`archived_at` text
);
--> statement-breakpoint
CREATE INDEX `trips_start_idx` ON `trips` (`start_date`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`server_seq` integer,
	`poll_id` text NOT NULL,
	`option_id` text NOT NULL,
	`member_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `votes_poll_idx` ON `votes` (`poll_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `votes_unique_idx` ON `votes` (`option_id`,`member_id`);