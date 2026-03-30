/**
 * components/icons/NotesIcon.tsx
 *
 * Custom SVG icon for the Notes tab.
 *
 * Design: a document/page with a folded top-right corner and two
 * text lines — representing a note or page of content.
 *
 * Props:
 *   color — icon stroke colour
 *   size  — icon width and height in dp (default 24)
 *
 * Usage:
 *   <NotesIcon color={COLORS.accent} size={24} />
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface NotesIconProps {
  /** Stroke colour — use accent.primary for active, chrome.tabInactive for inactive */
  color: string;
  /** Icon size in dp. Default 24. */
  size?: number;
}

export function NotesIcon({ color, size = 24 }: NotesIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      {/* Document outline with folded top-right corner */}
      <Path
        d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V8L14 2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fold crease — from the top corner bend to the page edge */}
      <Path
        d="M14 2V8H19"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Text line 1 */}
      <Path
        d="M8 13H16"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Text line 2 — shorter, suggests a second line of text */}
      <Path
        d="M8 17H13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
