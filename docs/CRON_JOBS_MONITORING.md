# Cron Jobs Monitoring Guide

This guide explains how to locate and monitor scheduled pg_cron function logs in your Supabase database.

## Overview

The project uses PostgreSQL's `pg_cron` extension to run scheduled cleanup tasks automatically. Two daily jobs are configured:

1. **cleanup-notifications-daily** - Runs at 23:59 UTC daily
2. **cleanup-old-system-messages** - Runs at 02:00 UTC daily

These jobs run automatically on Supabase's servers without any manual intervention required.

---

## 1. Supabase Dashboard - Database Logs Section

1. Log into your Supabase dashboard at https://supabase.com/dashboard
2. Navigate to your project
3. Click on **"Database"** in the left sidebar
4. Select **"Logs"** from the Database submenu
5. Filter logs by searching for `cleanup_old_system_messages` or `cleanup_old_notifications` to see function execution logs

---

## 2. Query pg_cron Job History

Go to the **SQL Editor** in your Supabase dashboard and run the following queries:

### View All Scheduled Jobs

```sql
SELECT * FROM cron.job;
```

This shows all configured cron jobs with their schedules, commands, and active status.

### View Job Execution History

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 100;
```

Check the following columns to verify execution:
- `status` - Whether the job succeeded or failed
- `start_time` - When the job started
- `end_time` - When the job completed
- `return_message` - Any output or error messages

### View Recent Executions for Specific Jobs

```sql
SELECT
  j.jobname,
  jrd.status,
  jrd.start_time,
  jrd.end_time,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('cleanup-old-system-messages', 'cleanup-notifications-daily')
ORDER BY jrd.start_time DESC
LIMIT 50;
```

---

## 3. Verify Jobs Are Active

In SQL Editor, run this query to confirm your jobs are scheduled and active:

```sql
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename,
  nodeport,
  database
FROM cron.job
WHERE jobname IN ('cleanup-old-system-messages', 'cleanup-notifications-daily');
```

**Expected Results:**
- `active` column should show `true` for both jobs
- `nodename` should be `localhost` (this is correct - it's internal to Supabase)
- `nodeport` should be `5432` (standard PostgreSQL port)
- `database` should be `postgres`

---

## 4. Check Function Execution Manually

Test if the cleanup functions work by manually running them in SQL Editor:

```sql
-- Test notification cleanup
SELECT cleanup_old_notifications();

-- Test system message cleanup
SELECT cleanup_old_system_messages();
```

These manual tests confirm the functions are properly deployed and working correctly.

---

## 5. Monitor Database Activity

### Using Supabase Reports

1. Go to **"Reports"** section in Supabase dashboard
2. Check the **"Database"** report for function execution patterns
3. Look for API calls or database queries related to your cleanup functions

### Check Records Being Cleaned Up

To see what records would be cleaned up, run these queries:

```sql
-- Check old notifications (older than 30 days and read)
SELECT COUNT(*)
FROM user_notifications
WHERE created_at < NOW() - INTERVAL '30 days'
AND read = true;

-- Check old system messages (older than 90 days)
SELECT COUNT(*)
FROM messages
WHERE created_at < NOW() - INTERVAL '90 days'
AND is_system_message = true;
```

---

## Understanding pg_cron Configuration

### Why localhost:5432?

When you view `cron.job` table, you'll see:
- `nodename: "localhost"`
- `nodeport: 5432`

**This is completely normal and expected!**

- pg_cron runs inside your Supabase database server
- "localhost" means it connects to itself (internal connection)
- This happens on Supabase's cloud servers, not your local machine
- Jobs run automatically without any manual intervention

### Job Schedules Explained

The schedules use standard cron format: `minute hour day month day-of-week`

- `59 23 * * *` = Every day at 23:59 (11:59 PM) UTC
- `0 2 * * *` = Every day at 02:00 (2:00 AM) UTC

---

## Troubleshooting

### Jobs Not Running

1. Verify jobs are active:
   ```sql
   SELECT jobname, active FROM cron.job;
   ```

2. Check for errors in execution history:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE status = 'failed'
   ORDER BY start_time DESC
   LIMIT 10;
   ```

3. Ensure the cleanup functions exist:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name IN ('cleanup_old_notifications', 'cleanup_old_system_messages');
   ```

### Reactivate a Job

If a job is inactive, reactivate it:

```sql
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-notifications-daily'),
  active := true
);
```

### Check Function Permissions

Ensure the functions have proper permissions:

```sql
SELECT routine_name, routine_schema, security_type
FROM information_schema.routines
WHERE routine_name IN ('cleanup_old_notifications', 'cleanup_old_system_messages');
```

---

## Best Practices

1. **Regular Monitoring**: Check `cron.job_run_details` weekly to ensure jobs are executing successfully
2. **Review Logs**: Look for any failed executions and investigate immediately
3. **Test After Changes**: Manually run cleanup functions after database schema changes
4. **Monitor Performance**: Keep an eye on execution times to detect performance degradation
5. **Backup Before Cleanup**: Ensure you have recent backups before cleanup functions delete data

---

## Additional Resources

- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [PostgreSQL Cron Syntax](https://crontab.guru/)
- Project migration files in `/supabase/migrations/`
