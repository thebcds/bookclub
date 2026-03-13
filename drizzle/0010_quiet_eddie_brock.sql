ALTER TABLE `events` ADD `anonymousVoting` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `hideTalliesUntilComplete` boolean DEFAULT false NOT NULL;