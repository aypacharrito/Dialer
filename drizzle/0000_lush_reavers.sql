CREATE TABLE `inbound_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text,
	`source` text DEFAULT 'SmartFinancial' NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`phone_digits` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`city` text DEFAULT 'Imported' NOT NULL,
	`product` text DEFAULT 'Home & Auto' NOT NULL,
	`line` text DEFAULT 'home-auto' NOT NULL,
	`disposition` text DEFAULT 'Received - not worked yet' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`cost` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_leads_phone_digits_unique` ON `inbound_leads` (`phone_digits`);--> statement-breakpoint
CREATE INDEX `inbound_leads_created_at_idx` ON `inbound_leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `inbound_leads_line_idx` ON `inbound_leads` (`line`);