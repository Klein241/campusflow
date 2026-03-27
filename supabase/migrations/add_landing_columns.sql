-- Migration: Add landing page customization columns to organizations
-- Run this in Supabase SQL Editor

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hero_title text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hero_subtitle text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS about_text text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS about_image_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_facebook text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_instagram text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_twitter text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_tiktok text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_youtube text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_linkedin text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS footer_text text;
