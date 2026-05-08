import React from 'react';

interface Props {
  name?: string;
  avatar?: string | null;
  size?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

export default function UserAvatar({ name = '?', avatar, size = 40, fontSize, style }: Props) {
  const initial = name.charAt(0).toUpperCase() || '?';
  const fs = fontSize ?? Math.round(size * 0.38);
  const avatarUrl = avatar?.startsWith('/uploads') ? `${API_BASE}${avatar}` : avatar;

  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  };

  if (avatarUrl) {
    return (
      <div style={base}>
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            // Fallback to initial on broken image
            const el = e.currentTarget.parentElement!;
            e.currentTarget.remove();
            el.style.background = 'linear-gradient(135deg, var(--teal), #005f60)';
            el.style.color = '#fff';
            el.style.fontSize = `${fs}px`;
            el.style.fontWeight = '800';
            el.textContent = initial;
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      ...base,
      background: 'linear-gradient(135deg, var(--teal), #005f60)',
      color: '#fff',
      fontSize: fs,
      fontWeight: 800,
    }}>
      {initial}
    </div>
  );
}
