"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslations } from "next-intl";
import { parseMapsLink } from "@/lib/maps-link";

export const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#5b2bd8;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

function Click({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Moves the view when the pin is set from a pasted link or typed coordinates. */
function Follow({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  const lat = pos?.[0];
  const lon = pos?.[1];
  useEffect(() => {
    if (lat == null || lon == null) return;
    const c = map.getCenter();
    if (Math.abs(c.lat - lat) > 0.0005 || Math.abs(c.lng - lon) > 0.0005)
      map.setView([lat, lon], Math.max(map.getZoom(), 15));
  }, [map, lat, lon]);
  return null;
}

export function MapPickerInner({
  lat,
  lon,
  tileUrl,
  attribution,
}: {
  lat: number | null;
  lon: number | null;
  tileUrl: string;
  attribution: string;
}) {
  const t = useTranslations("map");
  const [pos, setPos] = useState<[number, number] | null>(
    lat != null && lon != null ? [lat, lon] : null,
  );
  const [link, setLink] = useState("");
  const fromLink = link.trim() ? parseMapsLink(link) : null;
  const center: [number, number] = pos ?? [-6.2, 106.82];
  return (
    <div>
      <label>
        {t("linkLabel")}
        <input
          name="mapsLink"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            const p = parseMapsLink(e.target.value);
            if (p) setPos([p.lat, p.lon]);
          }}
          placeholder={t("linkPlaceholder")}
          inputMode="url"
          autoComplete="off"
          aria-describedby="maps-link-hint"
        />
      </label>
      <p id="maps-link-hint" className="small muted" style={{ marginTop: 6 }}>
        {link.trim() ? (fromLink ? t("linkOk") : t("linkOnSave")) : t("linkHelp")}
      </p>
      <p className="small muted">{t("pickHelp")}</p>
      <div className="map">
        <MapContainer
          center={center}
          zoom={pos ? 15 : 11}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer url={tileUrl} attribution={attribution} />
          <Click onPick={(a, b) => setPos([a, b])} />
          <Follow pos={pos} />
          {pos ? (
            <Marker
              position={pos}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  setPos([ll.lat, ll.lng]);
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="row small" style={{ marginTop: 6 }}>
        <label>
          {t("lat")}
          <input
            name="lat"
            value={pos ? pos[0].toFixed(6) : ""}
            onChange={(e) => setPos([Number(e.target.value), pos?.[1] ?? 106.82])}
            inputMode="decimal"
          />
        </label>
        <label>
          {t("lon")}
          <input
            name="lon"
            value={pos ? pos[1].toFixed(6) : ""}
            onChange={(e) => setPos([pos?.[0] ?? -6.2, Number(e.target.value)])}
            inputMode="decimal"
          />
        </label>
      </div>
    </div>
  );
}
