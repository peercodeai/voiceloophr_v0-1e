"use client"

import dynamic from "next/dynamic"

const Analytics = dynamic(() => import("@vercel/analytics/next").then(mod => ({ default: mod.Analytics })), {
  ssr: false,
  loading: () => null
})

export default function AnalyticsWrapper() {
  return <Analytics />
}
