// ============================================================
//  Hyperlocal — Icon System
//  Drop-in React + TypeScript icon set. No dependencies.
//
//  • Size-independent:  controlled via the `size` prop (px) — default 24.
//  • Color-independent: strokes use `currentColor`, so an icon inherits
//                       the surrounding text `color`. Override per-instance
//                       with the `color` prop, CSS, or a utility class.
//  • Weight-tunable:    `strokeWidth` prop — default 1.6 (brand weight).
//
//  Usage:
//    import { Icon } from './hyperlocal-icons';
//
//    <Icon name="cart" />
//    <Icon name="star" size={32} color="var(--accent)" />
//    <button className="text-teal-600"><Icon name="search" /> Search</button>
//
//  Every glyph is a 24×24, currentColor stroke, round cap/join path —
//  matching the Hyperlocal brand line system.
// ============================================================
import * as React from 'react';

/** Raw 24×24 path geometry, keyed by icon name. Exported for advanced use. */
export const ICON_PATHS = {
  home: '<path d="M4 11.2 12 4l8 7.2"/><path d="M5.6 9.7V20h12.8V9.7"/><path d="M10 20v-5h4v5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.6 4.6"/>',
  receipt: '<path d="M5.5 3.5h13v17l-2.2-1.4L14 21l-2-1.4L10 21l-2.3-1.9L5.5 20.5z"/><path d="M8.5 8.5h7M8.5 12.5h7"/>',
  user: '<circle cx="12" cy="8.5" r="3.7"/><path d="M5.2 20c.7-3.6 3.5-5.6 6.8-5.6s6.1 2 6.8 5.6"/>',
  cart: '<circle cx="9.6" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4.5h2.2l2.1 10.7a1 1 0 0 0 1 .8h8.3a1 1 0 0 0 1-.8L20.4 8H6.1"/>',
  basket: '<path d="M8.2 8 12 3.2 15.8 8"/><path d="M3.5 8h17l-1.5 10.1a2 2 0 0 1-2 1.7H7a2 2 0 0 1-2-1.7z"/><path d="M9.6 12v4M14.4 12v4"/>',
  mappin: '<path d="M12 21s6.8-5.4 6.8-10.8A6.8 6.8 0 0 0 5.2 10.2C5.2 15.6 12 21 12 21z"/><circle cx="12" cy="10" r="2.6"/>',
  navigation: '<path d="M3.6 11 20.4 4l-6.9 16.4-2.6-6.9z"/>',
  star: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 17.4 6.9 19.3l1-5.7-4.1-4 5.7-.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4.5 7h15"/><path d="M9 7V5.3A1.3 1.3 0 0 1 10.3 4h3.4A1.3 1.3 0 0 1 15 5.3V7"/><path d="M6.6 7l1 12.1a1.6 1.6 0 0 0 1.6 1.5h5.6a1.6 1.6 0 0 0 1.6-1.5L17.4 7"/><path d="M10 11v6M14 11v6"/>',
  check: '<path d="M5 12.6l4.4 4.4L19 7.3"/>',
  x: '<path d="M6.2 6.2l11.6 11.6M17.8 6.2 6.2 17.8"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.4 2H4.6z"/><path d="M9.6 18.8a2.5 2.5 0 0 0 4.8 0"/>',
  phone: '<path d="M7 3.6h3l1.5 3.9-2 1.3a11 11 0 0 0 4.7 4.7l1.3-2 3.9 1.5v3a2 2 0 0 1-2.2 2A15.6 15.6 0 0 1 5 6.8 2 2 0 0 1 7 3.6z"/>',
  sliders: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2.1"/><circle cx="7" cy="16.5" r="2.1"/>',
  sort: '<path d="M7.5 9.5 12 5l4.5 4.5M7.5 14.5 12 19l4.5-4.5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.6V12l3 2"/>',
  storefront: '<path d="M4.4 9.6 5.6 5h12.8l1.2 4.6"/><path d="M4.2 9.6a2 2 0 0 0 3.9 0 2 2 0 0 0 3.9 0 2 2 0 0 0 3.9 0 2 2 0 0 0 3.9 0"/><path d="M5.2 11.6V20h13.6v-8.4"/><path d="M9.6 20v-4.6h4.8V20"/>',
  package: '<path d="M12 3.6 19.6 7.7v8.6L12 20.4 4.4 16.3V7.7z"/><path d="M4.4 7.7 12 11.9l7.6-4.2M12 11.9v8.5"/>',
  printer: '<path d="M7 9.5V4h10v5.5"/><path d="M7 16.5H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v6H7z"/><circle cx="16.8" cy="11.6" r="0.7"/>',
  gift: '<path d="M4.5 11h15V20h-15z"/><path d="M3.5 7.8h17V11h-17zM12 7.8V20"/><path d="M12 7.8C9.4 7.8 8.2 4 10 4s2 3.8 2 3.8zM12 7.8c2.6 0 3.8-3.8 2-3.8s-2 3.8-2 3.8z"/>',
  wrench: '<path d="M15.6 4.4a4 4 0 0 0 4.9 4.9L9.9 20.1a2.4 2.4 0 1 1-3.4-3.4z"/><path d="M15.6 4.4 13.4 6.6l1.9 1.9 2.2-2.2"/>',
  chevronright: '<path d="M9.5 5.5 15.5 12l-6 6.5"/>',
  chevrondown: '<path d="M5.5 9.5 12 15.5l6.5-6"/>',
  chevronleft: '<path d="M14.5 5.5 8.5 12l6 6.5"/>',
  arrowleft: '<path d="M19 12H5M11 6 5 12l6 6"/>',
  arrowright: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.6A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 7 3.3C19 15.5 12 20 12 20z"/>',
  lightning: '<path d="M13.2 3 5.5 13h5l-1 8 8.2-10.2h-5z"/>',
  sparkle: '<path d="M12 3c.4 3.9 1.1 4.6 5 5-3.9.4-4.6 1.1-5 5-.4-3.9-1.1-4.6-5-5 3.9-.4 4.6-1.1 5-5z"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><circle cx="12" cy="7.9" r="0.7"/>',
  warning: '<path d="M12 4.2 20.5 19h-17z"/><path d="M12 10v4"/><circle cx="12" cy="16.4" r="0.7"/>',
  checkcircle: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/>',
  xcircle: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>',
  percent: '<circle cx="8" cy="8" r="2.2"/><circle cx="16" cy="16" r="2.2"/><path d="M6 18 18 6"/>',
  tag: '<path d="M4 4.5h7L20 13.5l-6.5 6.5L4.5 11z"/><circle cx="8.4" cy="8.4" r="1.4"/>',
  truck: '<path d="M3 6.5h11v9.5H3z"/><path d="M14 9.5h3.8l2.7 3v3.5H14z"/><circle cx="7.3" cy="18" r="1.6"/><circle cx="16.7" cy="18" r="1.6"/>',
  shieldcheck: '<path d="M12 3.5 19 6v5.2c0 4.4-3 7.5-7 8.8-4-1.3-7-4.4-7-8.8V6z"/><path d="M9 11.8l2 2 4-4.2"/>',
  sun: '<circle cx="12" cy="12" r="3.9"/><path d="M12 2.6v2.4M12 19v2.4M4.6 4.6 6.3 6.3M17.7 17.7l1.7 1.7M2.6 12H5M19 12h2.4M4.6 19.4 6.3 17.7M17.7 6.3l1.7-1.7"/>',
  moon: '<path d="M20 13.6A8 8 0 1 1 10.4 4 6.5 6.5 0 0 0 20 13.6z"/>',
  camera: '<path d="M4 8.5h2.8l1.5-2.5h7.4l1.5 2.5H20a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.1"/>',
  eye: '<path d="M2.6 12S6 5.6 12 5.6 21.4 12 21.4 12 18 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z"/>',
  list: '<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  headset: '<path d="M5 14v-2a7 7 0 0 1 14 0v2"/><path d="M5 13.5h1.6a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM19 13.5h-1.6a1 1 0 0 0-1 1V18a1 1 0 0 0 1 1H18a1 1 0 0 0 1-1z"/><path d="M19 18v.6a3 3 0 0 1-3 3h-2.5"/>',
  upi: '<path d="M5 4 8 20M9.5 4l3 16M14 4l3.5 8L14 20"/>',
  refresh: '<path d="M19 6.5A8 8 0 1 0 20 12"/><path d="M19 3v4h-4"/>',
  share: '<circle cx="6.5" cy="12" r="2.3"/><circle cx="16.8" cy="6.3" r="2.3"/><circle cx="16.8" cy="17.7" r="2.3"/><path d="M8.5 10.9 14.8 7.4M8.5 13.1l6.3 3.5"/>',
  upload: '<path d="M12 15V4.5M8.3 8.2 12 4.5l3.7 3.7"/><path d="M4.5 14.5V18a1.6 1.6 0 0 0 1.6 1.6h11.8A1.6 1.6 0 0 0 19.5 18v-3.5"/>',
  download: '<path d="M12 4.5V15M8.3 11.3 12 15l3.7-3.7"/><path d="M4.5 14.5V18a1.6 1.6 0 0 0 1.6 1.6h11.8A1.6 1.6 0 0 0 19.5 18v-3.5"/>',
  file: '<path d="M6.5 3.5h6.6l4.4 4.4V20.5H6.5z"/><path d="M13 3.6V8.4h4.6"/>',
  external: '<path d="M18 11.5V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V9a1.5 1.5 0 0 1 1.5-1.5H13"/><path d="M14.5 4.5H20v5.5M20 4.5 11 13.5"/>',
  edit: '<path d="M4.5 19.5 5.6 15 16.2 4.4a1.4 1.4 0 0 1 2 0l1.4 1.4a1.4 1.4 0 0 1 0 2L9 18.4z"/><path d="M14.5 6.1 17.9 9.5"/>',
  chat: '<path d="M4.5 6.5a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H9.5L5 19.5V6.5z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>',
  copy: '<path d="M9 8.7a1.4 1.4 0 0 1 1.4-1.4h7.2A1.4 1.4 0 0 1 19 8.7v9.4a1.4 1.4 0 0 1-1.4 1.4h-7.2A1.4 1.4 0 0 1 9 18.1z"/><path d="M14.5 7.3V5.9a1.4 1.4 0 0 0-1.4-1.4H6.4A1.4 1.4 0 0 0 5 5.9v9.4a1.4 1.4 0 0 0 1.4 1.4h1.4"/>',
  calendar: '<path d="M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1z"/><path d="M4 10.5h16M8.5 4.2v4M15.5 4.2v4"/>',
  image: '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z"/><circle cx="9" cy="10" r="1.5"/><path d="M4.7 16.8 9.5 12.2l3.3 2.9 3.2-2.7 3.8 3.4"/>',
} as const;

/** Union of every available icon name. */
export type IconName = keyof typeof ICON_PATHS;

/** Sorted list of all icon names — handy for galleries / pickers. */
export const iconNames = Object.keys(ICON_PATHS) as IconName[];

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name' | 'color'> {
  /** Which glyph to render. */
  name: IconName;
  /** Width & height in px (or any CSS length). Default `24`. */
  size?: number | string;
  /** Stroke weight. Default `1.6`. */
  strokeWidth?: number | string;
  /** Stroke color. Defaults to `currentColor` (inherits text color). */
  color?: string;
  /** Accessible label. Omit for purely decorative icons (hidden from AT). */
  title?: string;
}

/**
 * Hyperlocal icon. Forwards refs and spreads any extra SVG props
 * (className, style, onClick, aria-*, …) onto the root <svg>.
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 24, strokeWidth = 1.6, color = 'currentColor', title, ...rest },
  ref,
) {
  const decorative = title == null;
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <g dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }} />
    </svg>
  );
});

export default Icon;
