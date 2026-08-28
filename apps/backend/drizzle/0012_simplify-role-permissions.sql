UPDATE "roles"
SET "permissions" = array_remove(
  array_remove(
    array_remove("permissions", 'versions'::"public"."permission"),
    'read:versions'::"public"."permission"
  ),
  'read:publishing'::"public"."permission"
);--> statement-breakpoint
ALTER TYPE "public"."permission" RENAME TO "permission_old";--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('content', 'publishing', 'api_keys', 'read:api_keys', 'billing', 'read:billing', 'restricted_collections', 'read:restricted_collections', 'workspace');--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" SET DATA TYPE "public"."permission"[] USING "permissions"::text[]::"public"."permission"[];--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "permissions" SET DEFAULT '{}'::"public"."permission"[];--> statement-breakpoint
DROP TYPE "public"."permission_old";
