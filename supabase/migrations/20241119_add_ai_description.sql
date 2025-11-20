-- Add ai_description column to store AI-generated image descriptions
-- This is separate from content so it doesn't interfere with the UI
alter table memories
add column if not exists ai_description text;
