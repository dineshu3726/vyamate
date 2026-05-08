import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Play, MessageCircle, User, Trophy, Map } from 'lucide-react';
import VyaMateLogo from '../common/VyaMateLogo';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function AppShell() {
  usePushNotifications();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        background: 'var(--teal)',
        color: '#fff',
        padding: 'calc(var(--safe-top) + 12px) 20px 12px',
        textAlign: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,156,157,0.3)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {/* Inverted logo for teal header: white pin, transparent circle, white person */}
          <VyaMateLogo height={38} showText={false} inverted />
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
            Vya<span style={{ color: '#B2EFEF' }}>Mate</span>
          </span>
        </div>
      </header>

      {/* Page */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav style={{
        display: 'flex',
        background: '#fff',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'var(--safe-bottom)',
        flexShrink: 0,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        zIndex: 10,
      }}>
        {[
          { to: '/', icon: Home, label: 'Discover' },
          { to: '/shorts', icon: Play, label: 'Shorts' },
          { to: '/map', icon: Map, label: 'Map' },
          { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
          { to: '/chat', icon: MessageCircle, label: 'Chat' },
          { to: '/profile', icon: User, label: 'Profile' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '8px 0',
            color: isActive ? 'var(--teal)' : 'var(--text-muted)',
            fontSize: 9, fontWeight: isActive ? 700 : 400,
            textDecoration: 'none', transition: 'color 0.15s',
          })}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
