"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { pinIcon } from "./MapPickerInner";

export type Pin = { id: string; lat: number; lon: number; title: string; subtitle: string; href: string };

function clusterIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#d9822b;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

/** Grid clustering by zoom level (FR-M7-03 clustered pins), no extra plugin needed. */
function Clustered({ pins }: { pins: Pin[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const f = () => setZoom(map.getZoom());
    map.on("zoomend", f);
    return () => { map.off("zoomend", f); };
  }, [map]);
  const groups = useMemo(() => {
    const cell = 80 / Math.pow(2, zoom); // degrees per cluster cell
    const m = new Map<string, Pin[]>();
    for (const p of pins) {
      const k = zoom >= 15 ? p.id : `${Math.floor(p.lat / cell)}:${Math.floor(p.lon / cell)}`;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.values()];
  }, [pins, zoom]);
  return (
    <>
      {groups.map((g) =>
        g.length === 1 ? (
          <Marker key={g[0]!.id} position={[g[0]!.lat, g[0]!.lon]} icon={pinIcon}>
            <Popup>
              <a href={g[0]!.href}>
                <strong>{g[0]!.title}</strong>
              </a>
              <br />
              {g[0]!.subtitle}
            </Popup>
          </Marker>
        ) : (
          <Marker
            key={g.map((p) => p.id).join(",")}
            position={[g.reduce((s, p) => s + p.lat, 0) / g.length, g.reduce((s, p) => s + p.lon, 0) / g.length]}
            icon={clusterIcon(g.length)}
            eventHandlers={{ click: (e) => map.setView(e.latlng, Math.min(map.getZoom() + 2, 18)) }}
          />
        ),
      )}
    </>
  );
}

function Fit({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number])), { padding: [30, 30], maxZoom: 15 });
  }, [map, pins]);
  return null;
}

export function ResultsMapInner({ pins, tileUrl, attribution }: { pins: Pin[]; tileUrl: string; attribution: string }) {
  return (
    <div className="map" style={{ height: 520 }}>
      <MapContainer center={[-6.2, 106.82]} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer url={tileUrl} attribution={attribution} />
        <Fit pins={pins} />
        <Clustered pins={pins} />
      </MapContainer>
    </div>
  );
}

export function StaticMapInner({ lat, lon, tileUrl, attribution }: { lat: number; lon: number; tileUrl: string; attribution: string }) {
  return (
    <div className="map" style={{ height: 260 }}>
      <MapContainer center={[lat, lon]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer url={tileUrl} attribution={attribution} />
        <Marker position={[lat, lon]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
