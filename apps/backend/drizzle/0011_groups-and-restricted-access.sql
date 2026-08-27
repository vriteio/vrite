CREATE TABLE "collection_group_roles" (
	"workspace_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_group_roles_collection_id_group_id_pk" PRIMARY KEY("collection_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "collection_member_roles" (
	"workspace_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_member_roles_collection_id_membership_id_pk" PRIMARY KEY("collection_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "group_invitations" (
	"workspace_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_invitations_group_id_invitation_id_pk" PRIMARY KEY("group_id","invitation_id")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"workspace_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_membership_id_pk" PRIMARY KEY("group_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_id_unique" UNIQUE("workspace_id","id");--> statement-breakpoint
ALTER TABLE "collection_group_roles" ADD CONSTRAINT "collection_group_roles_workspace_collection_fk" FOREIGN KEY ("workspace_id","collection_id") REFERENCES "public"."collections"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_group_roles" ADD CONSTRAINT "collection_group_roles_workspace_group_fk" FOREIGN KEY ("workspace_id","group_id") REFERENCES "public"."groups"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_group_roles" ADD CONSTRAINT "collection_group_roles_workspace_role_fk" FOREIGN KEY ("workspace_id","role_id") REFERENCES "public"."roles"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_member_roles" ADD CONSTRAINT "collection_member_roles_workspace_collection_fk" FOREIGN KEY ("workspace_id","collection_id") REFERENCES "public"."collections"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_member_roles" ADD CONSTRAINT "collection_member_roles_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_member_roles" ADD CONSTRAINT "collection_member_roles_workspace_role_fk" FOREIGN KEY ("workspace_id","role_id") REFERENCES "public"."roles"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_workspace_group_fk" FOREIGN KEY ("workspace_id","group_id") REFERENCES "public"."groups"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_workspace_invitation_fk" FOREIGN KEY ("workspace_id","invitation_id") REFERENCES "public"."invitations"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_workspace_group_fk" FOREIGN KEY ("workspace_id","group_id") REFERENCES "public"."groups"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_group_roles_group_id_idx" ON "collection_group_roles" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "collection_group_roles_role_id_idx" ON "collection_group_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "collection_member_roles_membership_id_idx" ON "collection_member_roles" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "collection_member_roles_role_id_idx" ON "collection_member_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "group_invitations_invitation_id_idx" ON "group_invitations" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "group_members_membership_id_idx" ON "group_members" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_workspace_name_unique" ON "groups" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE INDEX "groups_workspace_id_idx" ON "groups" USING btree ("workspace_id");
