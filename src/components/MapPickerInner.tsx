"use client";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslations } from "next-intl";

export const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#0f5c4d;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

function Click({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function MapPickerInner({ lat, lon, tileUrl, attribution }: { lat: number | null; lon: number | null; tileUrl: string; attribution: string }) {
  const t = useTranslations("map");
  const [pos, setPos] = useState<[number, number] | null>(lat != null && lon != null ? [lat, lon] : null);
  const center: [number, number] = pos ?? [-6.2, 106.82];
  return (
    <div>
      <p className="small muted">{t("pickHelp")}</p>
      <div className="map">
        <MapContainer center={center} zoom={pos ? 15 : 11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer url={tileUrl} attribution={attribution} />
          <Click onPick={(a, b) => setPos([a, b])} />
          {pos ? (
            <Marker
              position={pos}
              icon={pinIcon}
              draggable
              eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); setPos([ll.lat, ll.lng]); } }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="row small" style={{ marginTop: 6 }}>
        <label>
          {t("lat")}
          <input name="lat" value={pos ? pos[0].toFixed(6) : ""} onChange={(e) => setPos([Number(e.target.value), pos?.[1] ?? 106.82])} inputMode="decimal" />
        </label>
        <label>
          {t("lon")}
          <input name="lon" value={pos ? pos[1].toFixed(6) : ""} onChange={(e) => setPos([pos?.[0] ?? -6.2, Number(e.target.value)])} inputMode="decimal" />
        </label>
      </div>
    </div>
  );
}
