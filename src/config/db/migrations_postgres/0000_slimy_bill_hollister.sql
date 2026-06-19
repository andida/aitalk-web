CREATE SCHEMA IF NOT EXISTS "siterise";
--> statement-breakpoint
CREATE TABLE "siterise"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siterise"."ai_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_type" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"options" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"task_id" text,
	"task_info" text,
	"task_result" text,
	"cost_credits" integer DEFAULT 0 NOT NULL,
	"scene" text DEFAULT '' NOT NULL,
	"credit_id" text
);
--> statement-breakpoint
CREATE TABLE "siterise"."apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "siterise"."chat" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"parts" text NOT NULL,
	"metadata" text,
	"content" text
);
--> statement-breakpoint
CREATE TABLE "siterise"."chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text NOT NULL,
	"parts" text NOT NULL,
	"metadata" text,
	"model" text NOT NULL,
	"provider" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siterise"."config" (
	"name" text NOT NULL,
	"value" text,
	CONSTRAINT "config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "siterise"."credit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"order_no" text,
	"subscription_no" text,
	"transaction_no" text NOT NULL,
	"transaction_type" text NOT NULL,
	"transaction_scene" text,
	"credits" integer NOT NULL,
	"remaining_credits" integer DEFAULT 0 NOT NULL,
	"description" text,
	"expires_at" timestamp,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"consumed_detail" text,
	"metadata" text,
	CONSTRAINT "credit_transaction_no_unique" UNIQUE("transaction_no")
);
--> statement-breakpoint
CREATE TABLE "siterise"."order" (
	"id" text PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"product_id" text,
	"payment_type" text,
	"payment_interval" text,
	"payment_provider" text NOT NULL,
	"payment_session_id" text,
	"checkout_info" text NOT NULL,
	"checkout_result" text,
	"payment_result" text,
	"discount_code" text,
	"discount_amount" integer,
	"discount_currency" text,
	"payment_email" text,
	"payment_amount" integer,
	"payment_currency" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"description" text,
	"product_name" text,
	"subscription_id" text,
	"subscription_result" text,
	"checkout_url" text,
	"callback_url" text,
	"credits_amount" integer,
	"credits_valid_days" integer,
	"plan_name" text,
	"payment_product_id" text,
	"invoice_id" text,
	"invoice_url" text,
	"subscription_no" text,
	"transaction_id" text,
	"payment_user_name" text,
	"payment_user_id" text,
	CONSTRAINT "order_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "siterise"."permission" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "permission_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "siterise"."post" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"description" text,
	"image" text,
	"content" text,
	"categories" text,
	"tags" text,
	"author_name" text,
	"author_image" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "siterise"."role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "siterise"."role_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "siterise"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "siterise"."siterise_domain" (
	"id" text PRIMARY KEY NOT NULL,
	"root_domain" text NOT NULL,
	"hostname" text,
	"tld" text,
	"title" text,
	"description" text,
	"category" text,
	"country" text,
	"first_seen_at" timestamp,
	"registered_at" timestamp,
	"source" text DEFAULT 'query_domains' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "siterise_domain_root_domain_unique" UNIQUE("root_domain")
);
--> statement-breakpoint
CREATE TABLE "siterise"."siterise_leaderboard_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"root_domain" text NOT NULL,
	"rank" integer NOT NULL,
	"visits" integer,
	"previous_visits" integer,
	"visits_delta" integer,
	"growth_rate" double precision,
	"score" double precision,
	"signal" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siterise"."siterise_leaderboard_run" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"display_date" date NOT NULL,
	"country" text DEFAULT 'global' NOT NULL,
	"category" text,
	"source" text DEFAULT 'query_domains' NOT NULL,
	"min_visits" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siterise"."siterise_traffic_query_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"ip_hash" text,
	"endpoint" text NOT NULL,
	"provider" text DEFAULT 'query_domains' NOT NULL,
	"targets" jsonb,
	"target_count" integer DEFAULT 1 NOT NULL,
	"country" text DEFAULT 'global' NOT NULL,
	"display_date" date,
	"status" text NOT NULL,
	"error_code" text,
	"latency_ms" integer,
	"cached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siterise"."siterise_traffic_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"root_domain" text NOT NULL,
	"display_date" date NOT NULL,
	"country" text DEFAULT 'global' NOT NULL,
	"device_type" text DEFAULT 'all' NOT NULL,
	"source" text DEFAULT 'query_domains' NOT NULL,
	"visits" integer,
	"users" integer,
	"desktop_visits" integer,
	"mobile_visits" integer,
	"bounce_rate" double precision,
	"pages_per_visit" double precision,
	"time_on_site" integer,
	"accuracy" text,
	"raw" jsonb,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"cache_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siterise"."siterise_watchlist" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"domain_id" text,
	"root_domain" text NOT NULL,
	"label" text,
	"country" text DEFAULT 'global' NOT NULL,
	"alert_enabled" boolean DEFAULT false NOT NULL,
	"alert_threshold" double precision,
	"status" text DEFAULT 'active' NOT NULL,
	"last_checked_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siterise"."subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_no" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"status" text NOT NULL,
	"payment_provider" text NOT NULL,
	"subscription_id" text NOT NULL,
	"subscription_result" text,
	"product_id" text,
	"description" text,
	"amount" integer,
	"currency" text,
	"interval" text,
	"interval_count" integer,
	"trial_period_days" integer,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"plan_name" text,
	"billing_url" text,
	"product_name" text,
	"credits_amount" integer,
	"credits_valid_days" integer,
	"payment_product_id" text,
	"payment_user_id" text,
	"canceled_at" timestamp,
	"canceled_end_at" timestamp,
	"canceled_reason" text,
	"canceled_reason_type" text,
	CONSTRAINT "subscription_subscription_no_unique" UNIQUE("subscription_no")
);
--> statement-breakpoint
CREATE TABLE "siterise"."taxonomy" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image" text,
	"icon" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "taxonomy_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "siterise"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"utm_source" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"locale" text DEFAULT '' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "siterise"."user_role" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "siterise"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "siterise"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."ai_task" ADD CONSTRAINT "ai_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."chat_message" ADD CONSTRAINT "chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."chat_message" ADD CONSTRAINT "chat_message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "siterise"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."credit" ADD CONSTRAINT "credit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."post" ADD CONSTRAINT "post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "siterise"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "siterise"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_leaderboard_entry" ADD CONSTRAINT "siterise_leaderboard_entry_run_id_siterise_leaderboard_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "siterise"."siterise_leaderboard_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_leaderboard_entry" ADD CONSTRAINT "siterise_leaderboard_entry_domain_id_siterise_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "siterise"."siterise_domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_traffic_query_log" ADD CONSTRAINT "siterise_traffic_query_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_traffic_snapshot" ADD CONSTRAINT "siterise_traffic_snapshot_domain_id_siterise_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "siterise"."siterise_domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_watchlist" ADD CONSTRAINT "siterise_watchlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."siterise_watchlist" ADD CONSTRAINT "siterise_watchlist_domain_id_siterise_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "siterise"."siterise_domain"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."taxonomy" ADD CONSTRAINT "taxonomy_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "siterise"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siterise"."user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "siterise"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "siterise"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_account_provider_account" ON "siterise"."account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_ai_task_user_media_type" ON "siterise"."ai_task" USING btree ("user_id","media_type");--> statement-breakpoint
