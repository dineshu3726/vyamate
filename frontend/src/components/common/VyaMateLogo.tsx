import React from 'react';

interface Props {
  height?: number;
  showText?: boolean;
  inverted?: boolean;
}

export default function VyaMateLogo({ height = 120 }: Props) {
  return (
    <img
      src="/logo.png?v=2"
      alt="VyaMate"
      height={height}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
