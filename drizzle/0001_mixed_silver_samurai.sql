CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`author` varchar(512) NOT NULL,
	`genre` varchar(128),
	`pageCount` int,
	`coverUrl` text,
	`rating` int,
	`isbn` varchar(20),
	`description` text,
	`hasBeenRead` boolean NOT NULL DEFAULT false,
	`readDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brackets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`conference` enum('A','B') NOT NULL,
	`round` int NOT NULL,
	`matchOrder` int NOT NULL,
	`book1Id` int,
	`book2Id` int,
	`book1Seed` int,
	`book2Seed` int,
	`winnerId` int,
	`status` enum('pending','voting','completed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brackets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`eventType` enum('submission_deadline','voting_deadline','reading_milestone','meeting','custom') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`relatedEventId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendarEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`eventId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`votingScheme` enum('tournament','simple_majority','ranked_choice') NOT NULL,
	`status` enum('submissions_open','voting','completed','cancelled') NOT NULL DEFAULT 'submissions_open',
	`maxPageCount` int,
	`allowPreviouslyRead` boolean NOT NULL DEFAULT false,
	`allowedGenres` json,
	`minRating` int,
	`anonymousSubmissions` boolean NOT NULL DEFAULT false,
	`maxSubmissions` int NOT NULL DEFAULT 8,
	`submissionDeadline` timestamp,
	`votingDeadline` timestamp,
	`readingDeadline` timestamp,
	`winningBookId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`invitedBy` int NOT NULL,
	`email` varchar(320),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`acceptedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `readingMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`targetDate` timestamp NOT NULL,
	`targetPage` int,
	`targetPercent` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readingMilestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`eventId` int NOT NULL,
	`didWin` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`bookId` int NOT NULL,
	`submittedBy` int NOT NULL,
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`bracketId` int,
	`userId` int NOT NULL,
	`bookId` int NOT NULL,
	`rankings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `votes_id` PRIMARY KEY(`id`)
);