CREATE INDEX "idx_ai_task_media_type_status" ON "siterise"."ai_task" USING btree ("media_type","status");--> statement-breakpoint
CREATE INDEX "idx_apikey_user_status" ON "siterise"."apikey" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_apikey_key_status" ON "siterise"."apikey" USING btree ("key","status");--> statement-breakpoint
CREATE INDEX "idx_chat_user_status" ON "siterise"."chat" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_chat_message_chat_id" ON "siterise"."chat_message" USING btree ("chat_id","status");--> statement-breakpoint
CREATE INDEX "idx_chat_message_user_id" ON "siterise"."chat_message" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_credit_consume_fifo" ON "siterise"."credit" USING btree ("user_id","status","transaction_type","remaining_credits","expires_at");--> statement-breakpoint
CREATE INDEX "idx_credit_order_no" ON "siterise"."credit" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "idx_credit_subscription_no" ON "siterise"."credit" USING btree ("subscription_no");--> statement-breakpoint
CREATE INDEX "idx_order_user_status_payment_type" ON "siterise"."order" USING btree ("user_id","status","payment_type");--> statement-breakpoint
CREATE INDEX "idx_order_transaction_provider" ON "siterise"."order" USING btree ("transaction_id","payment_provider");--> statement-breakpoint
CREATE INDEX "idx_order_created_at" ON "siterise"."order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_permission_resource_action" ON "siterise"."permission" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "idx_post_type_status" ON "siterise"."post" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_role_status" ON "siterise"."role" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_role_permission_role_permission" ON "siterise"."role_permission" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_session_user_expires" ON "siterise"."session" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_siterise_domain_tld" ON "siterise"."siterise_domain" USING btree ("tld");--> statement-breakpoint
CREATE INDEX "idx_siterise_domain_category" ON "siterise"."siterise_domain" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_siterise_domain_first_seen" ON "siterise"."siterise_domain" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX "idx_siterise_domain_registered" ON "siterise"."siterise_domain" USING btree ("registered_at");--> statement-breakpoint
CREATE INDEX "idx_siterise_domain_status" ON "siterise"."siterise_domain" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_siterise_leaderboard_entry_run_domain" ON "siterise"."siterise_leaderboard_entry" USING btree ("run_id","domain_id");--> statement-breakpoint
CREATE INDEX "idx_siterise_leaderboard_entry_rank" ON "siterise"."siterise_leaderboard_entry" USING btree ("run_id","rank");--> statement-breakpoint
CREATE INDEX "idx_siterise_leaderboard_entry_growth" ON "siterise"."siterise_leaderboard_entry" USING btree ("run_id","growth_rate");--> statement-breakpoint
CREATE INDEX "idx_siterise_leaderboard_entry_root_domain" ON "siterise"."siterise_leaderboard_entry" USING btree ("root_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_siterise_leaderboard_run_scope" ON "siterise"."siterise_leaderboard_run" USING btree ("kind","display_date","country","category","source");--> statement-breakpoint
CREATE INDEX "idx_siterise_leaderboard_run_status" ON "siterise"."siterise_leaderboard_run" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_siterise_query_log_user_created" ON "siterise"."siterise_traffic_query_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_siterise_query_log_endpoint_created" ON "siterise"."siterise_traffic_query_log" USING btree ("endpoint","created_at");--> statement-breakpoint
CREATE INDEX "idx_siterise_query_log_ip_created" ON "siterise"."siterise_traffic_query_log" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_siterise_snapshot_domain_month_market" ON "siterise"."siterise_traffic_snapshot" USING btree ("domain_id","display_date","country","device_type","source");--> statement-breakpoint
CREATE INDEX "idx_siterise_snapshot_month_country_visits" ON "siterise"."siterise_traffic_snapshot" USING btree ("display_date","country","visits");--> statement-breakpoint
CREATE INDEX "idx_siterise_snapshot_root_domain" ON "siterise"."siterise_traffic_snapshot" USING btree ("root_domain");--> statement-breakpoint
CREATE INDEX "idx_siterise_snapshot_cache_until" ON "siterise"."siterise_traffic_snapshot" USING btree ("cache_until");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_siterise_watchlist_user_domain_country" ON "siterise"."siterise_watchlist" USING btree ("user_id","root_domain","country");--> statement-breakpoint
CREATE INDEX "idx_siterise_watchlist_user_status" ON "siterise"."siterise_watchlist" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_siterise_watchlist_domain" ON "siterise"."siterise_watchlist" USING btree ("root_domain");--> statement-breakpoint
CREATE INDEX "idx_subscription_user_status_interval" ON "siterise"."subscription" USING btree ("user_id","status","interval");--> statement-breakpoint
CREATE INDEX "idx_subscription_provider_id" ON "siterise"."subscription" USING btree ("subscription_id","payment_provider");--> statement-breakpoint
CREATE INDEX "idx_subscription_created_at" ON "siterise"."subscription" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_taxonomy_type_status" ON "siterise"."taxonomy" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_user_name" ON "siterise"."user" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_user_created_at" ON "siterise"."user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_role_user_expires" ON "siterise"."user_role" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "siterise"."verification" USING btree ("identifier");
