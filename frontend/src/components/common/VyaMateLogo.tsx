import React from 'react';

interface Props {
  height?: number;
  showText?: boolean;
  /** inverted: white version — for use on teal backgrounds */
  inverted?: boolean;
}

export default function VyaMateLogo({ height = 120, inverted = false }: Props) {
  return (
    <img
      src="/logo.png"
      alt="VyaMate"
      height={height}
      style={{
        display: 'block',
        filter: inverted ? 'brightness(0) invert(1)' : undefined,
        objectFit: 'contain',
      }}
    />
  );
}
