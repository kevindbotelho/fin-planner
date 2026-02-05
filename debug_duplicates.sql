-- Check for duplicate category names for the current user
SELECT name, count(*)
FROM categories
WHERE user_id = auth.uid()
GROUP BY name
HAVING count(*) > 1;

-- To fix (be careful, this deletes duplicates arbitrarily, keeping the one with the smallest ID - usually the oldest)
/*
DELETE FROM categories
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (partition BY name ORDER BY id ASC) as rnum
    FROM categories
    WHERE user_id = auth.uid()
  ) t
  WHERE t.rnum > 1
);
*/
