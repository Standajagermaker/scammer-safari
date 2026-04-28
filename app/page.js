"use client";

import { useEffect, useMemo, useState } from "react";
import LeafletMap from "./LeafletMap";

const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };
const CLUSTER_THRESHOLD = 0.0005;
const NEARBY_THRESHOLD = 0.0012;
const inputStyle = { padding: 12, borderRadius: 10, border: "1px solid #444", background: "#181818", color: "white" };
const cardStyle = { background: "#181818", border: "1px solid #333", borderRadius: 20, padding: 20 };
const helpTextStyle = { margin: "-6px 0 0", color: "#aaa", fontSize: 13, lineHeight: 1.4 };

const fallbackSpots = [
  { id: "old-town", name: "Old Town Square", city: "Prague", note: "Classic tourist crowd zone near the Astronomical Clock.", lat: 50.087, lng: 14.421 },
  { id: "wenceslas", name: "Wenceslas Square", city: "Prague", note: "Busy boulevard with heavy tourist foot traffic.", lat: 50.081, lng: 14.428 },
  { id: "celetna", name: "Celetna Street", city: "Prague", note: "Tourist route between Old Town Square and Powder Tower.", lat: 50.0878, lng: 14.4255 },
  { id: "charles-bridge", name: "Charles Bridge area", city: "Prague", note: "Crowded route between Old Town and Mala Strana.", lat: 50.086, lng: 14.411 },
  { id: "karlova", name: "Karlova Street", city: "Prague", note: "Narrow tourist street connecting bridge to Old Town.", lat: 50.0868, lng: 14.4185 },
  { id: "havelske", name: "Havelske trziste", city: "Prague", note: "Market area with frequent tourist traffic.", lat: 50.0855, lng: 14.4225 }
];

const catchphrases = [
  "Do not change money on the street. Ever.",
  "If the deal looks too good, it is probably not a deal.",
  "Look around, stay calm, and report the pattern.",
  "Tourist traps hate daylight.",
  "The safest safari rule: observe, document, do not confront."
];

function toNumber(value) { const n = Number(value); return Number.isFinite(n) && n !== 0 ? n : null; }
function today() { return new Date().toISOString().slice(0, 10); }
function last24Date() { const d = new Date(); d.setDate(d.getDate() - 1); return d; }
function distance(a, b) { return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2); }
function reportQuery(report) { return [report.area, report.location_label, report.city].filter(Boolean).join(", "); }

async function geocodeText(query) {
  if (!query || query.trim().length < 3) return null;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    const first = data[0];
    if (!first) return null;
    const lat = Number(first.lat); const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: first.display_name || query };
  } catch { return null; }
}

function pointsFromReports(reports) {
  return reports.map((r) => ({ ...r, lat: toNumber(r.lat), lng: toNumber(r.lng), label: r.area || r.location_label || r.scam_type || "Report", count: r.count || 1 })).filter((r) => r.lat !== null && r.lng !== null);
}

function filterByMode(reports, mode) {
  if (mode !== "24h") return reports;
  const cutoff = last24Date();
  return reports.filter((r) => new Date(r.incident_date || r.created_at || 0) >= cutoff);
}

function clusterReports(reports) {
  const clusters = [];
  for (const report of pointsFromReports(reports)) {
    let match = null;
    for (const cluster of clusters) {
      if (distance(report, cluster.center) < CLUSTER_THRESHOLD) { match = cluster; break; }
    }
    if (match) {
      match.reports.push(report);
      const c = match.reports.length;
      match.center.lat = (match.center.lat * (c - 1) + report.lat) / c;
      match.center.lng = (match.center.lng * (c - 1) + report.lng) / c;
    } else clusters.push({ center: { lat: report.lat, lng: report.lng }, reports: [report] });
  }
  return clusters.sort((a, b) => b.reports.length - a.reports.length);
}

