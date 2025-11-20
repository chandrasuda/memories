-- Add category column to memories table
alter table memories
add column if not exists category text;

