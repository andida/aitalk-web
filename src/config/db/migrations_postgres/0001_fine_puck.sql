ALTER TABLE "siterise"."siterise_leaderboard_entry" ALTER COLUMN "visits" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_leaderboard_entry" ALTER COLUMN "previous_visits" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_leaderboard_entry" ALTER COLUMN "visits_delta" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_traffic_snapshot" ALTER COLUMN "visits" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_traffic_snapshot" ALTER COLUMN "users" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_traffic_snapshot" ALTER COLUMN "desktop_visits" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_traffic_snapshot" ALTER COLUMN "mobile_visits" SET DATA TYPE bigint;