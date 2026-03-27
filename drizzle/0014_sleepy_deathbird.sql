CREATE TABLE `eventTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`votingScheme` enum('tournament','simple_majority','ranked_choice','no_vote') NOT NULL,
	`maxPageCount` int,
	`allowPreviouslyRead` boolean NOT NULL DEFAULT false,
	`allowedGenres` json,
	`minRating` int,
	`anonymousSubmissions` boolean NOT NULL DEFAULT false,
	`maxTotalSubmissions` int NOT NULL DEFAULT 8,
	`maxSubmissionsPerMember` int NOT NULL DEFAULT 1,
	`adminCurated` boolean NOT NULL DEFAULT false,
	`anonymousVoting` boolean NOT NULL DEFAULT false,
	`hideTalliesUntilComplete` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventTemplates_id` PRIMARY KEY(`id`)
);
