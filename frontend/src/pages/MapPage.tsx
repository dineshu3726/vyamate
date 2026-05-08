import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Radio, Users, Loader, Navigation } from 'lucide-react';
import { matchAPI, beaconAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MatchUser, Beacon } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Fix leaflet default marker icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (emoji: string, bg: string) =>
  L.divIcon({
    html: `<div style="background:${bg};width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 10px rgba(0,0,0,0.22);border:2.5px solid #fff;">${emoji}</div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });

const meIcon = makeIcon('⭐', '#005f60');
const userIcon = makeIcon('🏃', '#009C9D');
const beaconIcon = makeIcon('📡', '#F59E0B');

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 14); }, [center[0], center[1]]);
  return null;
}

export default function MapPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [neighbors, setNeighbors] = useState<MatchUser[]>([]);
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<[number, number]>([28.6139, 77.2090]);

  useEffect(() => {
    if (user?.lat && user?.lng) setCenter([user.lat, user.lng]);
    loadData();
  }, []);

  async function loadData() {
    try {
      const [nb, bc] = await Promise.all([matchAPI.neighbors(5), beaconAPI.getAll()]);
      setNeighbors((nb.data as MatchUser[]).filter(u => u.blurredLat && u.blurredLng));
      setBeacons((bc.data as Beacon[]).filter(b => b.lat && b.lng));
    } catch {
      toast.error('Failed to load map data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader size={28} color="var(--teal)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user?.lat) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <MapPin size={52} color="var(--teal-light)" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 8, color: 'var(--text)' }}>Location Required</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
          Enable your location in Profile to see nearby workout partners and active beacons on the map.
        </p>
        <button
          onClick={() => navigate('/profile')}
          style={{ padding: '11px 24px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
        >
          <Navigation size={15} /> Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Legend bar */}
      <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <LegendItem emoji="⭐" label="You" />
        <LegendItem emoji="🏃" label={`${neighbors.length} nearby`} />
        <LegendItem emoji="📡" label={`${beacons.length} beacons`} />
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>~300m blur</span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={center} />

          {/* My blurred location */}
          <Marker position={center} icon={meIcon}>
            <Popup>
              <div style={{ minWidth: 130, fontFamily: 'Inter, sans-serif' }}>
                <strong style={{ fontSize: 13 }}>{user.name}</strong>
                <span style={{ fontSize: 11, color: '#666' }}> (You)</span>
                <br />
                <span style={{ fontSize: 12, color: '#666' }}>{user.fitnessLevel}</span>
                {user.localHero && <span style={{ fontSize: 11, marginLeft: 4 }}>⭐ Local Hero</span>}
              </div>
            </Popup>
          </Marker>

          {/* Nearby users */}
          {neighbors.map(nb => (
            <Marker key={nb._id} position={[nb.blurredLat!, nb.blurredLng!]} icon={userIcon}>
              <Popup>
                <div style={{ minWidth: 150, fontFamily: 'Inter, sans-serif' }}>
                  <strong style={{ fontSize: 13 }}>{nb.name}</strong>
                  {nb.localHero && <span style={{ fontSize: 11, marginLeft: 4 }}>⭐</span>}
                  <br />
                  <span style={{ fontSize: 12, color: '#666' }}>{nb.fitnessLevel}</span>
                  {nb.dist && <span style={{ fontSize: 12, color: '#666' }}> · ~{nb.dist} mi</span>}
                  <br />
                  <span style={{ fontSize: 12, color: '#666' }}>{nb.activities?.slice(0, 2).join(', ')}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Active beacons */}
          {beacons.map(b => (
            <Marker key={b._id} position={[b.lat!, b.lng!]} icon={beaconIcon}>
              <Popup>
                <div style={{ minWidth: 170, fontFamily: 'Inter, sans-serif' }}>
                  <strong style={{ fontSize: 13 }}>{b.activity} Beacon</strong>
                  <br />
                  <span style={{ fontSize: 12, color: '#555' }}>📍 {b.locationName}</span>
                  <br />
                  {b.message && <><span style={{ fontSize: 12, color: '#333' }}>{b.message}</span><br /></>}
                  <span style={{ fontSize: 11, color: '#009C9D' }}>By {b.author?.name}</span>
                  <span style={{ fontSize: 11, color: '#888' }}> · {b.minutesLeft}m left · {b.joiners?.length || 0} joined</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Refresh bar */}
      <div style={{ padding: '8px 16px', background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <Users size={14} color="var(--teal)" />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
          {neighbors.length} workout partners · {beacons.length} active beacons within 5 mi
        </span>
        <button onClick={loadData} style={{ background: 'var(--teal-light)', border: '1px solid #c0e9e9', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'var(--teal)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Radio size={12} /> Refresh
        </button>
      </div>
    </div>
  );
}

function LegendItem({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 15 }}>{emoji}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
