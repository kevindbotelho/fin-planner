-- FORCE FIX for Empreendimento
-- 1. Delete all "Blocking" 0% monthly overrides for this category
DELETE FROM category_goal_overrides
WHERE category_id = '97554f44-7afe-4ed8-a3b0-1c795c6e7a8e';

-- 2. Force insert a default goal of 10% (just to test persistence)
INSERT INTO category_goals (user_id, category_id, amount)
VALUES (
    '6dcd965f-c956-43ba-aca1-3365ea0b0f92', -- Your user_id from the previous query
    '97554f44-7afe-4ed8-a3b0-1c795c6e7a8e', -- The category_id
    10 -- Starting with 10%
)
ON CONFLICT (user_id, category_id) 
DO UPDATE SET amount = 10;

-- 3. Verify the result
SELECT * FROM category_goals WHERE category_id = '97554f44-7afe-4ed8-a3b0-1c795c6e7a8e';
