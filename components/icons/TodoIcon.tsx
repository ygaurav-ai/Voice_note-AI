/**
 * components/icons/TodoIcon.tsx
 *
 * Custom SVG icon for the Todo tab.
 *
 * Design: a clipboard with a checkmark — representing a task list.
 * The clipboard has rounded corners; the checkmark sits inside.
 *
 * Props:
 *   color — icon stroke colour
 *   size  — icon width and height in dp (default 24)
 *
 * Usage:
 *   <TodoIcon color={COLORS.accent} size={24} />
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TodoIconProps {
  /** Stroke colour — use accent.primary for active, chrome.tabInactive for inactive */
  color: string;
  /** Icon size in dp. Default 24. */
  size?: number;
}

export function TodoIcon({ color, size = 24 }: TodoIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      {/* Outer rectangle — the clipboard/list container */}
      <Path
        d="M5 3C5 2.44772 5.44772 2 6 2H18C18.5523 2 19 2.44772 19 3V21C19 21.5523 18.5523 22 18 22H6C5.44772 22 5 21.5523 5 21V3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark inside the list — signals tasks/completion */}
      <Path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top list line — above the checkmark area */}
      <Path
        d="M8 7H16"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Bottom list line — below the checkmark */}
      <Path
        d="M8 17H13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
