"use client";

import { useState } from "react";

const inputStyle = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #444",
  background: "#181818",
  color: "white",
};

export default function Home() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitReport(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setStatus("");

    const form = new FormData(formElement);
    const payload = {
      city: form.get("city") || "Unknown",
      area: form.get("area") || "Unknown area",
      scam_type: form.get("scam_type") || "Street exchange scam",
      amount: form.get("amount") || "Unknown",
      incident_date: form.get("incident_date") || new Date().toISOString().slice(0, 10),
      description: form.get("description") || "",
      status: "unverified",
    };

    try {
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

      <section style={{ marginTop: 40, maxWidth: 620, background: "#181818", padding: 24, borderRadius: 20, border: "1px solid #333" }}>
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
          <textarea name="description" placeholder="What happened?" rows={6} required style={inputStyle} />
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
    </main>
  );
}
