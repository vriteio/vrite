CREATE UNIQUE INDEX "roles_workspace_name_unique" ON "roles" USING btree ("workspace_id",lower("name"));
