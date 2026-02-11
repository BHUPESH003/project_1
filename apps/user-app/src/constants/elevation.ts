/**
 * Card and surface elevation – iOS shadow vs Android elevation.
 * Improves affordance and selected vs unselected states.
 */
import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

const cardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {},
})!;

const cardShadowSelected: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  android: {
    elevation: 6,
  },
  default: {},
})!;

const buttonShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.primaryShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  android: {
    elevation: 8,
  },
  default: {},
})!;

/** Default card – subtle lift */
export const elevation = {
  card: cardShadow,
  cardSelected: cardShadowSelected,
  button: buttonShadow,
} as const;

export type Elevation = typeof elevation;
