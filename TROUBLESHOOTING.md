# Admin Panel - Troubleshooting Guide

## Problem: "Foreign key constraint violated: Log_userId_fkey"

### Cause
The logging system tries to create a log entry with `userId: "admin"` which is not a valid UUID in the database.

### Solution
This has been fixed! The following changes were made:

1. ✅ Created `getAdminUserId()` helper function in `/src/lib/prisma.ts`
2. ✅ Updated all API routes to use `getAdminUserId()` instead of hardcoded "admin"
3. ✅ Added try-catch blocks around log creation to prevent operation failures
4. ✅ Added detailed console logging for debugging

### Verification Steps

1. **Check if you have users in the database:**
   ```bash
   node scripts/check-users.js
   ```

2. **If no users exist, create one:**
   - Go to the login page (`/login`)
   - Try to log in (this should create a user if authentication allows)
   - Or manually create a user in your database

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

4. **Test the admin panel:**
   - Go to `/admin`
   - Try creating a student
   - Check the browser console for debug logs
   - Check the terminal for server logs

## Problem: Edit button doesn't work (no response)

### Cause
The PATCH request might be failing silently due to:
1. Invalid user ID (see above)
2. Network error
3. Server error

### Solution
Debug logging has been added. Check the following:

1. **Browser Console:**
   - Look for `[Frontend]` logs
   - These will show you what data is being sent
   - Look for any error messages

2. **Terminal/Server Logs:**
   - Look for `[API]` logs
   - These will show you what data is received by the server
   - Look for any error details

### What to do if errors occur

1. **Error: "Student not found"**
   - The student ID is invalid
   - Try refreshing the page and selecting the student again

2. **Error: "Foreign key constraint violated"**
   - Run `node scripts/check-users.js` to verify users exist
   - Create a user if none exist

3. **Network Error**
   - Check if the server is running
   - Check if the API endpoint is correct
   - Check browser network tab for failed requests

## Debugging Steps

### Step 1: Check Server is Running
```bash
# The server should be running on http://localhost:3000
# Check the terminal for "ready" message
```

### Step 2: Check Database Connection
```bash
# Run the user check script
node scripts/check-users.js
```

### Step 3: Check API Endpoint
```bash
# Test the API directly
curl http://localhost:3000/api/admin/students
```

### Step 4: Check Browser Console
- Open browser DevTools (F12)
- Go to Console tab
- Look for `[Frontend]` prefixed logs
- Look for any red error messages

### Step 5: Check Server Logs
- Look at the terminal where `npm run dev` is running
- Look for `[API]` prefixed logs
- Look for any error stack traces

## Common Issues and Solutions

### Issue: Form validation fails
**Solution:** Check that all required fields are filled:
- Name, Email, Phone, School, Grade, Start Date are required

### Issue: Date format errors
**Solution:** Dates should be in YYYY-MM-DD format. The date picker should handle this automatically.

### Issue: Email already exists
**Solution:** Each student must have a unique email. Use a different email or update the existing student.

### Issue: No mentors available
**Solution:** You need to create mentors first. Go to `/admin/mentors` and add mentors.

## Success Indicators

If everything is working correctly, you should see:

✅ Browser console shows:
```
[Frontend] Creating student with data: {...}
[Frontend] Response status: 201
[Frontend] Success response: {success: true, student: {...}}
```

✅ Server console shows:
```
[API] POST /api/admin/students - Creating student...
[API] Student data: {...}
[API] Admin user ID for logging: <uuid>
[API] Log created successfully
[API] Student created successfully: {...}
```

✅ The student appears in the list immediately

## Need Help?

If you're still experiencing issues:

1. Check the browser console for `[Frontend]` logs
2. Check the server terminal for `[API]` logs
3. Run `node scripts/check-users.js` to verify database state
4. Check the Network tab in browser DevTools for failed requests

Provide this information when reporting issues:
- Browser console logs
- Server console logs
- Network request/response details
- Database user check results
