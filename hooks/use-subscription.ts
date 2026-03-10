import { isFree } from '@/constants/config';
import { useToast } from '@/contexts/toast-context';
import { supabase } from '@/supabaseClient';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// react-native-iap is a native-only module and will crash on web/SSR if imported unconditionally.
// We require it at runtime only on iOS/Android.
let RNIap: typeof import('react-native-iap') | null = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RNIap = require('react-native-iap');
  } catch (error) {
    console.warn('In-app purchases are not available in this environment:', error);
  }
}

// Set to true to disable IAP on iOS (avoids StoreKit "No active account" when not signed into App Store / products not set up)
const IAP_DISABLED_ON_IOS = false;

// One-time purchase product IDs - These need to be configured in App Store Connect and Google Play Console
// For testing, use sandbox product IDs
const PRODUCT_IDS = Platform.select({
  ios: IAP_DISABLED_ON_IOS ? [] : ['com.minutelingo.app.premium'],
  android: [
    'minutelingo_premium', // Product ID from Google Play Console
  ],
  default: [],
}) as string[];

export interface SubscriptionStatus {
  isSubscribed: boolean;
  productId: string | null;
  isActive: boolean;
  loading: boolean;
}

export function useSubscription() {
  const { showError, showSuccess, showWarning, showInfo } = useToast();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(() =>
    isFree
      ? { isSubscribed: true, productId: null, isActive: true, loading: false }
      : { isSubscribed: false, productId: null, isActive: false, loading: true }
  );
  const [availableProducts, setAvailableProducts] = useState<import('react-native-iap').Product[]>([]);
  const [purchases, setPurchases] = useState<import('react-native-iap').Purchase[]>([]);
  const [loading, setLoading] = useState(!isFree);

  // Initialize IAP connection (skipped when isFree)
  useEffect(() => {
    if (isFree) {
      setLoading(false);
      return;
    }
    let purchaseUpdateSubscription: { remove: () => void } | null = null;
    let purchaseErrorSubscription: { remove: () => void } | null = null;

    const initIAP = async () => {
      try {
        // If the IAP module isn't available (web, Expo Go, or SSR), skip setup gracefully.
        if (!RNIap) {
          console.log('IAP not initialized because react-native-iap is unavailable on this platform.');
          setAvailableProducts([]);
          setLoading(false);
          await checkSubscriptionStatus([]);
          return;
        }
        // Skip IAP on iOS when disabled (avoids StoreKit errors until App Store Connect / sandbox is set up)
        if (Platform.OS === 'ios' && IAP_DISABLED_ON_IOS) {
          setAvailableProducts([]);
          setLoading(false);
          await checkSubscriptionStatus([]);
          return;
        }

        // Check if running in Expo Go (which doesn't support IAP)
        const isExpoGo = Constants.executionEnvironment === 'storeClient';
        if (isExpoGo) {
          throw new Error('In-app purchases require Expo Dev Client or production build. Expo Go does not support IAP.');
        }

        console.log('🔌 Initializing IAP connection...');
        console.log('Platform:', Platform.OS);
        console.log('Product IDs:', PRODUCT_IDS);
        
        // Initialize connection
        await RNIap.initConnection();
        console.log('✅ IAP connection initialized');

        // Get available products (v14 API uses fetchProducts instead of getProducts)
        try {
          console.log('📦 Requesting products with IDs:', PRODUCT_IDS);
          const products = await RNIap.fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' });
          console.log('📦 Fetched products response:', JSON.stringify(products, null, 2));
          console.log('📦 Products array length:', products?.length || 0);
          
          if (products && products.length > 0) {
            setAvailableProducts(products as RNIap.Product[]);
            console.log('✅ Available products set:', products.map((p: any) => ({
              id: p.id || p.productId,
              title: p.title,
              price: p.localizedPrice || p.price
            })));
          } else {
            console.log('⚠️ No products returned from fetchProducts');
            console.log('   Requested IDs:', PRODUCT_IDS);
            console.log('   This usually means:');
            console.log('   - Product IDs not configured in Google Play Console');
            console.log('   - App not published to a test track (Internal/Alpha/Beta)');
            console.log('   - Products not set to Active in Google Play Console');
            console.log('   - Need to wait 2-3 hours after publishing products');
            console.log('   - App must be installed from Play Store, not sideloaded');
            setAvailableProducts([]);
          }
        } catch (fetchError: any) {
          console.error('❌ Error fetching products:', fetchError);
          console.error('   Error code:', fetchError.code);
          console.error('   Error message:', fetchError.message);
          console.error('   Full error:', JSON.stringify(fetchError, null, 2));
          setAvailableProducts([]);
        }

        // Get existing purchases
        const existingPurchases = await RNIap.getAvailablePurchases();
        setPurchases(existingPurchases);
        console.log('🛒 Existing purchases:', existingPurchases.map(p => p.productId));

        // Check subscription status
        await checkSubscriptionStatus(existingPurchases);

        // Set up purchase listeners
        purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
          async (purchase: RNIap.Purchase) => {
            console.log('💰 Purchase updated listener triggered');
            console.log('💰 Purchase object:', JSON.stringify(purchase, null, 2));
            await handlePurchase(purchase);
          }
        );

        purchaseErrorSubscription = RNIap.purchaseErrorListener(
          (error: RNIap.PurchaseError) => {
            console.error('❌ Purchase error:', error);
            showError(error.message || 'An error occurred during purchase');
          }
        );

        setLoading(false);
      } catch (error: any) {
        setLoading(false);

        // On iOS Simulator, StoreKit fails — handle gracefully instead of error spam
        const isIosSimulatorOrUnavailable =
          Platform.OS === 'ios' &&
          (error?.message?.includes('connect') ||
            error?.message?.includes('StoreKit') ||
            error?.message?.includes('iTunes') ||
            error?.code === 'E_IAP_NOT_AVAILABLE' ||
            error?.code === 'E_SERVICE_ERROR');

        if (isIosSimulatorOrUnavailable) {
          console.warn(
            '⚠️ IAP not available (e.g. iOS Simulator). Use a real device to test purchases. Product IDs:',
            PRODUCT_IDS
          );
          await checkSubscriptionStatus([]);
          showInfo("In-app purchases aren't available here. Use a device to purchase premium.");
          return;
        }

        console.error('❌ IAP initialization error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Platform:', Platform.OS);
        console.error('Product IDs being requested:', PRODUCT_IDS);

        await checkSubscriptionStatus([]);

        const errorCode = error.code || 'UNKNOWN';
        const errorMessage = error.message || 'Failed to initialize in-app purchases';
        const errorString = error.toString();
        const errorJson = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        
        // Build full error display
        const fullErrorDetails = `
═══════════════════════════════════
FULL ERROR DETAILS
═══════════════════════════════════

Error Code: ${errorCode}
Error Message: ${errorMessage}
Error String: ${errorString}

Platform: ${Platform.OS}
Product IDs: ${PRODUCT_IDS.join(', ')}

Full Error Object:
${errorJson}

═══════════════════════════════════
TROUBLESHOOTING
═══════════════════════════════════
${errorCode === 'E_SERVICE_ERROR' || errorCode === 'E_ITEM_UNAVAILABLE' 
  ? '• App not published to Google Play test track\n• Product "minutelingo_premium" not active\n• Product ID mismatch\n• App must be installed from Play Store'
  : errorCode === 'E_NETWORK_ERROR'
  ? '• Check internet connection\n• Google Play Services unavailable'
  : errorMessage.includes('Expo Go')
  ? '• Use dev client: eas build --profile development\n• Or: npx expo run:android'
  : '• Ensure app published to Internal Test track\n• Verify product is Active\n• Install from Play Store (not sideloaded)\n• Check Google Play Services\n• Wait 2-3 hours after publishing'}
        `.trim();
        
        // Show toast with error message (truncated for toast)
        showError(errorMessage, 8000);
      }
    };

    initIAP();

    return () => {
      // Cleanup
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }
      if (RNIap) {
        RNIap.endConnection();
      }
    };
  }, []);

  // When user signs in, link any guest purchases to their account
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user?.id) return;
      if (!RNIap) return;

      try {
        const storePurchases = await RNIap.getAvailablePurchases();
        const premiumPurchase = storePurchases.find(
          (p) => p.productId && PRODUCT_IDS.includes(p.productId)
        );

        if (premiumPurchase) {
          console.log('🔗 Linking guest purchase to account after sign-in');
          setPurchases(storePurchases);
          await verifyPurchaseWithBackend(premiumPurchase);
          showSuccess('Premium linked to your account! Available on all your devices.');
        }
      } catch (err: any) {
        // IAP may not be initialized (e.g. Expo Go, simulator) — ignore
        if (err?.message?.includes('Expo Go') || err?.code === 'E_IAP_NOT_AVAILABLE') return;
        console.warn('Could not link purchases on sign-in:', err?.message);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSubscriptionStatus = async (purchases: RNIap.Purchase[] = []) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Check local/store purchases first (works for both guests and signed-in users)
      const activePurchase = purchases.find((purchase) => {
        return purchase.productId && PRODUCT_IDS.includes(purchase.productId);
      });

      if (activePurchase) {
        const productId = activePurchase.productId || (activePurchase as any).id;
        if (session?.user?.id) {
          // Signed in + local purchase: backend was already updated at purchase or sign-in link.
          // Avoid re-calling verifyPurchaseWithBackend on every init (reduces profile webhook spam).
          setSubscriptionStatus({
            isSubscribed: true,
            productId: productId,
            isActive: true,
            loading: false,
          });
        } else {
          // Guest: premium from this device's store purchase only
          setSubscriptionStatus({
            isSubscribed: true,
            productId: productId,
            isActive: true,
            loading: false,
          });
        }
        return;
      }

      if (!session?.user?.id) {
        setSubscriptionStatus({
          isSubscribed: false,
          productId: null,
          isActive: false,
          loading: false,
        });
        return;
      }

      // Signed in but no local purchase: check profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('has_access, price_id')
        .eq('id', session.user.id)
        .single();

      if (profile && !error) {
        setSubscriptionStatus({
          isSubscribed: profile.has_access,
          productId: profile.price_id || null,
          isActive: profile.has_access,
          loading: false,
        });
      } else {
        setSubscriptionStatus({
          isSubscribed: false,
          productId: null,
          isActive: false,
          loading: false,
        });
      }
    } catch (error: any) {
      console.error('Error checking subscription status:', error);
      setSubscriptionStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const verifyPurchaseWithBackend = async (purchase: RNIap.Purchase) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const productId = purchase.productId || (purchase as any).id;

      // Guest (no account): grant premium on this device only; no backend
      if (!session?.user?.id) {
        setSubscriptionStatus({
          isSubscribed: true,
          productId: productId,
          isActive: true,
          loading: false,
        });
        if (purchase.purchaseToken || purchase.transactionId) {
          await RNIap.finishTransaction({ purchase, isConsumable: false });
        }
        return;
      }

      console.log('🔐 Verifying purchase for product:', productId);

      // Try to use Edge Function first (for production receipt verification)
      let backendUpdated = false;
      try {
        const { data, error } = await supabase.functions.invoke('verify-purchase', {
          body: {
            purchase: {
              productId: productId,
              transactionReceipt: (purchase as any).transactionReceipt || purchase.purchaseToken || purchase.transactionId,
              transactionId: purchase.transactionId,
              platform: Platform.OS,
            },
            userId: session.user.id,
          },
        });

        if (!error && data?.subscription) {
          console.log('✅ Purchase verified via Edge Function');
          backendUpdated = true;
        }
      } catch (edgeFunctionError: any) {
        console.warn('⚠️ Edge Function not available, using direct database update:', edgeFunctionError.message);
      }

      // Fallback: Direct database update if Edge Function fails or doesn't exist
      if (!backendUpdated) {
        // Skip profile write if user already has access (avoids redundant webhook triggers)
        const { data: existing } = await supabase
          .from('profiles')
          .select('has_access')
          .eq('id', session.user.id)
          .single();
        if (existing?.has_access) {
          console.log('📝 Profile already has premium, skipping update');
          setSubscriptionStatus({ isSubscribed: true, productId, isActive: true, loading: false });
          if (purchase.purchaseToken || purchase.transactionId) {
            await RNIap.finishTransaction({ purchase, isConsumable: false });
          }
          return;
        }

        console.log('📝 Updating database directly...');
        console.log('📝 User ID:', session.user.id);
        console.log('📝 Product ID:', productId);
        
        // Use upsert to create profile if it doesn't exist, or update if it does
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            has_access: true,
            price_id: productId,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          })
          .select();

        if (updateError) {
          console.error('❌ Error updating profile:', updateError);
          console.error('❌ Error code:', updateError.code);
          console.error('❌ Error message:', updateError.message);
          console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
          throw updateError;
        }
        
        console.log('✅ Database update response:', updateData);
        
        // Check if profile was updated (might be 0 rows if profile doesn't exist)
        if (!updateData || updateData.length === 0) {
          console.warn('⚠️ No rows updated - profile may not exist, creating profile...');
          
          // Try to create the profile if it doesn't exist
          const { data: createData, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              has_access: true,
              price_id: productId,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            })
            .select();
          
          if (createError) {
            console.error('❌ Error creating profile:', createError);
          } else {
            console.log('✅ Profile created/updated:', createData);
          }
        } else {
          console.log('✅ Database updated successfully');
        }
        
        // Verify the update worked (without .single() to avoid error if no rows)
        const { data: verifyData, error: verifyError } = await supabase
          .from('profiles')
          .select('has_access, price_id')
          .eq('id', session.user.id);
        
        if (verifyError) {
          console.error('❌ Error verifying update:', verifyError);
        } else if (verifyData && verifyData.length > 0) {
          console.log('✅ Verified profile after update:', verifyData[0]);
        } else {
          console.warn('⚠️ Profile not found after update - user may need to sign in again');
        }
      }

      // Update local subscription status
      setSubscriptionStatus({
        isSubscribed: true,
        productId: productId,
        isActive: true,
        loading: false,
      });

      // Finish the transaction
      if (purchase.purchaseToken || purchase.transactionId) {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
        console.log('✅ Transaction finished');
      }
    } catch (error: any) {
      console.error('❌ Error verifying purchase:', error);
      // Even if verification fails, we can still mark it as purchased locally
      // The backend will verify it later
      setSubscriptionStatus({
        isSubscribed: true,
        productId: purchase.productId || (purchase as any).id,
        isActive: true,
        loading: false,
      });
    }
  };

  const handlePurchase = async (purchase: RNIap.Purchase) => {
    try {
      console.log('💰 Processing purchase:', JSON.stringify(purchase, null, 2));
      console.log('💰 Purchase productId:', purchase.productId || (purchase as any).id);
      console.log('💰 Purchase transactionId:', purchase.transactionId);
      console.log('💰 Purchase token:', purchase.purchaseToken);
      
      await verifyPurchaseWithBackend(purchase);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('has_access, price_id')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) {
          console.error('❌ Error checking profile after update:', profileError);
        } else {
          console.log('✅ Profile after update:', profile);
        }
        showSuccess(profile?.has_access
          ? 'Premium access activated! Available on all devices where you sign in.'
          : 'Premium access activated successfully!');
      } else {
        showSuccess('Premium access activated! Sign in later to access on your other devices.');
      }
    } catch (error: any) {
      console.error('❌ Error handling purchase:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      showError(`Failed to activate premium access: ${error.message || 'Unknown error'}`);
    }
  };

  const purchaseSubscription = async (productId: string) => {
    if (isFree) return;
    if (!RNIap) return;
    try {
      if (!productId || !PRODUCT_IDS.includes(productId)) {
        throw new Error('Invalid product');
      }
      setLoading(true);

      // Request purchase by product ID (works even when fetchProducts returned empty, e.g. sandbox/review)
      await RNIap.requestPurchase({
        request: Platform.OS === 'ios'
          ? { ios: { sku: productId } }
          : { android: { skus: [productId] } },
        type: 'in-app',
      });
      // The purchase will be handled by the purchaseUpdatedListener
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error.code === 'E_USER_CANCELLED') {
        showInfo('Purchase was cancelled');
      } else {
        showError(error.message || 'Failed to start purchase');
      }
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async () => {
    if (isFree) return;
    if (!RNIap) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      const purchases = await RNIap.getAvailablePurchases();
      setPurchases(purchases);
      
      if (purchases.length > 0) {
        const premiumPurchases = purchases.filter((purchase) => {
          return purchase.productId && PRODUCT_IDS.includes(purchase.productId);
        });

        if (premiumPurchases.length > 0) {
          const activePurchase = premiumPurchases[0];
          try {
            await verifyPurchaseWithBackend(activePurchase);
            if (session?.user?.id) {
              showSuccess('Purchases restored! Your premium access is active on this device and your account.');
            } else {
              showSuccess('Purchases restored on this device. Sign in to access premium on your other devices.');
            }
          } catch (verifyError: any) {
            console.error('Error verifying restored purchase:', verifyError);
            await checkSubscriptionStatus(purchases);
            showSuccess('Purchases restored on this device.');
          }
        } else {
          await checkSubscriptionStatus([]);
          showInfo('No premium purchases found for this device. If you purchased premium, it may take a moment to restore.');
        }
      } else {
        await checkSubscriptionStatus([]);
        showInfo('No previous purchases found for this device.');
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      showError(error.message || 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    subscriptionStatus,
    availableProducts,
    productIds: PRODUCT_IDS,
    loading,
    purchaseSubscription,
    restorePurchases,
    refreshSubscription: () => checkSubscriptionStatus(purchases),
  };
}

