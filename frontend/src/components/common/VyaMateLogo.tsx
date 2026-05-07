import React from 'react';

interface Props {
  height?: number;
  showText?: boolean;
  /** inverted: white pin on transparent bg — for use on teal backgrounds */
  inverted?: boolean;
}

export default function VyaMateLogo({ height = 120, showText = true, inverted = false }: Props) {
  const viewH = showText ? 280 : 195;
  const viewW = 200;
  const w = Math.round((height / viewH) * viewW);

  // Normal: teal pin, white circle, teal person
  // Inverted: white pin, teal circle, white person (for teal header bg)
  const pinColor   = inverted ? 'white'    : '#009C9D';
  const circleColor = inverted ? '#009C9D' : 'white';
  const bodyColor  = inverted ? 'white'    : '#009C9D';
  const textColor  = inverted ? 'white'    : '#009C9D';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewW} ${viewH}`}
      height={height}
      width={w}
      style={{ display: 'block' }}
    >
      {/* ── Map Pin outer shape ── */}
      <path
        d="M100 186 C60 162 26 130 26 78 C26 34 59 4 100 4 C141 4 174 34 174 78 C174 130 140 162 100 186 Z"
        fill={pinColor}
      />

      {/* ── Inner circle ── */}
      <circle cx="100" cy="78" r="57" fill={circleColor} />

      {/* ── Person silhouette (squatting with dumbbell) ── */}

      {/* Head */}
      <circle cx="87" cy="37" r="9.5" fill={bodyColor} />

      {/* Torso – slightly forward-leaning */}
      <line x1="87" y1="46" x2="81" y2="76"
        stroke={bodyColor} strokeWidth="11" strokeLinecap="round" />

      {/* Right arm extended forward toward dumbbell */}
      <line x1="88" y1="59" x2="121" y2="64"
        stroke={bodyColor} strokeWidth="9" strokeLinecap="round" />

      {/* Dumbbell – vertical, at end of arm */}
      <rect x="119" y="55" width="7"  height="20" rx="3" fill={bodyColor} />
      <rect x="113" y="51" width="19" height="8"  rx="4" fill={bodyColor} />
      <rect x="113" y="69" width="19" height="8"  rx="4" fill={bodyColor} />

      {/* Hip connector */}
      <line x1="76" y1="76" x2="93" y2="76"
        stroke={bodyColor} strokeWidth="12" strokeLinecap="round" />

      {/* Left leg – squat */}
      <line x1="76" y1="76" x2="59" y2="97"
        stroke={bodyColor} strokeWidth="10" strokeLinecap="round" />
      <line x1="59" y1="97" x2="69" y2="111"
        stroke={bodyColor} strokeWidth="9"  strokeLinecap="round" />

      {/* Right leg – squat */}
      <line x1="93" y1="76" x2="108" y2="97"
        stroke={bodyColor} strokeWidth="10" strokeLinecap="round" />
      <line x1="108" y1="97" x2="97"  y2="111"
        stroke={bodyColor} strokeWidth="9"  strokeLinecap="round" />

      {/* ── VyaMate text ── */}
      {showText && (
        <text
          x="100"
          y="243"
          fontFamily="Inter, Arial, sans-serif"
          fontWeight="800"
          fontSize="46"
          fill={textColor}
          textAnchor="middle"
          letterSpacing="-1"
        >
          VyaMate
        </text>
      )}
    </svg>
  );
}
