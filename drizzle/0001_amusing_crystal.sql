CREATE TABLE `connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`partnerId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`status` enum('pending','accepted','declined','disconnected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`accuracy` double,
	`sharingEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `partnerCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `locationSharingEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `shareExactLocation` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sharingPaused` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_partnerCode_unique` UNIQUE(`partnerCode`);--> statement-breakpoint
CREATE INDEX `connections_user_status_idx` ON `connections` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `connections_partner_status_idx` ON `connections` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `locations_user_updated_idx` ON `locations` (`userId`,`updatedAt`);