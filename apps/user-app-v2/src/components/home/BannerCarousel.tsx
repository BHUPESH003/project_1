import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  Pressable,
  type ListRenderItemInfo,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBanners } from '@/api/hooks/useBanners';
import type { Banner } from '@/api/types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - spacing.xl * 2;
const CARD_H = 140;

const DEFAULT_BANNERS: Banner[] = [
  {
    id: '__default_1',
    title: 'Print anything, anywhere',
    subtitle: 'Docs, photos, invites — from shops near you',
    badge: 'New',
    bgColor: '#0b8a93',
  },
  {
    id: '__default_2',
    title: 'Stationery & gifts',
    subtitle: 'Explore our growing catalog of local shops',
    badge: 'Explore',
    bgColor: '#d97402',
  },
];

export function BannerCarousel() {
  const colors = useColors();
  const { data, isLoading } = useBanners();
  const listRef = useRef<FlatList<Banner>>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const banners = data && data.length > 0 ? data : DEFAULT_BANNERS;

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % banners.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
  }, [banners.length]);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoScroll]);

  function onScrollEnd(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    setActiveIdx(idx);
    startAutoScroll();
  }

  const renderBanner = useCallback(({ item }: ListRenderItemInfo<Banner>) => {
    const bgColor = item.bgColor ?? '#0b8a93';
    return (
      <Pressable style={styles.card}>
        <LinearGradient
          colors={[bgColor, adjustColor(bgColor, -30)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {item.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}
        </LinearGradient>
      </Pressable>
    );
  }, []);

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap}>
        <Skeleton width={CARD_W} height={CARD_H} borderRadius={radius.lg} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={banners}
        renderItem={renderBanner}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        snapToInterval={CARD_W + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        getItemLayout={(_, index) => ({
          length: CARD_W,
          offset: (CARD_W + spacing.md) * index,
          index,
        })}
      />
      <View style={styles.dots}>
        {banners.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIdx ? colors.primary : colors.border,
                width: i === activeIdx ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-end',
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  badgeText: { color: '#fff', fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  title: { color: '#fff', fontSize: fontSize.titleLg, fontWeight: fontWeight.bold },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.caption },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { height: 6, borderRadius: 3 },
  skeletonWrap: { paddingHorizontal: spacing.xl },
});
