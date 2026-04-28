"use client";

import { useEffect, useMemo, useState } from "react";

const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };
const CLUSTER_THRESHOLD = 0.0005;

const inputStyle = { padding: "12px", borderRadius: "10px", border: "1px solid #444", background: "#181818", color: "white" };
const helpTextStyle = { margin: "-6px 0 0", color: "#aaa", fontSize: "13px", lineHeight: 1.4 };
const cardStyle = { background: "#181818", border: "1px solid #333", borderRadius: "20px", padding: "20px" };

const fallbackSpots = [
  { id: "old-town", name: "Old Town Square", city: "Prague", note: "Classic tourist crowd zone near the Astronomical Clock.", lat: 50.087, lng: 14.421 },
  { id: "wenceslas", name: "Wenceslas Square", city: "Prague", note: "Busy boulevard with heavy tourist foot traffic.", lat: 50.081, lng: 14.428 },
  { id: "charles-bridge", name: "Charles Bridge area", city: "Prague", note: "Crowded route between Old Town and Mala Strana.", lat: 50.086, lng: 14.411 },
  { id: "main-station", name: "Main Railway Station", city: "Prague", note: "Arrival point for first-time visitors.", lat: 50.083, lng: 14.436 }
];

const catchphrases = [
  "Do not change money on the street. Ever.",
  "If the deal looks too good, it is probably not a deal.",
  "Look around, stay calm, and report the pattern.",
  "Tourist traps hate daylight.",
  "The safest safari rule: observe, document, do not confront."
];

function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function distance(a, b) { return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2)); }

function clusterReports(reports) {
  const clusters = [];
  const points = reports.map((r) => ({ ...r, lat: toNumber(r.lat), lng: toNumber(r.lng) })).filter((r) => r.lat !== null && r.lng !== null);
  for (const report of points) {
    let added = false;
    for (const cluster of clusters) {
      if (distance(report, cluster.center) < CLUSTER_THRESHOLD) {
        cluster.reports.push(report);
        const count = cluster.reports.length;
        cluster.center.lat = (cluster.center.lat * (count - 1) + report.lat) / count;
        cluster.center.lng = (cluster.center.lng * (count - 1) + report.lng) / count;
        added = true;
        break;
      }
    }
    if (!added) clusters.push({ center: { lat: report.lat, lng: report.lng }, reports: [report] });
  }
  return clusters.sort((a, b) => b.reports.length - a.reports.length);
}

function MapPreview({ lat, lng, title = "Selected location", height = 230 }) {
  const safeLat = toNumber(lat); const safeLng = toNumber(lng);
  const mapLat = safeLat !== null ? safeLat : PRAGUE_CENTER.lat;
  const mapLng = safeLng !== null ? safeLng : PRAGUE_CENTER.lng;
  const delta = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - delta}%2C${mapLat - delta}%2C${mapLng + delta}%2C${mapLat + delta}&layer=mapnik&marker=${mapLat}%2C${mapLng}`;
  return <div style={{ border: "1px solid #333", borderRadius: 16, overflow: "hidden", background: "#111" }}><iframe title={title} src={src} style={{ width: "100%", height, border: 0, display: "block" }} loading="lazy" /><div style={{ padding: 10, color: "#aaa", fontSize: 13 }}>{safeLat !== null && safeLng !== null ? `GPS: ${mapLat.toFixed(5)}, ${mapLng.toFixed(5)}` : "No GPS selected yet."}</div></div>;
}

function HeatMap({ reports }) {
  const points = reports.map((r) => ({ ...r, lat: toNumber(r.lat), lng: toNumber(r.lng) })).filter((r) => r.lat !== null && r.lng !== null);
  if (!points.length) return <p style={{ color: "#aaa" }}>No GPS reports yet. Submit a report with mobile location to start the heatmap.</p>;
  const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats) - 0.003, maxLat = Math.max(...lats) + 0.003, minLng = Math.min(...lngs) - 0.003, maxLng = Math.max(...lngs) + 0.003;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik`;
  return <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid #333", background: "#111" }}><iframe title="Scam heatmap" src={src} style={{ width: "100%", height: 320, border: 0, display: "block", filter: "brightness(0.72)" }} loading="lazy" /><div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{points.map((p) => { const left = ((p.lng - minLng) / (maxLng - minLng || 1)) * 100; const top = 100 - ((p.lat - minLat) / (maxLat - minLat || 1)) * 100; return <div key={p.id} style={{ position: "absolute", left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)", width: 42, height: 42, borderRadius: 999, background: "rgba(251,191,36,.32)", boxShadow: "0 0 28px 14px rgba(251,191,36,.28)", border: "2px solid rgba(251,191,36,.95)" }} />; })}</div><div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(0,0,0,.72)", padding: "8px 10px", borderRadius: 12, color: "#fbbf24", fontSize: 13 }}>{points.length} GPS report{points.length === 1 ? "" : "s"}</div></div>;
}

