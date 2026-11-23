CREATE TABLE `shiftmate_workspace_state` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text NOT NULL
);
