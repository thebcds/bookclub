CREATE TABLE `groupMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groupMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invitations` MODIFY COLUMN `role` enum('member','admin') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `books` ADD `groupId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `groupId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `chatMessages` ADD `groupId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `groupId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `invitations` ADD `groupId` int NOT NULL;