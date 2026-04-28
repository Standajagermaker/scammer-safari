"use client";

import { useEffect, useState } from "react";

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

export default function Home() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [feedStatus, setFeedStatus] = useState("Loading reports...");

  async function loadReports() {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reports?select=*&order=created_at.desc&limit=12`;
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
        area: form.get("area") || "Unknown area",
        scam_type: form.get("scam_type") || "Street exchange scam",
        amount: form.get("amount") || "Unknown",
        incident_date: form.get("incident_date") || new Date().toISOString().slice(0, 10),
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
            <input name="area" placeholder="Location, e.g. Old Town Square" required style={inputStyle} />
            <input name="amount" placeholder="Amount lost, e.g. EUR 200" style={inputStyle} />
            <input name="incident_date" type="date" style={inputStyle} />

            <textarea
              name="suspect_description"
              placeholder="Suspect description / nickname, e.g. blue jacket, grey hair, fake exchange guy near the clock"
              rows={4}
              style={inputStyle}
            />
            <p style={helpTextStyle}>
              Do not write insults or personal accusations. Describe visible details and repeat patterns only.
            </p>

            <textarea name="description" placeholder="What happened?" rows={6} required style={inputStyle} />

            <input name="photo" type="file" accept="image/*" style={inputStyle} />
            <p style={helpTextStyle}>
              Optional photo evidence. Public use should be blurred before publishing identifiable faces.
            </p>

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
            <h2 style={{ margin: 0 }}>Recent scam reports</h2>
            <button onClick={loadReports} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #444", background: "#222", color: "white", cursor: "pointer" }}>
              Refresh
            </button>
          </div>

          {feedStatus && <p style={{ color: "#aaa", lineHeight: 1.5 }}>{feedStatus}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {reports.map((report) => (
              <article key={report.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 16, background: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: "#fbbf24" }}>{report.scam_type || "Scam report"}</strong>
                  <span style={{ color: "#aaa", fontSize: 13 }}>{report.status || "unverified"}</span>
                </div>
                <p style={{ margin: "8px 0", color: "#ddd" }}>
                  {report.area || "Unknown area"}, {report.city || "Unknown city"}
                </p>
                <p style={{ margin: "8px 0", color: "#aaa", fontSize: 14 }}>
                  {report.incident_date || "No date"} · {report.amount || "Unknown amount"}
                </p>
                {report.suspect_description && (
                  <p style={{ margin: "10px 0", color: "#ddd", lineHeight: 1.5 }}>
                    <strong>Suspect / pattern:</strong> {report.suspect_description}
                  </p>
                )}
                {report.description && <p style={{ color: "#ccc", lineHeight: 1.5 }}>{report.description}</p>}
                {report.photo_url && (
                  <img
                    src={report.photo_url}
                    alt="Uploaded evidence for scam report"
                    style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14, marginTop: 12, border: "1px solid #333" }}
                  />
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
