ALTER TABLE `events` RENAME COLUMN `maxSubmissions` TO `maxTotalSubmissions`;--> statement-breakpoint
ALTER TABLE `events` ADD `maxSubmissionsPerMember` int DEFAULT 1 NOT NULL;