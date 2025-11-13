'use client';
import dynamic from "next/dynamic";
import CurriculmTree from "./components/CurriculumTree";

// Since client components get prerenderd on server as well hence importing
// the excalidraw stuff dynamically with ssr false



export default function Page() {
  return (
    <CurriculmTree />
  );
}