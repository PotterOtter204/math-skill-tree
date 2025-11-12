'use client';
import dynamic from "next/dynamic";

// Since client components get prerenderd on server as well hence importing
// the excalidraw stuff dynamically with ssr false

const KonvaWrapper = dynamic(
  async () => (await import("./components/konvaWrapper")).default,
  {
    ssr: false,
  },
);

export default function Page() {
  return (
    <KonvaWrapper />
  );
}