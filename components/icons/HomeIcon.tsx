/**
 * components/icons/HomeIcon.tsx
 *
 * Custom SVG icon for the Home tab.
 *
 * Design: a clean stroke-based house shape — roof peak + walls + door cutout.
 * Uses react-native-svg Path so it scales perfectly at any screen density.
 *
 * Props:
 *   color — icon stroke colour (amber when active, muted grey when inactive)
 *   size  — icon width and height in dp (default 24)
 *
 * Usage:
 *   <HomeIcon color={COLORS.accent} size={24} />
 *
 * DEBUG TIP: If the icon appears too bold or thin, adjust strokeWidth here.
 * Current value is 1.8 which renders cleanly at sizes 20–28dp.
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HomeIconProps {
  /** Stroke colour — use accent.primary for active, chrome.tabInactive for inactive */
  color: string;
  /** Icon size in dp. Default 24. */
  size?: number;
}

export function HomeIcon({ color, size = 24 }: HomeIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      {/* Roof — diagonal lines from peak (12,3) down to walls */}
      <Path
        d="M3 9.5L12 3L21 9.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Outer walls and floor */}
      <Path
        d="M5 8.5V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V8.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Door — centred at bottom of the house */}
      <Path
        d="M10 21V15C10 14.4477 10.4477 14 11 14H13C13.5523 14 14 14.4477 14 15V21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
