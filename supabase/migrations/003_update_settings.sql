-- Update settings for World Cup 2026
-- Lock deadline: 12 June 2026 at 20:00 Spain time (CEST = UTC+2)
-- So UTC time is 2026-06-12T18:00:00Z

UPDATE public.settings 
SET lock_deadline = '2026-06-12T18:00:00Z'::timestamptz 
WHERE id = 1;
