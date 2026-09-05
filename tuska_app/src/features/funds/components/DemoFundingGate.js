import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { PillButton } from '../../../components/vantage';
import { vantage, space, sizes, weights, fontFamily, radius } from '../../../theme/vantageTheme';

/**
 * Funding is live-accounts-only. This is the app's version of the web's
 * `DemoLockGate` on /wallet, and the wording is deliberately the same so a
 * trader who has seen one is not told something different by the other.
 *
 * The web blocks the whole wallet page for a demo user
 * (`frontend/trader/src/app/wallet/page.tsx` — `if (isDemo) return
 * <DemoLockGate …>`). The app had no such check at all: a demo user could
 * open Deposit or Withdraw, fill the form and submit, and only find out from
 * whatever the server said. Blocking at the screen is both the honest place
 * to say it and the only one that can explain *why*.
 */
export const DEMO_FUNDING_MSG =
  'Demo accounts cannot deposit, withdraw, or transfer funds. Open a live account to use wallet funding.';

export default function DemoFundingGate({ feature = 'Deposits & Withdrawals' }) {
  const nav = useNavigation();
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed-outline" size={30} color={vantage.accent} />
      </View>
      <Text style={styles.title}>{feature}</Text>
      <Text style={styles.body}>
        Funding is only available on real trading accounts. Open a live account
        to deposit, withdraw and transfer funds.
      </Text>
      <PillButton
        label="Open a live account"
        onPress={() => nav.navigate('HomeTab', { screen: 'Accounts' })}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    gap: space.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: vantage.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  title: {
    color: vantage.textPrimary,
    fontFamily,
    fontSize: sizes.h2,
    fontWeight: weights.heavy,
    textAlign: 'center',
  },
  body: {
    color: vantage.textSecondary,
    fontFamily,
    fontSize: sizes.body,
    lineHeight: 20,
    textAlign: 'center',
  },
  cta: { marginTop: space.md, borderRadius: radius.pill },
});
