import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { useResolvedThemeMode } from '@/theme';

export type SheetSnapPoint = number | `${number}%`;

export interface SheetContainerProps {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  height?: number | `${number}%`;
  snapPoints?: SheetSnapPoint[];
  snapIndex?: number;
  dismissOnBackdropPress?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const WINDOW_HEIGHT = Dimensions.get('window').height;
const ANIM_MS = 220;

export function SheetContainer({
  visible,
  onClose,
  children,
  height,
  snapPoints,
  snapIndex = 0,
  dismissOnBackdropPress = true,
  sheetStyle,
  contentStyle,
}: SheetContainerProps) {
  const mode = useResolvedThemeMode();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const sheetHeight = useMemo(() => {
    if (height != null) {
      return resolveHeight(height);
    }

    if (snapPoints?.length) {
      const point = snapPoints[Math.min(Math.max(snapIndex, 0), snapPoints.length - 1)];
      return resolveHeight(point);
    }

    return Math.min(Math.round(WINDOW_HEIGHT * 0.5), 420);
  }, [height, snapIndex, snapPoints]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(sheetHeight);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIM_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIM_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: ANIM_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIM_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [backdropOpacity, sheetHeight, translateY, visible]);

  if (!mounted) {
    return null;
  }

  const sheetBackground = mode === 'dark' ? 'rgba(21, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.8)';

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}> 
          <BlurView
            intensity={36}
            tint={mode === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={styles.backdropTouch}
            onPress={dismissOnBackdropPress ? onClose : undefined}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: sheetBackground,
              transform: [{ translateY }],
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.content, contentStyle]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function resolveHeight(value: number | `${number}%`): number {
  if (typeof value === 'string' && value.endsWith('%')) {
    const numeric = Number(value.slice(0, -1));
    if (Number.isFinite(numeric)) {
      return Math.round((numeric / 100) * WINDOW_HEIGHT);
    }
    return Math.round(WINDOW_HEIGHT * 0.5);
  }

  if (typeof value === 'number' && value > 0 && value <= 1) {
    return Math.round(value * WINDOW_HEIGHT);
  }

  if (typeof value === 'number') {
    return Math.round(value);
  }

  return Math.round(WINDOW_HEIGHT * 0.5);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
  },
});

export default SheetContainer;
