ALTER TABLE `groups` ADD `gchatWebhookUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `emailNotifications` boolean DEFAULT true NOT NULL;