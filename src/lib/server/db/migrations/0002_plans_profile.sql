CREATE TABLE `plan_items` (
	`plan_id` text NOT NULL,
	`position` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`unit` text NOT NULL,
	`target` real NOT NULL,
	PRIMARY KEY(`plan_id`, `position`),
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`valid_from` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_hunter_valid_from` ON `plans` (`hunter_id`,`valid_from`);--> statement-breakpoint
CREATE TABLE `quest_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`hunter_id` text NOT NULL,
	`date` text NOT NULL,
	`exercise_id` text NOT NULL,
	`value` real NOT NULL,
	`recorded_at` integer NOT NULL,
	`client_id` text,
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `quest_sets_hunter_date` ON `quest_sets` (`hunter_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `quest_sets_client` ON `quest_sets` (`hunter_id`,`client_id`);--> statement-breakpoint
ALTER TABLE `hunters` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `hunters` ADD `display_name_key` text;--> statement-breakpoint
ALTER TABLE `hunters` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `hunters` ADD `theme` text DEFAULT 'monarch' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `hunters_display_name_key_unique` ON `hunters` (`display_name_key`);