function topLocationsToday(reports) {
  const d = today(); const counts = new Map();
  reports.filter((r) => r.incident_date === d).forEach((r) => {
    const key = `${r.area || r.location_label || "Unknown area"}, ${r.city || "Unknown city"}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function topPattern(reports) {
  const counts = new Map();
  reports.forEach((r) => {
    const raw = (r.suspect_description || r.scam_type || "").trim().toLowerCase();
    if (!raw) return;
    const key = raw.length > 65 ? `${raw.slice(0, 65)}...` : raw;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], count: top[1] } : null;
}

function nearbyZone(location, reports) {
  const lat = toNumber(location.lat); const lng = toNumber(location.lng);
  if (lat === null || lng === null) return null;
  let nearest = null;
  for (const cluster of clusterReports(reports)) {
    const d = distance({ lat, lng }, cluster.center);
    if (d < NEARBY_THRESHOLD && (!nearest || d < nearest.distance)) nearest = { ...cluster, distance: d };
  }
  return nearest;
}

function MapPreview({ lat, lng, title = "Map", height = 220 }) {
  const safeLat = toNumber(lat); const safeLng = toNumber(lng);
  const point = safeLat !== null && safeLng !== null ? { lat: safeLat, lng: safeLng, label: title } : null;
  return <LeafletMap points={point ? [point] : []} center={point || PRAGUE_CENTER} height={height} zoom={15} title={title} />;
}

function HeatMap({ reports }) {
  const points = pointsFromReports(reports);
  if (!points.length) return <p style={{ color: "#aaa" }}>No mapped reports yet. Reports without GPS are searched by city and place name.</p>;
  return <LeafletMap points={points} heat height={340} zoom={13} title="Scam heatmap" />;
}

function ClusterMap({ reports }) {
  const clusters = clusterReports(reports).map((cluster, index) => ({ lat: cluster.center.lat, lng: cluster.center.lng, radius: 70 + cluster.reports.length * 35, count: cluster.reports.length, label: `Zone ${index + 1}: ${cluster.reports.length} reports` }));
  if (!clusters.length) return <p style={{ color: "#aaa" }}>No clustered locations yet.</p>;
  return <LeafletMap points={clusters} heat height={300} zoom={13} title="Cluster map" />;
}

function Insights({ reports, location }) {
  const locs = topLocationsToday(reports);
  const pattern = topPattern(reports);
  const near = nearbyZone(location, reports);
  return <section style={{ ...cardStyle, marginTop: 28 }}><h2 style={{ marginTop: 0 }}>Live intelligence</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}><article style={{ background: "#111", border: "1px solid #333", borderRadius: 16, padding: 14 }}><strong style={{ color: "#fbbf24" }}>Top 5 locations today</strong>{locs.length ? <ol style={{ color: "#ccc", paddingLeft: 20 }}>{locs.map(([n, c]) => <li key={n}>{n} <span style={{ color: "#aaa" }}>({c})</span></li>)}</ol> : <p style={{ color: "#aaa" }}>No reports today yet.</p>}</article><article style={{ background: "#111", border: "1px solid #333", borderRadius: 16, padding: 14 }}><strong style={{ color: "#fbbf24" }}>Most reported pattern</strong>{pattern ? <p style={{ color: "#ccc", lineHeight: 1.5 }}>{pattern.name} <span style={{ color: "#aaa" }}>({pattern.count})</span></p> : <p style={{ color: "#aaa" }}>No pattern detected yet.</p>}</article><article style={{ background: near ? "#2a1c00" : "#111", border: near ? "1px solid #fbbf24" : "1px solid #333", borderRadius: 16, padding: 14 }}><strong style={{ color: "#fbbf24" }}>Nearby hotspot alert</strong>{near ? <p style={{ color: "#ffd36a", lineHeight: 1.5 }}>You may be near a reported zone with {near.reports.length} report{near.reports.length === 1 ? "" : "s"}. Stay aware and do not confront anyone.</p> : <p style={{ color: "#aaa" }}>Use GPS to check whether you are near a reported hotspot.</p>}</article></div></section>;
}

function ClusterList({ reports }) {
  const clusters = clusterReports(reports);
  if (!clusters.length) return <p style={{ color: "#aaa" }}>No detected zones yet. Reports will be clustered after GPS or city lookup.</p>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{clusters.slice(0, 6).map((cluster, index) => <article key={index} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, background: "#111" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong style={{ color: "#fbbf24" }}>Detected zone #{index + 1}</strong><span style={{ color: "#aaa", fontSize: 13 }}>{cluster.reports.length} report{cluster.reports.length === 1 ? "" : "s"}</span></div><div style={{ marginTop: 12 }}><MapPreview lat={cluster.center.lat} lng={cluster.center.lng} title={`Detected zone ${index + 1}`} height={185} /></div><p style={{ color: "#ccc" }}>Common area: {cluster.reports[0]?.area || cluster.reports[0]?.location_label || "Unknown area"}</p></article>)}</div>;
}

export default function Home() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [mode, setMode] = useState("all");
  const [feedStatus, setFeedStatus] = useState("Loading reports...");
  const [location, setLocation] = useState({ lat: null, lng: null, label: "" });
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [locationStatus, setLocationStatus] = useState("");
  const [visitCount, setVisitCount] = useState(null);
  const [spots, setSpots] = useState(fallbackSpots);
  const todayValue = useMemo(() => today(), []);
  const visibleReports = filterByMode(reports, mode);
  const alertCount = filterByMode(reports, "24h").length;

  async function supabase(path, options = {}) { return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, { ...options, headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, ...(options.headers || {}) } }); }

  async function resolveMissingCoordinates(rows) {
    const resolved = [];
    for (const report of rows) {
      const lat = toNumber(report.lat); const lng = toNumber(report.lng);
      if (lat !== null && lng !== null) { resolved.push({ ...report, lat, lng }); continue; }
      const found = await geocodeText(reportQuery(report));
      resolved.push(found ? { ...report, lat: found.lat, lng: found.lng, location_label: report.location_label || found.label } : report);
    }
    return resolved;
  }

  async function loadReports() {
    try { const response = await supabase("/rest/v1/reports?select=*&order=created_at.desc&limit=80"); if (!response.ok) throw new Error(await response.text()); const rows = await response.json(); const resolved = await resolveMissingCoordinates(rows); setReports(resolved); setFeedStatus(resolved.length ? "" : "No reports yet. Be the first to submit one."); } catch (error) { setFeedStatus(`Could not load feed: ${error.message}`); }
  }

  async function trackVisit() { try { await supabase("/rest/v1/site_visits", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ page: "home" }) }); const response = await supabase("/rest/v1/site_visits?select=id", { headers: { Prefer: "count=exact" } }); const range = response.headers.get("content-range") || ""; const count = range.includes("/") ? Number(range.split("/").pop()) : null; if (Number.isFinite(count)) setVisitCount(count); } catch { setVisitCount(null); } }
  async function loadFavoriteSpots() { try { const response = await supabase("/rest/v1/scammer_spots?select=*&order=sort_order.asc"); if (!response.ok) return; const data = await response.json(); if (data.length) setSpots(data); } catch {} }
  useEffect(() => { loadReports(); trackVisit(); loadFavoriteSpots(); }, []);

  async function searchLocations(query) { setLocationQuery(query); if (query.trim().length < 3) { setSuggestions([]); return; } try { const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } }); if (response.ok) setSuggestions(await response.json()); } catch { setSuggestions([]); } }
  function pickSuggestion(place) { const lat = Number(place.lat), lng = Number(place.lon), label = place.display_name || locationQuery; setLocation({ lat, lng, label }); setLocationQuery(label); setSuggestions([]); setLocationStatus("Location selected from map search."); }
  function useCurrentLocation() { setLocationStatus("Requesting mobile GPS location..."); if (!navigator.geolocation) { setLocationStatus("GPS is not available in this browser."); return; } navigator.geolocation.getCurrentPosition((position) => { setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, label: "Current GPS location" }); setLocationQuery("Current GPS location"); setLocationStatus("GPS captured. Nearby alert updated."); }, () => setLocationStatus("Could not access GPS. Please allow location permission or search manually."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }); }
  async function shareSite() { try { if (navigator.share) await navigator.share({ title: "Scammer Safari", text: "Community tourist safety map", url: window.location.href }); else await navigator.clipboard.writeText(window.location.href); setStatus("Share link ready."); } catch {} }

  async function uploadPhoto(file) { if (!file || file.size === 0) return ""; const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `${Date.now()}-${safeName}`; const response = await supabase(`/storage/v1/object/evidence/${path}`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }, body: file }); if (!response.ok) throw new Error(await response.text()); return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${path}`; }

  async function submitReport(event) {
    event.preventDefault(); const formElement = event.currentTarget; setLoading(true); setStatus(""); const form = new FormData(formElement);
    try { const city = form.get("city") || "Unknown"; const area = form.get("area") || location.label || "Unknown area"; let lat = Number.isFinite(location.lat) ? location.lat : null; let lng = Number.isFinite(location.lng) ? location.lng : null; let label = location.label || area; if (lat === null || lng === null) { const found = await geocodeText(`${area}, ${city}`); if (found) { lat = found.lat; lng = found.lng; label = found.label; } } const photo_url = await uploadPhoto(form.get("photo")); const payload = { city, area, location_label: label, lat, lng, scam_type: form.get("scam_type") || "Street exchange scam", amount: form.get("amount") || "Unknown", incident_date: form.get("incident_date") || todayValue, suspect_description: form.get("suspect_description") || "", description: form.get("description") || "", photo_url, status: "unverified" }; const response = await supabase("/rest/v1/reports", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(await response.text()); formElement.reset(); setLocation({ lat: null, lng: null, label: "" }); setLocationQuery(""); setSuggestions([]); setLocationStatus(""); setStatus("Report saved. Thank you. Stay safe."); await loadReports(); } catch (error) { setStatus(`Error: ${error.message}`); } finally { setLoading(false); }
  }

  async function quickReport() { setStatus("Quick report needs GPS..."); if (!navigator.geolocation) { setStatus("GPS is not available."); return; } navigator.geolocation.getCurrentPosition(async (position) => { try { const payload = { city: "Unknown", area: "Quick GPS report", location_label: "Quick GPS report", lat: position.coords.latitude, lng: position.coords.longitude, scam_type: "Street exchange scam", amount: "Unknown", incident_date: todayValue, suspect_description: "Quick anonymous report", description: "Quick report submitted from current GPS location.", photo_url: "", status: "unverified" }; const response = await supabase("/rest/v1/reports", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(await response.text()); setStatus("Quick report saved. Stay safe."); await loadReports(); } catch (e) { setStatus(`Error: ${e.message}`); } }, () => setStatus("Could not access GPS for quick report."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }); }

  return <main style={{ fontFamily: "Arial, sans-serif", background: "#111", color: "white", minHeight: "100vh", padding: 40 }}>
    {alertCount > 0 && <div style={{ background: "#7f1d1d", border: "1px solid #ef4444", padding: 14, borderRadius: 14, marginBottom: 20 }}>⚠️ {alertCount} scam report{alertCount === 1 ? "" : "s"} in the last 24 hours. Stay aware and do not confront anyone.</div>}
    <section style={{ maxWidth: 980 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap" }}><div><p style={{ color: "#fbbf24", fontWeight: "bold" }}>Community tourist safety map</p><h1 style={{ fontSize: 54, margin: "10px 0" }}>Scammer Safari</h1></div><div style={{ ...cardStyle, padding: "12px 16px", minWidth: 150 }}><div style={{ color: "#aaa", fontSize: 13 }}>Visits</div><strong style={{ color: "#fbbf24", fontSize: 28 }}>{visitCount === null ? "—" : visitCount}</strong></div></div><p style={{ color: "#aaa", lineHeight: 1.6 }}>Inspired by investigations of <strong>Janek Rubes & Honza Mikulka</strong>. We are honest, You are honest and They are <a href="https://www.youtube.com/@HONESTGUIDE" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", textDecoration: "none", fontWeight: "bold" }}>Honest Guide</a>. Read more on <a href="https://honest.blog/" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", textDecoration: "none", fontWeight: "bold" }}>Honest Blog</a>.</p><p style={{ fontSize: 20, color: "#ccc", lineHeight: 1.6 }}>Catch the scam. Do not chase the scammer. Report street exchange scams, fake banknotes and tourist traps anonymously.</p><p style={{ background: "#2a1c00", color: "#ffd36a", padding: 16, borderRadius: 14, lineHeight: 1.5 }}>Safety rule: never confront, follow, threaten or publicly identify anyone. Move to a safe place and contact local police under 158.</p><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button onClick={() => setMode("all")} style={{ padding: 12, borderRadius: 12, border: "1px solid #444", background: mode === "all" ? "#fbbf24" : "#222", color: mode === "all" ? "#111" : "white", cursor: "pointer" }}>All time</button><button onClick={() => setMode("24h")} style={{ padding: 12, borderRadius: 12, border: "1px solid #444", background: mode === "24h" ? "#fbbf24" : "#222", color: mode === "24h" ? "#111" : "white", cursor: "pointer" }}>Last 24h</button><button onClick={shareSite} style={{ padding: 12, borderRadius: 12, border: "1px solid #444", background: "#222", color: "white", cursor: "pointer" }}>Share</button><button onClick={quickReport} style={{ padding: 12, borderRadius: 12, border: 0, background: "#ef4444", color: "white", fontWeight: "bold", cursor: "pointer" }}>🚨 Quick report near me</button></div></section>
    <Insights reports={visibleReports} location={location} />
    <section style={{ ...cardStyle, marginTop: 28 }}><h2 style={{ marginTop: 0 }}>Next level map</h2><ClusterMap reports={visibleReports} /></section>
    <section style={{ ...cardStyle, marginTop: 28 }}><h2 style={{ marginTop: 0 }}>Rulickar favorite spots</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>{spots.map((spot) => <article key={spot.id || spot.name} style={{ background: "#111", border: "1px solid #333", borderRadius: 16, padding: 14 }}><strong style={{ color: "#fbbf24" }}>{spot.name}</strong><p style={{ color: "#aaa", margin: "6px 0" }}>{spot.city}</p><p style={{ color: "#ccc", lineHeight: 1.4 }}>{spot.note}</p></article>)}</div></section>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,620px) minmax(280px,1fr)", gap: 24, alignItems: "start", marginTop: 40 }}><section style={cardStyle}><h2 style={{ marginTop: 0 }}>Report a scam anonymously</h2><form onSubmit={submitReport} style={{ display: "flex", flexDirection: "column", gap: 14 }}><select name="scam_type" style={inputStyle} defaultValue="Street exchange scam"><option>Street exchange scam</option><option>Fake banknotes</option><option>ATM scam</option><option>Taxi scam</option><option>Restaurant overcharge</option><option>Other tourist scam</option></select><input name="city" placeholder="City, e.g. Prague" required style={inputStyle} /><button type="button" onClick={useCurrentLocation} style={{ padding: 12, borderRadius: 10, border: 0, background: "#fbbf24", color: "#111", fontWeight: "bold", cursor: "pointer" }}>Use my current GPS location</button><input value={locationQuery} onChange={(e) => searchLocations(e.target.value)} placeholder="Search place, e.g. Old Town Square Prague" style={inputStyle} />{suggestions.length > 0 && <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", background: "#111" }}>{suggestions.map((place) => <button key={place.place_id} type="button" onClick={() => pickSuggestion(place)} style={{ display: "block", width: "100%", padding: 10, textAlign: "left", border: 0, borderBottom: "1px solid #222", background: "#111", color: "white", cursor: "pointer" }}>{place.display_name}</button>)}</div>}{locationStatus && <p style={helpTextStyle}>{locationStatus}</p>}<MapPreview lat={location.lat} lng={location.lng} title="Selected location" /><input name="area" placeholder="Location note" required style={inputStyle} /><input name="amount" placeholder="Amount lost, e.g. EUR 200" style={inputStyle} /><input name="incident_date" type="date" defaultValue={todayValue} style={inputStyle} /><textarea name="suspect_description" placeholder="Suspect description / nickname" rows={4} style={inputStyle} /><p style={helpTextStyle}>Do not write insults or personal accusations. Describe visible details and repeat patterns only.</p><textarea name="description" placeholder="What happened?" rows={6} required style={inputStyle} /><input name="photo" type="file" accept="image/*" style={inputStyle} /><label style={{ display: "flex", gap: 10, color: "#ccc", fontSize: 14, lineHeight: 1.5 }}><input type="checkbox" required />I confirm this report is true to the best of my knowledge and I understand public accusations or harassment are not allowed.</label><button disabled={loading} type="submit" style={{ padding: 14, borderRadius: 12, border: 0, background: "#fbbf24", color: "#111", fontWeight: "bold", cursor: "pointer" }}>{loading ? "Saving..." : "Submit anonymous report"}</button></form>{status && <p style={{ marginTop: 18, color: status.startsWith("Error") ? "#ff8a8a" : "#86efac" }}>{status}</p>}</section><section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><h2 style={{ margin: 0 }}>Scam heatmap</h2><button onClick={loadReports} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #444", background: "#222", color: "white", cursor: "pointer" }}>Refresh</button></div><div style={{ marginTop: 16 }}><HeatMap reports={visibleReports} /></div><h2 style={{ marginTop: 28 }}>Detected zones</h2><ClusterList reports={visibleReports} /><h2 style={{ marginTop: 28 }}>Recent reports</h2>{feedStatus && <p style={{ color: "#aaa", lineHeight: 1.5 }}>{feedStatus}</p>}<div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>{visibleReports.slice(0, 12).map((report) => <article key={report.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, background: "#111" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong style={{ color: "#fbbf24" }}>{report.scam_type || "Report"}</strong><span style={{ color: "#aaa", fontSize: 13 }}>{report.status || "unverified"}</span></div><p style={{ color: "#ddd" }}>{report.area || report.location_label || "Unknown area"}, {report.city || "Unknown city"}</p><p style={{ color: "#aaa", fontSize: 14 }}>{report.incident_date || "No date"} · {report.amount || "Unknown amount"}</p>{toNumber(report.lat) !== null && toNumber(report.lng) !== null && <MapPreview lat={report.lat} lng={report.lng} title={report.area || "Report map"} />}{report.suspect_description && <p style={{ color: "#ddd", lineHeight: 1.5 }}><strong>Pattern:</strong> {report.suspect_description}</p>}{report.description && <p style={{ color: "#ccc", lineHeight: 1.5 }}>{report.description}</p>}{report.photo_url && <img src={report.photo_url} alt="Uploaded evidence" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14, marginTop: 12, border: "1px solid #333" }} />}</article>)}</div></section></div>
    <footer style={{ ...cardStyle, marginTop: 30 }}><h2 style={{ marginTop: 0 }}>Legal and safety notice</h2><p style={{ color: "#aaa", lineHeight: 1.6 }}>This platform collects anonymous community reports for tourist safety awareness. Reports are unverified unless marked otherwise. Do not identify, threaten, follow, harass, or confront individuals. If you are in danger or have been defrauded, contact local police.</p><h2>Legendary rulickar wisdom</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>{catchphrases.map((quote) => <blockquote key={quote} style={{ margin: 0, padding: 14, borderLeft: "4px solid #fbbf24", background: "#111", color: "#ddd", borderRadius: 12 }}>“{quote}”</blockquote>)}</div></footer>
  </main>;
}
