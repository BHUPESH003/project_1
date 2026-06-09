// Teal brand scale
export const teal = {
  50:  '#ecfdfd',
  100: '#cff8f8',
  200: '#a3eef0',
  300: '#6ddfe3',
  400: '#2fc6cd',
  500: '#10aab3',
  600: '#0b8a93',
  700: '#0d6e76',
  800: '#115860',
  900: '#134950',
  950: '#062f34',
} as const;

// Amber accent scale
export const amber = {
  50:  '#fff9eb',
  100: '#ffeec6',
  200: '#ffda88',
  300: '#ffc24a',
  400: '#ffae20',
  500: '#f59307',
  600: '#d97402',
  700: '#b45406',
  800: '#92410c',
  900: '#78360d',
} as const;

// Semantic
export const semantic = {
  green400: '#34d399',
  green500: '#10b981',
  green600: '#059669',
  red400:   '#fb7185',
  red500:   '#ef4444',
  red600:   '#dc2626',
  amberWarn:'#f59e0b',
} as const;

export interface ColorTokens {
  // Surfaces
  bg:           string;
  bgElevated:   string;
  surface:      string;
  surface2:     string;
  surface3:     string;
  surfaceInverse:string;

  // Text
  text:         string;
  text2:        string;
  text3:        string;
  textOnPrimary:string;
  textOnAccent: string;

  // Borders
  border:       string;
  borderStrong: string;
  borderFaint:  string;

  // Brand
  primary:      string;
  primaryPress: string;
  primarySoft:  string;
  primarySoftBorder: string;
  onPrimarySoft:string;

  // Accent
  accent:       string;
  accentPress:  string;
  accentSoft:   string;

  // Semantic
  success:      string;
  successSoft:  string;
  danger:       string;
  dangerSoft:   string;
  warning:      string;
  warningSoft:  string;

  // Glass / overlay
  glassBg:      string;
  glassBorder:  string;
  scrim:        string;

  // Skeleton shimmer
  skeletonBase: string;
  skeletonSheen:string;
}

export const lightColors: ColorTokens = {
  bg:             '#f7f6f3',
  bgElevated:     '#fbfaf8',
  surface:        '#ffffff',
  surface2:       '#f3f2ee',
  surface3:       '#eae8e2',
  surfaceInverse: '#14171a',

  text:           '#14171a',
  text2:          '#545a62',
  text3:          '#888f98',
  textOnPrimary:  '#ffffff',
  textOnAccent:   '#3a2604',

  border:         '#e7e4dd',
  borderStrong:   '#d6d2c8',
  borderFaint:    '#efedea',

  primary:        teal[600],
  primaryPress:   teal[700],
  primarySoft:    teal[50],
  primarySoftBorder: teal[200],
  onPrimarySoft:  teal[700],

  accent:         amber[500],
  accentPress:    amber[600],
  accentSoft:     amber[50],

  success:        semantic.green600,
  successSoft:    '#e7f8f0',
  danger:         semantic.red500,
  dangerSoft:     '#fdecec',
  warning:        semantic.amberWarn,
  warningSoft:    '#fef4e3',

  glassBg:        'rgba(255,255,255,0.62)',
  glassBorder:    'rgba(255,255,255,0.7)',
  scrim:          'rgba(20,23,26,0.32)',

  skeletonBase:   '#ebe9e4',
  skeletonSheen:  '#f6f5f2',
};

export const darkColors: ColorTokens = {
  bg:             '#0a0d0f',
  bgElevated:     '#0e1214',
  surface:        '#15191c',
  surface2:       '#1d2327',
  surface3:       '#262d32',
  surfaceInverse: '#f2f4f5',

  text:           '#f0f3f4',
  text2:          '#a3acb2',
  text3:          '#6a747b',
  textOnPrimary:  '#04211f',
  textOnAccent:   '#2a1a02',

  border:         'rgba(255,255,255,0.09)',
  borderStrong:   'rgba(255,255,255,0.16)',
  borderFaint:    'rgba(255,255,255,0.05)',

  primary:        teal[400],
  primaryPress:   teal[300],
  primarySoft:    'rgba(47,198,205,0.13)',
  primarySoftBorder: 'rgba(47,198,205,0.28)',
  onPrimarySoft:  teal[300],

  accent:         amber[400],
  accentPress:    amber[300],
  accentSoft:     'rgba(255,174,32,0.13)',

  success:        semantic.green400,
  successSoft:    'rgba(52,211,153,0.14)',
  danger:         semantic.red400,
  dangerSoft:     'rgba(251,113,133,0.14)',
  warning:        amber[400],
  warningSoft:    'rgba(255,174,32,0.14)',

  glassBg:        'rgba(22,27,31,0.6)',
  glassBorder:    'rgba(255,255,255,0.12)',
  scrim:          'rgba(0,0,0,0.55)',

  skeletonBase:   '#1e2428',
  skeletonSheen:  '#2a3137',
};
