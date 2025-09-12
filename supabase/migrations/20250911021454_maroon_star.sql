```sql
DROP POLICY IF EXISTS "Allow public read access to reviews" ON public.reviews;

CREATE POLICY "Allow public read access to approved reviews"
ON public.reviews FOR SELECT
TO public
USING (status = 'approved');
```