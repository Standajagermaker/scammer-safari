export const metadata = { title: "Scammer Safari" };

export default function RootLayout(props) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
