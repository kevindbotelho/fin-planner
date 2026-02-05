-- 1. Check specific category details (ID, name length, hidden chars)
SELECT 
  id, 
  name, 
  length(name) as name_length,
  encode(name::bytea, 'hex') as hex_name, -- Check for hidden characters
  created_at
FROM categories
WHERE user_id = auth.uid() 
AND name ILIKE '%Empreendimento%';

-- 2. Check if a goal exists for this specific ID
SELECT *
FROM category_goals
WHERE user_id = auth.uid()
AND category_id IN (
    SELECT id FROM categories WHERE user_id = auth.uid() AND name ILIKE '%Empreendimento%'
);

-- 3. Check overrides (sanity check)
SELECT *
FROM category_goal_overrides
WHERE user_id = auth.uid()
AND category_id IN (
    SELECT id FROM categories WHERE user_id = auth.uid() AND name ILIKE '%Empreendimento%'
);
