'use client'
import * as React from 'react'
import dynamic from 'next/dynamic'

const Tldraw = dynamic(() => import('@tldraw/tldraw').then((mod) => mod.Tldraw), {
  ssr: false,
})

export default function OldTldrawApp() {
  return (
    <div style={{ position: 'fixed', inset: 0 }} suppressHydrationWarning>
      <Tldraw />
    </div>
  )
}
