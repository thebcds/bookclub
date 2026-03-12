ALTER TABLE `groups` ADD `tags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `favoriteGenres` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;