import type * as React from 'react';

export declare const ICON_PATHS: Record<IconName, string>;

export type IconName =
  | 'home' | 'search' | 'receipt' | 'user' | 'cart' | 'basket' | 'mappin' | 'navigation'
  | 'star' | 'plus' | 'minus' | 'trash' | 'check' | 'x' | 'bell' | 'phone'
  | 'sliders' | 'sort' | 'clock' | 'storefront' | 'package' | 'printer' | 'gift' | 'wrench'
  | 'chevronright' | 'chevrondown' | 'chevronleft' | 'arrowleft' | 'arrowright'
  | 'heart' | 'lightning' | 'sparkle' | 'info' | 'warning' | 'checkcircle' | 'xcircle'
  | 'percent' | 'tag' | 'truck' | 'shieldcheck' | 'sun' | 'moon' | 'camera' | 'eye'
  | 'grid' | 'list' | 'headset' | 'upi' | 'refresh' | 'share' | 'upload' | 'download'
  | 'file' | 'external' | 'edit' | 'chat' | 'copy' | 'calendar' | 'image';

export declare const iconNames: IconName[];

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name' | 'color'> {
  name: IconName;
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  title?: string;
}

export declare const Icon: React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

export default Icon;
