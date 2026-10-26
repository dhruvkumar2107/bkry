import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const colorFor = (c) => c || '#15803d';

const pinIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px">
      <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${colorFor(color)};box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff"></div>
      <div style="position:absolute;left:50%;top:50%;width:9px;height:9px;background:#fff;border-radius:50%;transform:translate(-50%,-50%)"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

function Recenter({ center, follow }) {
  const map = useMap();
  useEffect(() => {
    if (center && follow) map.setView(center, map.getZoom());
    else if (center && !map.getBounds().contains(center)) map.setView(center, map.getZoom());
  }, [center?.[0], center?.[1], follow, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapView({ markers = [], route, center, zoom = 14, height = 320, follow = false }) {
  const valid = markers.filter((m) => m.lat != null && m.lng != null);
  const c = center || (valid[0] ? [valid[0].lat, valid[0].lng] : [16.8302, 75.71]);

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-slate-100">
      <MapContainer center={c} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#15803d', weight: 5, opacity: 0.8 }} />}
        {valid.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={pinIcon(m.color)}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
        <Recenter center={valid.length ? [valid[0].lat, valid[0].lng] : undefined} follow={follow} />
      </MapContainer>
    </div>
  );
}