function ClusterList({ reports }) {
  const clusters = clusterReports(reports);
  if (!clusters.length) return <p style={{ color: "#aaa" }}>No detected scam zones yet. GPS reports will be clustered automatically.</p>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{clusters.slice(0, 6).map((c, i) => <article key={i} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, background: "#111" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong style={{ color: "#fbbf24" }}>Detected scam zone #{i + 1}</strong><span style={{ color: "#aaa", fontSize: 13 }}>{c.reports.length} report{c.reports.length === 1 ? "" : "s"}</span></div><div style={{ marginTop: 12 }}><MapPreview lat={c.center.lat} lng={c.center.lng} title={`Detected scam zone ${i + 1}`} height={190} /></div><p style={{ color: "#ccc" }}>Common area: {c.reports[0]?.area || c.reports[0]?.location_label || "Unknown area"}</p><ul style={{ color: "#ccc", paddingLeft: 18 }}>{c.reports.slice(0, 3).map((r) => <li key={r.id}>{r.suspect_description || r.scam_type || "Reported scam pattern"}</li>)}</ul></article>)}</div>;
}

export default function Home() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [feedStatus, setFeedStatus] = useState("Loading reports...");
  const [location, setLocation] = useState({ lat: null, lng: null, label: "" });
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [locationStatus, setLocationStatus] = useState("");
  const [visitCount, setVisitCount] = useState(null);
  const [spots, setSpots] = useState(fallbackSpots);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function supabase(path, options = {}) {
    return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, { ...options, headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, ...(options.headers || {}) } });
  }

  async function loadReports() {
    try { const res = await supabase("/rest/v1/reports?select=*&order=created_at.desc&limit=50"); if (!res.ok) throw new Error(await res.text()); const data = await res.json(); setReports(data); setFeedStatus(data.length ? "" : "No reports yet. Be the first to submit one."); } catch (e) { setFeedStatus(`Could not load public feed: ${e.message}`); }
  }

  async function trackVisit() {
    try {
      await supabase("/rest/v1/site_visits", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ page: "home" }) });
      const res = await supabase("/rest/v1/site_visits?select=id", { headers: { Prefer: "count=exact" } });
      const range = res.headers.get("content-range") || "";
      const count = range.includes("/") ? Number(range.split("/").pop()) : null;
      if (Number.isFinite(count)) setVisitCount(count);
    } catch { setVisitCount(null); }
  }

  async function loadFavoriteSpots() {
    try { const res = await supabase("/rest/v1/scammer_spots?select=*&order=sort_order.asc"); if (!res.ok) return; const data = await res.json(); if (data.length) setSpots(data); } catch {}
  }

  useEffect(() => { loadReports(); trackVisit(); loadFavoriteSpots(); }, []);

  async function searchLocations(query) {
    setLocationQuery(query);
    if (query.trim().length < 3) { setSuggestions([]); return; }
    try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } }); if (res.ok) setSuggestions(await res.json()); } catch { setSuggestions([]); }
  }

  function pickSuggestion(place) { const lat = Number(place.lat), lng = Number(place.lon); const label = place.display_name || locationQuery; setLocation({ lat, lng, label }); setLocationQuery(label); setSuggestions([]); setLocationStatus("Location selected from map search."); }

  function useCurrentLocation() {
    setLocationStatus("Requesting mobile GPS location...");
    if (!navigator.geolocation) { setLocationStatus("GPS is not available in this browser."); return; }
    navigator.geolocation.getCurrentPosition((pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Current GPS location" }); setLocationQuery("Current GPS location"); setLocationStatus("GPS location captured. You can still edit the area text."); }, () => setLocationStatus("Could not access GPS. Please allow location permission or search manually."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  async function uploadPhoto(file) {
    if (!file || file.size === 0) return "";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${Date.now()}-${safeName}`;
    const res = await supabase(`/storage/v1/object/evidence/${filePath}`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }, body: file });
    if (!res.ok) throw new Error(await res.text());
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${filePath}`;
  }

  async function submitReport(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true); setStatus("");
    const form = new FormData(formElement);
    try {
      const photo_url = await uploadPhoto(form.get("photo"));
      const payload = { city: form.get("city") || "Unknown", area: form.get("area") || location.label || "Unknown area", location_label: location.label || form.get("area") || "", lat: Number.isFinite(location.lat) ? location.lat : null, lng: Number.isFinite(location.lng) ? location.lng : null, scam_type: form.get("scam_type") || "Street exchange scam", amount: form.get("amount") || "Unknown", incident_date: form.get("incident_date") || today, suspect_description: form.get("suspect_description") || "", description: form.get("description") || "", photo_url, status: "unverified" };
      const res = await supabase("/rest/v1/reports", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      formElement.reset(); setLocation({ lat: null, lng: null, label: "" }); setLocationQuery(""); setSuggestions([]); setLocationStatus(""); setStatus("Report saved. Thank you. Stay safe and do not confront anyone."); await loadReports();
    } catch (e) { setStatus(`Error: ${e.message}`); } finally { setLoading(false); }
  }

  return <main style={{ fontFamily: "Arial, sans-serif", background: "#111", color: "white", minHeight: "100vh", padding: "40px" }}>
    <section style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap" }}>
        <div><p style={{ color: "#fbbf24", fontWeight: "bold" }}>Community tourist safety map</p><h1 style={{ fontSize: 54, margin: "10px 0" }}>Scammer Safari</h1></div>
        <div style={{ ...cardStyle, padding: "12px 16px", minWidth: 150 }}><div style={{ color: "#aaa", fontSize: 13 }}>Visits</div><strong style={{ color: "#fbbf24", fontSize: 28 }}>{visitCount === null ? "—" : visitCount}</strong></div>
      </div>
      <p style={{ color: "#aaa", lineHeight: 1.6 }}>Inspired by investigations of <strong>Janek Rubes & Honza Mikulka</strong> from <a href="https://www.youtube.com/@HONESTGUIDE" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", textDecoration: "none", fontWeight: "bold" }}>Honest Guide</a>. Read more on <a href="https://honest.blog/" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", textDecoration: "none", fontWeight: "bold" }}>Honest Blog</a>.</p>
      <p style={{ fontSize: 20, color: "#ccc", lineHeight: 1.6 }}>Catch the scam. Do not chase the scammer. Report street exchange scams, fake banknotes and tourist traps anonymously.</p>
      <p style={{ background: "#2a1c00", color: "#ffd36a", padding: 16, borderRadius: 14, lineHeight: 1.5 }}>Safety rule: never confront, follow, threaten or publicly identify anyone. Move to a safe place and contact local police.</p>
    </section>

    <section style={{ ...cardStyle, marginTop: 28 }}><h2 style={{ marginTop: 0 }}>Rulickar favorite spots</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{spots.map((s) => <article key={s.id || s.name} style={{ background: "#111", border: "1px solid #333", borderRadius: 16, padding: 14 }}><strong style={{ color: "#fbbf24" }}>{s.name}</strong><p style={{ color: "#aaa", margin: "6px 0" }}>{s.city}</p><p style={{ color: "#ccc", lineHeight: 1.4 }}>{s.note}</p></article>)}</div></section>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 620px) minmax(280px, 1fr)", gap: 24, alignItems: "start", marginTop: 40 }}>
      <section style={cardStyle}><h2 style={{ marginTop: 0 }}>Report a scam anonymously</h2><form onSubmit={submitReport} style={{ display: "flex", flexDirection: "column", gap: 14 }}><select name="scam_type" style={inputStyle} defaultValue="Street exchange scam"><option>Street exchange scam</option><option>Fake banknotes</option><option>ATM scam</option><option>Taxi scam</option><option>Restaurant overcharge</option><option>Other tourist scam</option></select><input name="city" placeholder="City, e.g. Prague" required style={inputStyle} /><button type="button" onClick={useCurrentLocation} style={{ padding: 12, borderRadius: 10, border: 0, background: "#fbbf24", color: "#111", fontWeight: "bold", cursor: "pointer" }}>Use my current GPS location</button><input value={locationQuery} onChange={(e) => searchLocations(e.target.value)} placeholder="Search place, e.g. Old Town Square Prague" style={inputStyle} />{suggestions.length > 0 && <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", background: "#111" }}>{suggestions.map((p) => <button key={p.place_id} type="button" onClick={() => pickSuggestion(p)} style={{ display: "block", width: "100%", padding: 10, textAlign: "left", border: 0, borderBottom: "1px solid #222", background: "#111", color: "white", cursor: "pointer" }}>{p.display_name}</button>)}</div>}{locationStatus && <p style={helpTextStyle}>{locationStatus}</p>}<MapPreview lat={location.lat} lng={location.lng} /><input name="area" placeholder="Location note, e.g. near Astronomical Clock" required style={inputStyle} /><input name="amount" placeholder="Amount lost, e.g. EUR 200" style={inputStyle} /><input name="incident_date" type="date" defaultValue={today} style={inputStyle} /><textarea name="suspect_description" placeholder="Suspect description / nickname" rows={4} style={inputStyle} /><p style={helpTextStyle}>Do not write insults or personal accusations. Describe visible details and repeat patterns only.</p><textarea name="description" placeholder="What happened?" rows={6} required style={inputStyle} /><input name="photo" type="file" accept="image/*" style={inputStyle} /><label style={{ display: "flex", gap: 10, color: "#ccc", fontSize: 14, lineHeight: 1.5 }}><input type="checkbox" required />I confirm this report is true to the best of my knowledge and I understand public accusations or harassment are not allowed.</label><button disabled={loading} type="submit" style={{ padding: 14, borderRadius: 12, border: 0, background: "#fbbf24", color: "#111", fontWeight: "bold", cursor: "pointer" }}>{loading ? "Saving..." : "Submit anonymous report"}</button></form>{status && <p style={{ marginTop: 18, color: status.startsWith("Error") ? "#ff8a8a" : "#86efac" }}>{status}</p>}</section>
      <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><h2 style={{ margin: 0 }}>Scam heatmap</h2><button onClick={loadReports} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #444", background: "#222", color: "white", cursor: "pointer" }}>Refresh</button></div><div style={{ marginTop: 16 }}><HeatMap reports={reports} /></div><h2 style={{ marginTop: 28 }}>Detected scam zones</h2><ClusterList reports={reports} /><h2 style={{ marginTop: 28 }}>Recent scam reports</h2>{feedStatus && <p style={{ color: "#aaa", lineHeight: 1.5 }}>{feedStatus}</p>}<div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>{reports.slice(0, 12).map((r) => <article key={r.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, background: "#111" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong style={{ color: "#fbbf24" }}>{r.scam_type || "Scam report"}</strong><span style={{ color: "#aaa", fontSize: 13 }}>{r.status || "unverified"}</span></div><p style={{ color: "#ddd" }}>{r.area || r.location_label || "Unknown area"}, {r.city || "Unknown city"}</p><p style={{ color: "#aaa", fontSize: 14 }}>{r.incident_date || "No date"} · {r.amount || "Unknown amount"}</p>{toNumber(r.lat) !== null && toNumber(r.lng) !== null && <MapPreview lat={r.lat} lng={r.lng} title={`Map for report ${r.id}`} />}{r.suspect_description && <p style={{ color: "#ddd", lineHeight: 1.5 }}><strong>Suspect / pattern:</strong> {r.suspect_description}</p>}{r.description && <p style={{ color: "#ccc", lineHeight: 1.5 }}>{r.description}</p>}{r.photo_url && <img src={r.photo_url} alt="Uploaded evidence for scam report" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14, marginTop: 12, border: "1px solid #333" }} />}</article>)}</div></section>
    </div>

    <footer style={{ ...cardStyle, marginTop: 30 }}><h2 style={{ marginTop: 0 }}>Legendary rulickar wisdom</h2><p style={{ color: "#aaa" }}>Original-style lines inspired by Honest Guide energy, not verified verbatim quotes.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{catchphrases.map((q) => <blockquote key={q} style={{ margin: 0, padding: 14, borderLeft: "4px solid #fbbf24", background: "#111", color: "#ddd", borderRadius: 12 }}>“{q}”</blockquote>)}</div></footer>
  </main>;
}
