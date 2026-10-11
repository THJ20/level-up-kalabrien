CREATE TABLE `plan_ratings` (
	`hunter_id` text NOT NULL,
	`week_start` text NOT NULL,
	`rating` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`hunter_id`, `week_start`),
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `plan_items` ADD `base_target` real;--> statement-breakpoint
ALTER TABLE `plans` ADD `auto` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `factor` real DEFAULT 1 NOT NULL;