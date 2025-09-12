```sql
ALTER TABLE public.reviews
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
```