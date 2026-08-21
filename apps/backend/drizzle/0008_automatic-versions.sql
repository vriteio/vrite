CREATE TABLE "entry_version_activity" (
	"entry_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"first_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	CONSTRAINT "entry_version_activity_workspace_entry_unique" UNIQUE("workspace_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE "entry_version_activity_contributors" (
	"workspace_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	CONSTRAINT "entry_version_activity_contributors_entry_id_membership_id_pk" PRIMARY KEY("entry_id","membership_id")
);
--> statement-breakpoint
ALTER TABLE "entry_version_activity" ADD CONSTRAINT "entry_version_activity_workspace_entry_fk" FOREIGN KEY ("workspace_id","entry_id") REFERENCES "public"."entries"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_version_activity_contributors" ADD CONSTRAINT "entry_version_activity_contributors_workspace_entry_fk" FOREIGN KEY ("workspace_id","entry_id") REFERENCES "public"."entry_version_activity"("workspace_id","entry_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_version_activity_contributors" ADD CONSTRAINT "entry_version_activity_contributors_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_version_activity_due_at_idx" ON "entry_version_activity" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "entry_version_activity_contributors_workspace_membership_idx" ON "entry_version_activity_contributors" USING btree ("workspace_id","membership_id");