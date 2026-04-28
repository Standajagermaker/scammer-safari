export default function Home() {
  return (
    <main style={{ fontFamily: "Arial", padding: "40px", background: "#111", color: "#fff", minHeight: "100vh" }}>
      
      <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
        Scammer Safari 🦁
      </h1>

      <p style={{ marginTop: "20px", fontSize: "18px", color: "#ccc" }}>
        Catch the scam. Do not chase the scammer.
      </p>

      <div style={{ marginTop: "40px" }}>
        <a href="#report">
          <button style={{ padding: "15px 25px", fontSize: "16px", background: "#fbbf24", border: "none", borderRadius: "10px", cursor: "pointer" }}>
            Report a scam
          </button>
        </a>
      </div>

      <section id="report" style={{ marginTop: "60px" }}>
        <h2>Report a scam</h2>

        <form style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "15px", maxWidth: "400px" }}>
          
          <input placeholder="City" style={{ padding: "10px" }} />
          
          <input placeholder="Location (e.g. Old Town Square)" style={{ padding: "10px" }} />
          
          <input placeholder="Amount lost" style={{ padding: "10px" }} />

          <textarea placeholder="What happened?" style={{ padding: "10px" }} />

          <button type="submit" style={{ padding: "12px", background: "#fbbf24", border: "none", borderRadius: "10px" }}>
            Submit report
          </button>
        </form>
      </section>

    </main>
  );
}
