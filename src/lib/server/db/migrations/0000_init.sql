CREATE TABLE `ballots` (
	`vote_id` text NOT NULL,
	`voter_id` text NOT NULL,
	`penalty_id` text NOT NULL,
	`cast_at` integer NOT NULL,
	PRIMARY KEY(`vote_id`, `voter_id`),
	FOREIGN KEY (`vote_id`) REFERENCES `votes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penalty_id`) REFERENCES `penalties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bonus_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`date` text NOT NULL,
	`minutes` integer,
	`reps` integer,
	`effort` text NOT NULL,
	`distance_km` real,
	`bonus_points` real NOT NULL,
	`recorded_at` integer NOT NULL,
	`client_id` text,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bonus_entries_hunter_date` ON `bonus_entries` (`hunter_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `bonus_entries_client` ON `bonus_entries` (`hunter_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`seconds_per_rep` integer,
	`tracks_distance` integer DEFAULT false NOT NULL,
	`is_running` integer DEFAULT false NOT NULL,
	`created_by` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `feed_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`hunter_id` text NOT NULL,
	`payload` text NOT NULL,
	`bucket` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feed_events_bucket_unique` ON `feed_events` (`bucket`);--> statement-breakpoint
CREATE INDEX `feed_events_created` ON `feed_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `hunter_badges` (
	`hunter_id` text NOT NULL,
	`badge_id` text NOT NULL,
	`earned_at` integer NOT NULL,
	PRIMARY KEY(`hunter_id`, `badge_id`),
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hunters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`color` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`registered_on` text NOT NULL,
	`created_at` integer NOT NULL,
	`push_enabled` integer DEFAULT true NOT NULL,
	`reminder_enabled` integer DEFAULT true NOT NULL,
	`reminder_time` text DEFAULT '20:00' NOT NULL,
	`vote_push_enabled` integer DEFAULT true NOT NULL,
	`sound_enabled` integer DEFAULT false NOT NULL,
	`last_reminder_on` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hunters_name_key_unique` ON `hunters` (`name_key`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`role` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`used_by` text,
	FOREIGN KEY (`created_by`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`used_by`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_token_hash_unique` ON `invites` (`token_hash`);--> statement-breakpoint
CREATE TABLE `missed_days` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`lift_reason` text,
	`created_at` integer NOT NULL,
	`lifted_at` integer,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `missed_days_active` ON `missed_days` (`hunter_id`,`date`) WHERE status = 'active';--> statement-breakpoint
CREATE TABLE `penalties` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `quest_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`date` text NOT NULL,
	`exercise` text NOT NULL,
	`reps` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	`client_id` text,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `quest_sets_hunter_date` ON `quest_sets` (`hunter_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `quest_sets_client` ON `quest_sets` (`hunter_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`event_id` text NOT NULL,
	`hunter_id` text NOT NULL,
	`reaction` text NOT NULL,
	PRIMARY KEY(`event_id`, `hunter_id`, `reaction`),
	FOREIGN KEY (`event_id`) REFERENCES `feed_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sick_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`date` text NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sick_notes_hunter_date` ON `sick_notes` (`hunter_id`,`date`);--> statement-breakpoint
CREATE TABLE `verdicts` (
	`id` text PRIMARY KEY NOT NULL,
	`vote_id` text NOT NULL,
	`hunter_id` text NOT NULL,
	`date` text NOT NULL,
	`penalty_id` text NOT NULL,
	`decided_at` integer NOT NULL,
	`decided_by_lot` integer DEFAULT false NOT NULL,
	`status` text NOT NULL,
	`lift_reason` text,
	`lifted_at` integer,
	FOREIGN KEY (`vote_id`) REFERENCES `votes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penalty_id`) REFERENCES `penalties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verdicts_vote_id_unique` ON `verdicts` (`vote_id`);--> statement-breakpoint
CREATE TABLE `vote_voters` (
	`vote_id` text NOT NULL,
	`hunter_id` text NOT NULL,
	PRIMARY KEY(`vote_id`, `hunter_id`),
	FOREIGN KEY (`vote_id`) REFERENCES `votes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`missed_day_id` text NOT NULL,
	`offender_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`closed_at` integer,
	`winner_penalty_id` text,
	`decided_by_lot` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`missed_day_id`) REFERENCES `missed_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offender_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_penalty_id`) REFERENCES `penalties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_missed_day_id_unique` ON `votes` (`missed_day_id`);