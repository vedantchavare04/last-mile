"use client";

import dynamic from "next/dynamic";

export const DynamicMap = dynamic(() => import("./map-view").then((module) => module.MapView), { ssr: false, loading: () => <div className="real-map-shell map-loading">Loading map…</div> });
