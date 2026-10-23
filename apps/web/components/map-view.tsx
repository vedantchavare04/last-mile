"use client";

import { CircleMarker, MapContainer, Popup, Polyline, TileLayer } from "react-leaflet";
import type { DonationBatch, Rider, Shelter } from "../lib/operations";

type Props = { batches: DonationBatch[]; riders: Rider[]; shelters: Shelter[]; onSelect: (id: string) => void };

const fallbackCenter: [number, number] = [40.7128, -74.006];

export function MapView({ batches, riders, shelters, onSelect }: Props) {
  const points = [
    ...batches.map((batch) => [batch.location.latitude, batch.location.longitude] as [number, number]),
    ...riders.filter((rider) => rider.location.latitude !== 0).map((rider) => [rider.location.latitude, rider.location.longitude] as [number, number]),
    ...shelters.map((shelter) => [shelter.location.latitude, shelter.location.longitude] as [number, number]),
  ];
  const center = points[0] ?? fallbackCenter;
  const routes = batches.flatMap((batch) => shelters.filter((shelter) => shelter.status === "open").slice(0, 1).map((shelter) => [[batch.location.latitude, batch.location.longitude], [shelter.location.latitude, shelter.location.longitude]] as [number, number][]));

  return (
    <div className="real-map-shell">
      <MapContainer center={center} zoom={points.length ? 12 : 11} scrollWheelZoom className="real-map">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routes.map((route, index) => <Polyline key={`route-${index}`} positions={route} pathOptions={{ color: "#4f9369", weight: 3, opacity: 0.75 }} />)}
        {batches.map((batch) => <CircleMarker key={batch.id} center={[batch.location.latitude, batch.location.longitude]} radius={9} pathOptions={{ color: batch.urgency === "critical" ? "#b94a43" : "#287a53", fillColor: batch.urgency === "critical" ? "#d9736b" : "#79b18a", fillOpacity: 0.95 }} eventHandlers={{ click: () => onSelect(batch.id) }}><Popup><strong>{batch.id}</strong><br />{batch.description}<br />{batch.availableQuantity} {batch.unit} available</Popup></CircleMarker>)}
        {shelters.map((shelter) => <CircleMarker key={shelter.id} center={[shelter.location.latitude, shelter.location.longitude]} radius={8} pathOptions={{ color: "#47749a", fillColor: "#86b3ca", fillOpacity: 0.95 }} eventHandlers={{ click: () => onSelect(shelter.id) }}><Popup><strong>{shelter.name}</strong><br />{shelter.remainingDemand} units requested</Popup></CircleMarker>)}
        {riders.filter((rider) => rider.location.latitude !== 0).map((rider) => <CircleMarker key={rider.id} center={[rider.location.latitude, rider.location.longitude]} radius={7} pathOptions={{ color: "#a66718", fillColor: "#d4a65d", fillOpacity: 0.95 }} eventHandlers={{ click: () => onSelect(rider.id) }}><Popup><strong>{rider.name}</strong><br />{rider.status} · {rider.currentLoad}/{rider.capacity} units</Popup></CircleMarker>)}
      </MapContainer>
      <div className="map-empty-hint">{points.length ? "Click a marker to open its record · drag to pan · scroll to zoom" : "Your map is ready. Create a batch, shelter, or rider to see it here."}</div>
      <div className="simulated-tag">OPENSTREETMAP · LIVE INTERACTION</div>
    </div>
  );
}
