-- Fix rental_properties area_sqm constraint
-- Allow NULL or positive values for area_sqm

ALTER TABLE rental_properties
DROP CONSTRAINT IF EXISTS rental_properties_area_sqm_check;

ALTER TABLE rental_properties
ADD CONSTRAINT rental_properties_area_sqm_check
CHECK (area_sqm IS NULL OR area_sqm > 0);
