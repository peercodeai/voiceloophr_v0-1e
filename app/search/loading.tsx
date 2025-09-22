import { SophisticatedLoader } from "@/components/sophisticated-loader"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SophisticatedLoader size="lg" text="Loading search..." />
    </div>
  )
}
