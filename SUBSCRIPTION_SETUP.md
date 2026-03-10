# Subscription Setup Guide

This guide will help you set up in-app purchase subscriptions for your audiobook app.

## Prerequisites

1. **Expo Dev Client**: Since `react-native-iap` requires native code, you'll need to use Expo Dev Client instead of Expo Go.
2. **App Store Connect Account** (for iOS)
3. **Google Play Console Account** (for Android)
4. **Supabase Project** with Edge Functions enabled

## Step 1: Configure Product IDs

The app uses the following product IDs (defined in `hooks/use-subscription.ts`):

- **iOS Monthly**: `com.minutelingo.app.subscription.monthly`
- **iOS Yearly**: `com.minutelingo.app.subscription.yearly`
- **Android Monthly**: `minutelingo.monthly`

You can modify these in `hooks/use-subscription.ts` if needed.

## Step 2: Set Up iOS Subscriptions (App Store Connect)

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to your app → **Features** → **In-App Purchases**
3. Click the **+** button to create a new subscription
4. Create a subscription group (e.g., "Premium Subscription")
5. Add two subscription products:
   - **Monthly Subscription**
     - Product ID: `com.minutelingo.app.subscription.monthly`
     - Duration: 1 Month
     - Price: Set your desired price
   - **Yearly Subscription**
     - Product ID: `com.minutelingo.app.subscription.yearly`
     - Duration: 1 Year
     - Price: Set your desired price (typically 10-12x monthly for better value)

6. Fill in all required metadata (name, description, etc.)
7. Submit for review along with your app

## Step 3: Set Up Android Subscriptions (Google Play Console)

1. Go to [Google Play Console](https://play.google.com/console/)
2. Navigate to your app → **Monetize** → **Subscriptions**
3. Click **Create subscription**
4. Create two subscriptions:
   - **Monthly Subscription**
     - Product ID: `minutelingo.monthly`
     - Billing period: Monthly
     - Price: Set your desired price
   - **Yearly Subscription** (if needed)
     - Product ID: `minutelingo.yearly`
     - Billing period: Yearly
     - Price: Set your desired price

5. Activate both subscriptions
6. Set up subscription base plans and offers

## Step 4: Set Up Supabase Database

The app uses the `profiles` table to track subscription status. Ensure your `profiles` table has the following columns:

- `id` (UUID, references auth.users)
- `has_access` (BOOLEAN, default false) - indicates if user has active subscription
- `price_id` (TEXT) - stores the product ID of the subscription
- `customer_id` (TEXT, optional) - for Stripe integration if needed

The app will automatically check `profiles.has_access` to determine subscription status.

## Step 5: Create Supabase Edge Function (Optional but Recommended)

For production, you should verify purchase receipts on your backend. Create a Supabase Edge Function:

1. Install Supabase CLI: `npm install -g supabase`
2. Initialize Supabase in your project: `supabase init`
3. Create the function: `supabase functions new verify-purchase`

Then add this code to `supabase/functions/verify-purchase/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { purchase, userId } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify purchase with Apple/Google
    // This is a simplified example - you should implement proper receipt verification
    // For iOS: Verify with Apple's App Store Server API
    // For Android: Verify with Google Play Developer API

    // Update user's profile to grant access
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({
        has_access: true,
        price_id: purchase.productId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        subscription: {
          product_id: purchase.productId,
          has_access: true,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

Deploy the function: `supabase functions deploy verify-purchase`

## Step 6: Build with Expo Dev Client

Since `react-native-iap` requires native code, you need to build a development client:

```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android

# Or build with EAS
eas build --profile development --platform ios
eas build --profile development --platform android
```

## Step 7: Testing

### iOS Testing
1. Use a sandbox test account in App Store Connect
2. Sign out of your regular Apple ID in Settings → App Store
3. When prompted during purchase, sign in with your sandbox account
4. Test purchases won't charge real money

### Android Testing
1. Add test accounts in Google Play Console → Settings → License Testing
2. Upload your app as an internal test track
3. Install the app and test purchases
4. Test purchases won't charge real money

## Troubleshooting

### "Product not found" error
- Ensure product IDs match exactly between your code and App Store Connect/Google Play Console
- Make sure subscriptions are approved and active
- For iOS, ensure you're using a sandbox account
- For Android, ensure the app is published to at least an internal test track

### Purchase not completing
- Check that you're using Expo Dev Client, not Expo Go
- Verify your app's bundle ID matches your store configuration
- Check device logs for detailed error messages

### Subscription status not updating
- Verify the `profiles` table exists and has `has_access` and `price_id` columns
- Check that RLS policies allow the user to read/update their profile
- Ensure the Edge Function (if used) is deployed and accessible
- Verify the Edge Function is updating `profiles.has_access = true` correctly

## Additional Resources

- [react-native-iap Documentation](https://github.com/dooboolab/react-native-iap)
- [Apple In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing Guide](https://developer.android.com/google/play/billing)
- [Expo Dev Client Documentation](https://docs.expo.dev/development/introduction/)


