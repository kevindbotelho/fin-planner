-- Check goals and overrides for the specific Empreendimento ID found
-- Replace '97554f44-7afe-4ed8-a3b0-1c795c6e7a8e' with the ID if it was different, but I'll use the one you sent.

SELECT 'GOAL (Default)' as type, amount, created_at
FROM category_goals 
WHERE category_id = '97554f44-7afe-4ed8-a3b0-1c795c6e7a8e';

SELECT 'OVERRIDE (Month)' as type, amount, billing_period_id, created_at 
FROM category_goal_overrides 
WHERE category_id = '97554f44-7afe-4ed8-a3b0-1c795c6e7a8e';
