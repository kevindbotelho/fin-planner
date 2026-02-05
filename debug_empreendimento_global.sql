-- Search GLOBALLY for this name (ignoring user_id restriction which fails in Editor)
SELECT id, user_id, name, created_at
FROM categories
WHERE name ILIKE '%Empreendimento%';

-- Once you have the ID from above, check goals for that specific ID manually:
-- SELECT * FROM category_goals WHERE category_id = 'THE_ID_YOU_FOUND';
