import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme';
import type { ThemeColors } from '@/theme';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl' | number;

const SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

const ICON_ALIASES = {
  'arrow-left': 'arrow-back',
  'chevron-right': 'chevron-right',
  close: 'close',

  search: 'search',
  notifications: 'notifications',
  heart: 'favorite',
  'heart-outline': 'favorite-border',
  share: 'share',

  email: 'email',
  phone: 'phone',
  lock: 'lock',
  visibility: 'visibility',
  'visibility-off': 'visibility-off',

  'check-circle': 'check-circle',
  error: 'error',
  info: 'info',
  warning: 'warning',

  'location-on': 'location-on',
  star: 'star',
  'shopping-cart': 'shopping-cart',
  add: 'add',
  remove: 'remove',
} as const;

type AliasName = keyof typeof ICON_ALIASES;
type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export type IconName = AliasName | MaterialIconName;

export interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: keyof ThemeColors | string;
}

function resolveIconName(name: IconName): MaterialIconName {
  if (name in ICON_ALIASES) {
    return ICON_ALIASES[name as AliasName] as MaterialIconName;
  }
  return name as MaterialIconName;
}

function resolveSize(size: IconSize): number {
  return typeof size === 'number' ? size : SIZE_MAP[size];
}

function resolveColor(input: IconProps['color'], colors: ThemeColors): string {
  if (!input) return colors.textSecondary;

  if (input in colors) {
    return colors[input as keyof ThemeColors];
  }

  return input;
}

export function Icon({ name, size = 'md', color = 'textSecondary' }: IconProps) {
  const colors = useThemeColors();

  return (
    <MaterialIcons
      name={resolveIconName(name)}
      size={resolveSize(size)}
      color={resolveColor(color, colors)}
    />
  );
}

export default Icon;
