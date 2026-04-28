"use client";

import { useEffect, useMemo, useState } from "react";

const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };

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

function distance(a, b) {
  return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
}

function clusterReports(reports) {
  const clusters = [];
  const THRESHOLD = 0.0005;

  for (const r of reports) {
    if (!r.lat || !r.lng) continue;

    let added = false;

    for (const c of clusters) {
      if (distance(r, c.center) < THRESHOLD) {
        c.reports.push(r);
        c.center.lat = (c.center.lat + r.lat) / 2;
        c.center.lng = (c.center.lng + r.lng) / 2;
        added = true;
        break;
      }
    }

    if (!added) {
      clusters.push({ center: { lat: r.lat, lng: r.lng }, reports: [r] });
    }
  }

  return clusters;
}

function MapPreview({ lat, lng }) {
  const delta = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <iframe src={src} style={{ width: "100%", height: 200, border: 0 }} />;
}

export default function Home() {
  const [reports, setReports] = useState([]);

  async function loadReports() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reports?select=*`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    });
    const data = await res.json();
    setReports(data);
  }

  useEffect(() => {
    loadReports();
  }, []);

  const clusters = clusterReports(reports);

  return (
    <main style={{ padding: 40, background: "#111", color: "white" }}>
      <h1>Scammer Safari</h1>
      <p>
        Inspired by Janek Rubeš & Honza Mikulka – {" "}
        <a href="https://www.youtube.com/@HONESTGUIDE" target="_blank" style={{ color: "#fbbf24" }}>
          Honest Guide
        </a>
      </p>

      <h2>Detected scam zones</h2>

      {clusters.map((c, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <MapPreview lat={c.center.lat} lng={c.center.lng} />
          <p style={{ color: "#fbbf24" }}>{c.reports.length} reports</p>
        </div>
      ))}
    </main>
  );
}
