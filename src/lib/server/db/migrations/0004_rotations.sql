CREATE TABLE `plan_rotations` (
	`hunter_id` text NOT NULL,
	`week_start` text NOT NULL,
	`decision` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`hunter_id`, `week_start`),
	FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON UPDATE no action ON DELETE no action
);
