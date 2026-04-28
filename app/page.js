"use client";

import { useEffect, useMemo, useState } from "react";

const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };
const CLUSTER_THRESHOLD = 0.0005;

const inputStyle = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #444",
  background: "#181818",
  color: "white",
};

const helpTextStyle = {
  margin: "-6px 0 0",
  color: "#aaa",
  fontSize: "13px",
  lineHeight: 1.4,
};

const cardStyle = {
  background: "#181818",
  border: "1px solid #333",
  borderRadius: "20px",
  padding: "20px",
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distance(a, b) {
  return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
}

function clusterReports(reports) {
  const clusters = [];
  const points = reports
    .map((report) => ({ ...report, lat: toNumber(report.lat), lng: toNumber(report.lng) }))
    .filter((report) => report.lat !== null && report.lng !== null);

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

    if (!added) {
      clusters.push({ center: { lat: report.lat, lng: report.lng }, reports: [report] });
    }
  }

  return clusters.sort((a, b) => b.reports.length - a.reports.length);
}

function MapPreview({ lat, lng, title = "Selected location" }) {
  const safeLat = toNumber(lat);
  const safeLng = toNumber(lng);
  const hasPoint = safeLat !== null && safeLng !== null;
  const mapLat = hasPoint ? safeLat : PRAGUE_CENTER.lat;
  const mapLng = hasPoint ? safeLng : PRAGUE_CENTER.lng;
  const delta = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - delta}%2C${mapLat - delta}%2C${mapLng + delta}%2C${mapLat + delta}&layer=mapnik&marker=${mapLat}%2C${mapLng}`;

  return (
    <div style={{ border: "1px solid #333", borderRadius: 16, overflow: "hidden", background: "#111" }}>
      <iframe title={title} src={src} style={{ width: "100%", height: 230, border: 0, display: "block" }} loading="lazy" />
      <div style={{ padding: 10, color: "#aaa", fontSize: 13 }}>
        {hasPoint ? `GPS: ${mapLat.toFixed(5)}, ${mapLng.toFixed(5)}` : "No GPS selected yet."}
      </div>
    </div>
  );
}

function HeatMap({ reports }) {
  const points = reports
    .map((report) => ({ ...report, lat: toNumber(report.lat), lng: toNumber(report.lng) }))
    .filter((report) => report.lat !== null && report.lng !== null);

  if (!points.length) {
    return <p style={{ color: "#aaa" }}>No GPS reports yet. Submit a report with mobile location to start the heatmap.</p>;
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats) - 0.003;
  const maxLat = Math.max(...lats) + 0.003;
  const minLng = Math.min(...lngs) - 0.003;
  const maxLng = Math.max(...lngs) + 0.003;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;

  return (
    <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid #333", background: "#111" }}>
      <iframe title="Scam heatmap" src={src} style={{ width: "100%", height: 320, border: 0, display: "block", filter: "brightness(0.72)" }} loading="lazy" />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {points.map((point) => {
          const left = ((point.lng - minLng) / (maxLng - minLng || 1)) * 100;
          const top = 100 - ((point.lat - minLat) / (maxLat - minLat || 1)) * 100;
          return (
            <div
              key={point.id}
              title={point.area || "Scam report"}
              style={{
                position: "absolute",
                left: `${left}%`,
                top: `${top}%`,
                transform: "translate(-50%, -50%)",
                width: 42,
                height: 42,
                borderRadius: "999px",
                background: "rgba(251, 191, 36, 0.32)",
                boxShadow: "0 0 28px 14px rgba(251, 191, 36, 0.28)",
                border: "2px solid rgba(251, 191, 36, 0.95)",
              }}
            />
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(0,0,0,0.72)", padding: "8px 10px", borderRadius: 12, color: "#fbbf24", fontSize: 13 }}>
        {points.length} GPS report{points.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function ClusterList({ reports }) {
  const clusters = clusterReports(reports);

  if (!clusters.length) {
    return <p style={{ color: "#aaa" }}>No detected scam zones yet. GPS reports will be clustered automatically.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {clusters.slice(0, 6).map((cluster, index) => (
        <article key={`${cluster.center.lat}-${cluster.center.lng}-${index}`} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, background: "#111" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong style={{ color: "#fbbf24" }}>Detected scam zone #{index + 1}</strong>
            <span style={{ color: "#aaa", fontSize: 13 }}>{cluster.reports.length} report{cluster.reports.length === 1 ? "" : "s"}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <MapPreview lat={cluster.center.lat} lng={cluster.center.lng} title={`Detected scam zone ${index + 1}`} />
          </div>
          <p style={{ color: "#ccc", lineHeight: 1.5 }}>
            Common area: {cluster.reports[0]?.area || cluster.reports[0]?.location_label || "Unknown area"}
          </p>
          <ul style={{ color: "#ccc", paddingLeft: 18 }}>
            {cluster.reports.slice(0, 3).map((report) => (
              <li key={report.id}>{report.suspect_description || report.scam_type || "Reported scam pattern"}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
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

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function loadReports() {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reports?select=*&order=created_at.desc&limit=50`;
      const response = await fetch(url, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Could not load reports");
      }

      const data = await response.json();
      setReports(data);
      setFeedStatus(data.length ? "" : "No reports yet. Be the first to submit one.");
    } catch (error) {
      setFeedStatus(`Could not load public feed: ${error.message}`);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function searchLocations(query) {
    setLocationQuery(query);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const data = await response.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  }

  function pickSuggestion(place) {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    const label = place.display_name || locationQuery;
    setLocation({ lat, lng, label });
    setLocationQuery(label);
    setSuggestions([]);
    setLocationStatus("Location selected from map search.");
  }

  function useCurrentLocation() {
    setLocationStatus("Requesting mobile GPS location...");

    if (!navigator.geolocation) {
      setLocationStatus("GPS is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng, label: "Current GPS location" });
        setLocationQuery("Current GPS location");
        setLocationStatus("GPS location captured. You can still edit the area text.");
      },
      () => {
        setLocationStatus("Could not access GPS. Please allow location permission or search manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function uploadPhoto(file) {
    if (!file || file.size === 0) return "";

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${Date.now()}-${safeName}`;
    const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/evidence/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Could not upload photo");
    }

    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${filePath}`;
  }

  async function submitReport(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setStatus("");

    const form = new FormData(formElement);

    try {
      const photoFile = form.get("photo");
      const photo_url = await uploadPhoto(photoFile);

      const payload = {
        city: form.get("city") || "Unknown",
        area: form.get("area") || location.label || "Unknown area",
        location_label: location.label || form.get("area") || "",
        lat: Number.isFinite(location.lat) ? location.lat : null,
        lng: Number.isFinite(location.lng) ? location.lng : null,
        scam_type: form.get("scam_type") || "Street exchange scam",
        amount: form.get("amount") || "Unknown",
        incident_date: form.get("incident_date") || today,
        suspect_description: form.get("suspect_description") || "",
        description: form.get("description") || "",
        photo_url,
        status: "unverified",
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reports`, {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Could not save report");
      }

      formElement.reset();
      setLocation({ lat: null, lng: null, label: "" });
      setLocationQuery("");
      setSuggestions([]);
      setLocationStatus("");
      setStatus("Report saved. Thank you. Stay safe and do not confront anyone.");
      await loadReports();
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "Arial, sans-serif", background: "#111", color: "white", minHeight: "100vh", padding: "40px" }}>
      <section style={{ maxWidth: 900 }}>
        <p style={{ color: "#fbbf24", fontWeight: "bold" }}>Community tourist safety map</p>
        <h1 style={{ fontSize: 54, margin: "10px 0" }}>Scammer Safari</h1>
        <p style={{ color: "#aaa", lineHeight: 1.6 }}>
          Inspired by investigations of <strong>Janek Rubes & Honza Mikulka</strong> We are honest, You are honest, They are {" "}
          <a href="https://www.youtube.com/@HONESTGUIDE" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", textDecoration: "none", fontWeight: "bold" }}>
            Honest Guide
          </a>.
        </p>
        <p style={{ fontSize: 20, color: "#ccc", lineHeight: 1.6 }}>
          Catch the scam. Do not chase the scammer. Report street exchange scams, fake banknotes and tourist traps anonymously.
        </p>
        <p style={{ background: "#2a1c00", color: "#ffd36a", padding: 16, borderRadius: 14, lineHeight: 1.5 }}>
          Safety rule: never confront, follow, threaten or publicly identify anyone. Move to a safe place and contact local police.
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 620px) minmax(280px, 1fr)", gap: 24, alignItems: "start", marginTop: 40 }}>
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Report a scam anonymously</h2>
          <form onSubmit={submitReport} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <select name="scam_type" style={inputStyle} defaultValue="Street exchange scam">
              <option>Street exchange scam</option>
              <option>Fake banknotes</option>
              <option>ATM scam</option>
              <option>Taxi scam</option>
              <option>Restaurant overcharge</option>
              <option>Other tourist scam</option>
            </select>
            <input name="city" placeholder="City, e.g. Prague" required style={inputStyle} />

            <div style={{ display: "grid", gap: 10 }}>
              <button type="button" onClick={useCurrentLocation} style={{ padding: 12, borderRadius: 10, border: 0, background: "#fbbf24", color: "#111", fontWeight: "bold", cursor: "pointer" }}>
                Use my current GPS location
              </button>
              <input value={locationQuery} onChange={(event) => searchLocations(event.target.value)} placeholder="Search place, e.g. Old Town Square Prague" style={inputStyle} />
              {suggestions.length > 0 && (
                <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", background: "#111" }}>
                  {suggestions.map((place) => (
                    <button key={place.place_id} type="button" onClick={() => pickSuggestion(place)} style={{ display: "block", width: "100%", padding: 10, textAlign: "left", border: 0, borderBottom: "1px solid #222", background: "#111", color: "white", cursor: "pointer" }}>
                      {place.display_name}
                    </button>
                  ))}
                </div>
              )}
              {locationStatus && <p style={helpTextStyle}>{locationStatus}</p>}
              <MapPreview lat={location.lat} lng={location.lng} />
            </div>

            <input name="area" placeholder="Location note, e.g. near Astronomical Clock" required style={inputStyle} />
            <input name="amount" placeholder="Amount lost, e.g. EUR 200" style={inputStyle} />
            <input name="incident_date" type="date" defaultValue={today} style={inputStyle} />

            <textarea name="suspect_description" placeholder="Suspect description / nickname, e.g. blue jacket, grey hair, fake exchange guy near the clock" rows={4} style={inputStyle} />
            <p style={helpTextStyle}>Do not write insults or personal accusations. Describe visible details and repeat patterns only.</p>

            <textarea name="description" placeholder="What happened?" rows={6} required style={inputStyle} />

            <input name="photo" type="file" accept="image/*" style={inputStyle} />
            <p style={helpTextStyle}>Optional photo evidence. Public use should be blurred before publishing identifiable faces.</p>

            <label style={{ display: "flex", gap: 10, color: "#ccc", fontSize: 14, lineHeight: 1.5 }}>
              <input type="checkbox" required />
              I confirm this report is true to the best of my knowledge and I understand public accusations or harassment are not allowed.
            </label>
            <button disabled={loading} type="submit" style={{ padding: 14, borderRadius: 12, border: 0, background: "#fbbf24", color: "#111", fontWeight: "bold", cursor: "pointer" }}>
              {loading ? "Saving..." : "Submit anonymous report"}
            </button>
          </form>
          {status && <p style={{ marginTop: 18, color: status.startsWith("Error") ? "#ff8a8a" : "#86efac" }}>{status}</p>}
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Scam heatmap</h2>
            <button onClick={loadReports} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #444", background: "#222", color: "white", cursor: "pointer" }}>
              Refresh
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <HeatMap reports={reports} />
          </div>

          <h2 style={{ marginTop: 28 }}>Detected scam zones</h2>
          <ClusterList reports={reports} />

          <h2 style={{ marginTop: 28 }}>Recent scam reports</h2>
          {feedStatus && <p style={{ color: "#aaa", lineHeight: 1.5 }}>{feedStatus}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {reports.slice(0, 12).map((report) => (
              <article key={report.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, background: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: "#fbbf24" }}>{report.scam_type || "Scam report"}</strong>
                  <span style={{ color: "#aaa", fontSize: 13 }}>{report.status || "unverified"}</span>
                </div>
                <p style={{ margin: "8px 0", color: "#ddd" }}>
                  {report.area || report.location_label || "Unknown area"}, {report.city || "Unknown city"}
                </p>
                <p style={{ margin: "8px 0", color: "#aaa", fontSize: 14 }}>
                  {report.incident_date || "No date"} · {report.amount || "Unknown amount"}
                </p>
                {toNumber(report.lat) !== null && toNumber(report.lng) !== null && (
                  <MapPreview lat={report.lat} lng={report.lng} title={`Map for report ${report.id}`} />
                )}
                {report.suspect_description && (
                  <p style={{ margin: "10px 0", color: "#ddd", lineHeight: 1.5 }}>
                    <strong>Suspect / pattern:</strong> {report.suspect_description}
                  </p>
                )}
                {report.description && <p style={{ color: "#ccc", lineHeight: 1.5 }}>{report.description}</p>}
                {report.photo_url && (
                  <img src={report.photo_url} alt="Uploaded evidence for scam report" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14, marginTop: 12, border: "1px solid #333" }} />
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
