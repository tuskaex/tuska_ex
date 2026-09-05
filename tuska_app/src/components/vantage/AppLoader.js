import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { brandAssets } from '../../theme/brand';
import { vantage } from '../../theme/vantageTheme';

/**
 * Full-screen startup loader: the SpeedTrade wordmark, animated.
 *
 * Three motions, in brand order — blue does the work, red is the spark:
 *   1. the mark settles in (fade + a small rise and scale),
 *   2. a light streak sweeps across it, echoing the speed lines in the "ST"
 *      monogram, and
 *   3. a thin blue bar runs underneath so the screen reads as "working"
 *      rather than "stuck".
 *
 * Built on React Native's own `Animated` rather than Reanimated on purpose:
 * this is the first component on screen at cold start, before the app's
 * providers mount, and `Animated` has no worklet/runtime setup to get wrong at
 * that point. Every animated property here is transform or opacity, so they
 * all run on the native driver and survive a busy JS thread — which is exactly
 * what a startup screen is competing with.
 *
 * It previously showed `assets/images/download.gif`, an orange square on pure
 * black left over from the SwissCresta build.
 */

// The wordmark is 2066x366 in the source art; keep that ratio so it never
// stretches, whatever width the screen gives it.
const LOGO_ASPECT = 2066 / 366;

export default function AppLoader() {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(280, Math.round(width * 0.64));
  const logoHeight = Math.round(logoWidth / LOGO_ASPECT);

  const [reduceMotion, setReduceMotion] = useState(false);

  const intro = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  // Honour the OS "reduce motion" setting: the mark still fades in, but the
  // looping streak and bar are dropped rather than animated.
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((on) => { if (alive) setReduceMotion(!!on); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (on) => setReduceMotion(!!on),
    );
    return () => { alive = false; try { sub?.remove?.(); } catch (_) {} };
  }, []);

  useEffect(() => {
    const entrance = Animated.timing(intro, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    if (reduceMotion) {
      entrance.start();
      return () => { entrance.stop(); };
    }

    const streak = Animated.loop(
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );

    const progress = Animated.loop(
      Animated.timing(bar, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    entrance.start();
    streak.start();
    progress.start();
    return () => { entrance.stop(); streak.stop(); progress.stop(); };
  }, [intro, sweep, bar, reduceMotion]);

  const logoStyle = {
    opacity: intro,
    transform: [
      { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
    ],
  };

  // The streak starts fully off the left edge and exits past the right one.
  const streakWidth = Math.round(logoWidth * 0.42);
  const streakStyle = {
    width: streakWidth,
    opacity: intro,
    transform: [
      {
        translateX: sweep.interpolate({
          inputRange: [0, 1],
          outputRange: [-streakWidth, logoWidth + streakWidth],
        }),
      },
      { skewX: '-18deg' },
    ],
  };

  const barTrackWidth = logoWidth;
  const barWidth = Math.round(barTrackWidth * 0.38);
  const barStyle = {
    width: barWidth,
    transform: [
      {
        translateX: bar.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-barWidth, barTrackWidth - barWidth, barTrackWidth],
        }),
      },
    ],
  };

  return (
    <View style={styles.root}>
      <View style={[styles.logoClip, { width: logoWidth, height: logoHeight }]}>
        <Animated.Image
          source={brandAssets.logo}
          style={[{ width: logoWidth, height: logoHeight }, logoStyle]}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="SpeedTrade"
        />
        {reduceMotion ? null : (
          <Animated.View style={[styles.streak, streakStyle]} pointerEvents="none">
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.30)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </View>

      {reduceMotion ? null : (
        <View style={[styles.barTrack, { width: barTrackWidth }]}>
          <Animated.View style={[styles.barFill, barStyle]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: vantage.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `overflow: hidden` is what keeps the streak inside the wordmark's box
  // instead of flying across the whole screen.
  logoClip: { overflow: 'hidden', justifyContent: 'center' },
  streak: { position: 'absolute', top: 0, bottom: 0 },
  barTrack: {
    height: 2,
    marginTop: 22,
    borderRadius: 1,
    overflow: 'hidden',
    backgroundColor: vantage.bgRaised,
  },
  barFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: vantage.accent,
  },
});
