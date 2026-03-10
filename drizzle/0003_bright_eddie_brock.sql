CREATE TABLE `bookReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`bookId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`reviewText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `readingProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`currentPage` int NOT NULL DEFAULT 0,
	`totalPages` int,
	`percentComplete` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readingProgress_id` PRIMARY KEY(`id`)
);
