import "./globals.css";

export const metadata = {
  title: "Math Skill Tree",
  description: "Interactive math curriculum skill tree",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
