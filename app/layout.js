export const metadata = { title: "Scammer Safari" };

export default function RootLayout(props) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
