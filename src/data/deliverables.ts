import { ServiceOperatorPlan } from '../types/fintech.ts';

export const SERVICE_OPERATORS: Record<string, string[]> = {
  'Mobile Prepaid': ['Jio True 5G', 'Airtel Prepaid', 'Vi (Vodafone Idea)', 'BSNL Mobile'],
  'Mobile Postpaid': ['Airtel Postpaid', 'Jio Postpaid Plus', 'Vi Max Postpaid', 'BSNL Postpaid'],
  'DTH Recharge': ['Tata Play', 'Airtel Digital TV', 'Dish TV', 'Sun Direct', 'd2h'],
  'Electricity Bill': ['TATA Power Delhi', 'Adani Electricity Mumbai', 'BESCOM Bangalore', 'MSEB Mahavitaran', 'UPPCL Urban'],
  'Gas Bill': ['Indraprastha Gas (IGL)', 'Mahanagar Gas (MGL)', 'Adani Total Gas', 'Gujarat Gas', 'Bharat Gas'],
  'Water Bill': ['Delhi Jal Board (DJB)', 'BWSSB Bangalore', 'MCGM Mumbai Water', 'HMWSSB Hyderabad'],
  'Broadband': ['JioFiber', 'Airtel Xstream Fiber', 'ACT Fibernet', 'BSNL Bharat Fiber', 'Tata Play Fiber'],
  'Landline': ['Airtel Landline', 'BSNL Landline', 'MTNL Delhi/Mumbai'],
  'Insurance': ['LIC of India', 'HDFC Life', 'ICICI Prudential', 'SBI Life Insurance'],
  'Fastag & Travel': ['ICICI Fastag', 'Paytm Fastag', 'HDFC Fastag', 'SBI Fastag'],
};

export const PREPAID_PLANS: ServiceOperatorPlan[] = [
  { id: 'plan-299', amount: 299, validity: '28 Days', data: '1.5 GB/Day', calls: 'Unlimited Calls + 100 SMS/Day', tag: 'Popular' },
  { id: 'plan-349', amount: 349, validity: '28 Days', data: '2.0 GB/Day + 5G', calls: 'Unlimited True 5G + Calls', tag: 'Best Seller' },
  { id: 'plan-749', amount: 749, validity: '72 Days', data: '2.0 GB/Day + 20GB Extra', calls: 'Unlimited Calls + Roaming', tag: 'Value Pack' },
  { id: 'plan-899', amount: 899, validity: '90 Days', data: '2.0 GB/Day + 5G', calls: 'Unlimited Calls + OTT Bundle', tag: 'Quarterly' },
  { id: 'plan-2999', amount: 2999, validity: '365 Days', data: '2.5 GB/Day + 5G', calls: 'Annual Unlimited + FanCode', tag: 'Annual Saver' },
];

export const EXPO_REACT_NATIVE_SOURCE = `// ============================================================================
// mobile/App.tsx — RECHARGE EXPRES (Android & iOS Expo React Native Super App)
// Supports: Android APK via EAS Build & iOS IPA
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.rechargeexpres.in';

export default function RechargeExpresMobileApp() {
  const [balance, setBalance] = useState<number>(1250.0);
  const [balanceVisible, setBalanceVisible] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'Home' | 'History' | 'Scan' | 'Offers' | 'Profile'>('Home');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [amount, setAmount] = useState<string>('299');
  const [loading, setLoading] = useState<boolean>(false);

  const executeVerifiedRecharge = async () => {
    if (mobileNumber.length !== 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    const numericAmount = Number(amount);
    if (numericAmount <= 0 || numericAmount > balance) {
      Alert.alert('Insufficient Wallet Balance', 'Please add money via an authorized gateway first.');
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = \`MOB_\${Date.now()}_\${Math.random().toString(36).slice(2, 8)}\`;
      const response = await fetch(\`\${API_BASE_URL}/api/recharge/validate\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'Mobile Prepaid',
          provider: 'Jio True 5G',
          targetAccount: mobileNumber,
          amount: numericAmount,
          idempotencyKey,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.valid) {
        throw new Error(result.error || 'Recharge validation failed');
      }
      setBalance((prev) => Number((prev - numericAmount + result.cashbackAmount).toFixed(2)));
      Alert.alert(
        'Recharge Successful',
        \`TX ID: \${result.txId}\\nOperator Ref: \${result.operatorRef}\\nCashback Credited: ₹\${result.cashbackAmount}\`
      );
    } catch (err: any) {
      Alert.alert('Recharge Error', err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0039A6" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Recharge Expres</Text>
          <Text style={styles.brandSub}>Fast • Secure • Reliable</Text>
        </View>
        <View style={styles.kycBadge}>
          <Text style={styles.kycText}>KYC Verified</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View>
            <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
              <Text style={styles.walletLabel}>Wallet Balance {balanceVisible ? '👁' : '🙈'}</Text>
            </TouchableOpacity>
            <Text style={styles.walletAmount}>
              {balanceVisible ? \`₹\${balance.toFixed(2)}\` : '₹••••••'}
            </Text>
          </View>
          <TouchableOpacity style={styles.addMoneyBtn}>
            <Text style={styles.addMoneyText}>Add Money +</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Recharge Module */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Instant Prepaid & BBPS Recharge</Text>
          <TextInput
            style={styles.input}
            placeholder="10-Digit Mobile / Consumer Number"
            keyboardType="phone-pad"
            maxLength={10}
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (₹)"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={executeVerifiedRecharge}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryCtaText}>Proceed to Verified Pay</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FE' },
  header: {
    backgroundColor: '#0039A6',
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  brandSub: { color: '#FFD700', fontSize: 12, marginTop: 2, fontWeight: '600' },
  kycBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  kycText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  scrollBody: { padding: 16 },
  walletCard: {
    backgroundColor: '#0052FF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletLabel: { color: '#DBEAFE', fontSize: 13, fontWeight: '600' },
  walletAmount: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 4 },
  addMoneyBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  addMoneyText: { color: '#0039A6', fontWeight: '700', fontSize: 13 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryCta: {
    backgroundColor: '#0052FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryCtaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
`;

export const GITHUB_AND_EAS_BUILD_GUIDE = `# Publishing to GitHub & Building Android APK (GitHub Actions + Expo EAS)

## Option A: 1-Click Automated Android APK via GitHub Actions (Included)
This repository includes a pre-configured GitHub Actions workflow at \`.github/workflows/build-android-apk.yml\` and \`capacitor.config.json\`.

1. Publish / push this codebase to your GitHub repository (\`main\` or \`master\` branch).
2. Open your GitHub repository -> click the **Actions** tab.
3. Select **Build Recharge Expres Android APK** (triggers automatically on push, or click **Run workflow**).
4. Once completed (~3 mins), download **Recharge-Expres-Android-APK** (\`app-debug.apk\`) from the **Artifacts** section and install it on your Android device.

---

## Option B: Publish via Git CLI & Build with Expo EAS Cloud
\`\`\`bash
# 1. Initialize Git repository and push to GitHub
git init
git add .
git commit -m "feat: production release of Recharge Expres Fintech Super App"
git branch -M main
git remote add origin https://github.com/your-org/recharge-expres-superapp.git
git push -u origin main

# 2. Install the official Expo Application Services (EAS) CLI globally
npm install -g eas-cli

# 3. Log in to your Expo developer account & initialize project
eas login
eas project:init

# 4. Build standalone Android APK on Expo cloud builders (uses eas.json 'preview' profile)
eas build --platform android --profile preview
\`\`\`
Once the build finishes, EAS outputs a direct download URL and QR code for the signed \`.apk\` binary.
`;

