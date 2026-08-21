ALTER TYPE "public"."key_permission" ADD VALUE 'versions' BEFORE 'collections';--> statement-breakpoint
ALTER TYPE "public"."key_permission" ADD VALUE 'read:versions' BEFORE 'collections';--> statement-breakpoint
ALTER TYPE "public"."permission" RENAME TO "permission_old";--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('content', 'versions', 'read:versions', 'api_keys', 'read:api_keys', 'billing', 'read:billing', 'workspace');--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" TYPE "public"."permission"[] USING "permissions"::text[]::"public"."permission"[];--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" SET DEFAULT '{}';--> statement-breakpoint
DROP TYPE "public"."permission_old";--> statement-breakpoint
UPDATE "roles"
SET "permissions" = array_append("permissions", 'versions'::"public"."permission")
WHERE 'content'::"public"."permission" = ANY("permissions")
  AND NOT ('versions'::"public"."permission" = ANY("permissions"));
