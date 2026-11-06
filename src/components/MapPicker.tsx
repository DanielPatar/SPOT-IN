"use client";
import dynamic from "next/dynamic";

/** Map pin drop for the property (FR-M4-01): the pin is the source of truth for location. */
export const MapPicker = dynamic(() => import("./MapPickerInner").then((m) => m.MapPickerInner), { ssr: false, loading: () => <div className="map" /> });
export const ResultsMap = dynamic(() => import("./ResultsMapInner").then((m) => m.ResultsMapInner), { ssr: false, loading: () => <div className="map" /> });
export const StaticMap = dynamic(() => import("./ResultsMapInner").then((m) => m.StaticMapInner), { ssr: false, loading: () => <div className="map" /> });
