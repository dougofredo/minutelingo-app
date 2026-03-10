# Google Play Review Instructions

## App Access Information

### Access Model
- **Tasters (previews)**: Accessible without login - reviewers can browse and listen to tasters immediately
- **Summaries (full content)**: Require user authentication - reviewers need to sign in to access summaries

### For Google Play Reviewers

**What reviewers can access without login:**
- Browse the book catalogue
- View book covers and metadata
- Listen to **taster** versions of audiobooks (preview content)
- Navigate the app interface

**What requires login:**
- Access to **summary** versions (full audiobook summaries)
- To test summaries, reviewers will need to sign in using the test account credentials provided below

### Test Account Credentials

**Email:** android
**Instructions:** 
1. Open the app
2. Navigate to the "Account" tab
3. Tap "Sign In"
4. Enter the test email address
5. Check the email inbox for the magic link
6. Click the magic link to sign in
7. Return to any book and switch from "Taster" (eye icon) to "Summary" (book icon) mode

**Note:** The app uses magic link authentication (passwordless). Reviewers will receive an email with a sign-in link.

### Alternative: Create a Test Account

If you prefer, you can create a dedicated test account in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add User" or "Invite User"
4. Enter a test email (e.g., `googleplay.reviewer@yourdomain.com`)
5. The user will receive a magic link email
6. Provide these credentials to Google Play reviewers

### What to Tell Google Play

When submitting your app, in the "App access" section, select:

**"Some functionality in my app is restricted"**

Then provide the following information:

```
Access Information:
- Tasters (preview content) are accessible without login
- Summaries (full content) require authentication
- Test account email: [YOUR_TEST_EMAIL]
- Authentication method: Magic link (passwordless) - reviewers will receive an email with sign-in link
- Instructions: Sign in via the Account tab, then switch to "Summary" mode in any book player

Reviewers can fully test the app's core functionality (browsing and tasters) without login. 
To test summaries, they can use the provided test account.
```

### Important Notes

1. **Make sure your test account email is accessible** - Google Play reviewers will need to check the email inbox for the magic link
2. **Consider creating a dedicated test email** that you can monitor
3. **Test the magic link flow yourself** before submitting to ensure it works
4. **Keep the test account active** - Don't delete it during the review process

