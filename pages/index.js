export default function Home() {
  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "40px",
        background: "#111",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "48px", fontWeight: "bold", margin: 0 }}>
        Scammer Safari 🦁
      </h1>

      <p style={{ marginTop: "20px", fontSize: "18px", color: "#ccc" }}>
        Catch the scam. Do not chase the scammer.
      </p>

      <div style={{ marginTop: "40px" }}>
        <a href="#report">
          <button
            style={{
              padding: "15px 25px",
              fontSize: "16px",
              background: "#fbbf24",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Report a scam
          </button>
        </a>
      </div>

      <section
        style={{
          marginTop: "60px",
          padding: "24px",
          border: "1px solid #333",
          borderRadius: "18px",
          maxWidth: "720px",
          background: "#181818",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Tourist safety map prototype</h2>
        <p style={{ color: "#ccc", lineHeight: 1.6 }}>
          This is the first public MVP for anonymous reports of street money-exchange scams,
          fake banknotes and other tourist scams. Reports should preserve evidence and help
          authorities identify repeated patterns.
        </p>
        <p style={{ color: "#fbbf24", fontWeight: "bold" }}>
          Safety rule: do not confront, follow or publicly identify anyone. Move to a safe place
          and contact local police.
        </p>
      </section>

      <section id="report" style={{ marginTop: "60px" }}>
        <h2>Report a scam anonymously</h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            alert("Prototype report received. Supabase saving is the next step.");
          }}
          style={{
            marginTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            maxWidth: "420px",
          }}
        >
          <input placeholder="City" style={{ padding: "12px", borderRadius: "8px" }} />
          <input
            placeholder="Location, e.g. Old Town Square"
            style={{ padding: "12px", borderRadius: "8px" }}
          />
          <input placeholder="Amount lost" style={{ padding: "12px", borderRadius: "8px" }} />
          <textarea
            placeholder="What happened?"
            rows={5}
            style={{ padding: "12px", borderRadius: "8px" }}
          />
          <button
            type="submit"
            style={{
              padding: "14px",
              background: "#fbbf24",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Submit report
          </button>
        </form>
      </section>
    </main>
  );
}
