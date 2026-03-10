import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isFree } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSubscription } from '@/hooks/use-subscription';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import * as RNIap from 'react-native-iap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { subscriptionStatus, availableProducts, productIds, loading, purchaseSubscription, restorePurchases } = useSubscription();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (isFree) {
      router.replace('/');
    }
  }, [router]);

  if (isFree) {
    return null;
  }

  const handlePurchase = async (productId: string) => {
    setPurchasing(productId);
    try {
      await purchaseSubscription(productId);
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setPurchasing('restore');
    try {
      await restorePurchases();
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (product: RNIap.Product) => {
    return (product as { localizedPrice?: string; price?: string }).localizedPrice || product.price || 'N/A';
  };

  const getProductDisplayName = (productId: string) => {
    return 'MinuteLingo Premium';
  };

  const getProductDescription = (productId: string) => {
    return 'Unlock all content. One-time purchase for lifetime access to the complete collection.';
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Premium
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {subscriptionStatus.isSubscribed && subscriptionStatus.isActive ? (
          <ThemedView style={styles.activeSubscription}>
            <IconSymbol name="checkmark.circle.fill" size={64} color="#4CAF50" />
            <ThemedText type="title" style={styles.activeTitle}>
              Premium Active!
            </ThemedText>
            <ThemedText style={styles.activeText}>
              Enjoy unlimited access to all 100+ stories
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            <ThemedView style={styles.intro}>
              <ThemedText type="title" style={styles.introTitle}>
                Unlock Premium Access
              </ThemedText>
              <ThemedText style={styles.introText}>
                One-time purchase for lifetime access to all 100+ stories
              </ThemedText>
            </ThemedView>

            {/* Purchase button first so visible without scrolling on iPad - App Store Guideline 2.1(b).
                StoreKit may return empty in review - purchase still works via productId. */}
            {availableProducts.length > 0 ? (
              <ThemedView style={styles.products}>
                {availableProducts.map((product: any) => {
                  const productId = product.id || product.productId;
                  const isPurchasing = purchasing === productId;
                  
                  return (
                    <TouchableOpacity
                      key={productId}
                      style={[
                        styles.productCard,
                        styles.productCardFeatured,
                        isPurchasing && styles.productCardDisabled,
                      ]}
                      onPress={() => handlePurchase(productId)}
                      disabled={isPurchasing || loading}
                      accessible={true}
                      accessibilityLabel="Purchase Premium"
                      accessibilityRole="button"
                    >
                      <ThemedView style={styles.badge}>
                        <ThemedText style={styles.badgeText}>LIFETIME ACCESS</ThemedText>
                      </ThemedView>
                      <ThemedText type="subtitle" style={styles.productName}>
                        {getProductDisplayName(productId)}
                      </ThemedText>
                      <ThemedView style={styles.priceContainer}>
                        <ThemedText type="title" style={styles.price}>
                          {formatPrice(product)}
                        </ThemedText>
                      </ThemedView>
                      <ThemedText style={styles.productDescription}>
                        {getProductDescription(productId)}
                      </ThemedText>
                      {isPurchasing ? (
                        <ActivityIndicator size="small" color={colors.tint} style={styles.purchaseLoader} />
                      ) : (
                        <ThemedView style={[styles.purchaseButton, { backgroundColor: colors.tint }]}>
                          <ThemedText style={styles.purchaseButtonText}>Purchase Premium</ThemedText>
                        </ThemedView>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ThemedView>
            ) : (
              /* Fallback: show purchase button when products haven't loaded (common in App Store review).
                 requestPurchase works with productId even when fetchProducts returned empty. */
              <ThemedView style={styles.purchaseButtonSection}>
                {loading && (
                  <ActivityIndicator size="small" color={colors.tint} style={styles.loaderInline} />
                )}
                {productIds.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.purchaseButtonPrimary,
                      { backgroundColor: colors.tint },
                      (loading || !productIds[0]) && styles.purchaseButtonDisabled,
                    ]}
                    onPress={() => productIds[0] && handlePurchase(productIds[0])}
                    disabled={loading || !productIds[0]}
                    accessible={true}
                    accessibilityLabel="Purchase Premium"
                    accessibilityRole="button"
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <ThemedText style={styles.purchaseButtonText}>Purchase Premium</ThemedText>
                    )}
                  </TouchableOpacity>
                )}
                {productIds.length === 0 && !loading && (
                  <ThemedText style={styles.noProductsText}>
                    Premium is not available. Please try again later.
                  </ThemedText>
                )}
              </ThemedView>
            )}

            <ThemedView style={styles.features}>
              <FeatureItem icon="book.fill" text="Unlimited audiobooks" colors={colors} />
              <FeatureItem icon="arrow.down.circle.fill" text="Download for offline" colors={colors} />
            </ThemedView>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={purchasing === 'restore' || loading}
              accessible={true}
              accessibilityLabel="Restore Purchases"
              accessibilityRole="button"
            >
              {purchasing === 'restore' ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <ThemedText style={styles.restoreButtonText}>Restore Purchases</ThemedText>
              )}
            </TouchableOpacity>

            <ThemedText style={styles.termsText}>
              One-time purchase. Lifetime access to all stories. No recurring charges.
            </ThemedText>
            <ThemedText style={styles.optionalSignInText}>
              You can sign in later from the Account tab to access your premium on other devices.
            </ThemedText>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function FeatureItem({ icon, text, colors }: { icon: string; text: string; colors: any }) {
  return (
    <ThemedView style={styles.featureItem}>
      <IconSymbol name={icon as any} size={24} color={colors.tint} />
      <ThemedText style={styles.featureText}>{text}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  intro: {
    alignItems: 'center',
    marginBottom: 32,
  },
  introTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
  },
  products: {
    marginBottom: 24,
  },
  productCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },
  productCardFeatured: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  productName: {
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
  },
  pricePeriod: {
    marginLeft: 4,
    opacity: 0.7,
    fontSize: 16,
  },
  productDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  purchaseButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseLoader: {
    marginTop: 8,
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    opacity: 0.7,
    fontSize: 14,
  },
  termsText: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 8,
  },
  optionalSignInText: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  loader: {
    marginVertical: 40,
  },
  activeSubscription: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  activeTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  activeText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
    marginBottom: 8,
  },
  noProductsText: {
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
    fontSize: 14,
  },
  purchaseButtonSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  purchaseButtonPrimary: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    minWidth: 200,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  loaderInline: {
    marginBottom: 12,
  },
});

