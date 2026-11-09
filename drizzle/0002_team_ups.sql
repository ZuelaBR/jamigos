CREATE TABLE `team_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`jam_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`team_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`jam_id`) REFERENCES `jams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `team_ups_to_idx` ON `team_ups` (`to_user_id`);--> statement-breakpoint
CREATE INDEX `team_ups_from_idx` ON `team_ups` (`from_user_id`);--> statement-breakpoint
CREATE INDEX `team_ups_jam_idx` ON `team_ups` (`jam_id`);