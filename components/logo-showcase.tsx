"use client"

import Image from "next/image"
import { useMemo } from "react"

const logos = [
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/OpenAI-white-wordmark.svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/OpenAI-black-wordmark.svg",
    alt: "OpenAI"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/elevenlabs-logo-white.svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/elevenlabs-logo-black.svg",
    alt: "ElevenLabs"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/supabase-logo-wordmark--dark.svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/supabase-logo-wordmark--light.png",
    alt: "Supabase"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Calendar_icon_(2020).svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Calendar_icon_(2020).svg",
    alt: "Google Calendar"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Drive_icon_(2020)+(1).svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Drive_icon_(2020)+(1).svg",
    alt: "Google Drive"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/Outlook.com_icon_(2012-2019).svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/Outlook.com_icon_(2012-2019).svg",
    alt: "Outlook"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/LinkedIn_icon.svg.png",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/LinkedIn_icon.svg.png",
    alt: "LinkedIn"
  },
]

export default function LogoShowcase() {
  // Duplicate track to create a seamless marquee loop
  const track = useMemo(() => logos, [])

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-background via-muted/20 to-background py-12">
      <div className="absolute left-0 top-0 h-full w-48 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

      <div className="overflow-hidden">
        <div className="marquee flex items-center" aria-hidden="false">
          {/* Track A */}
          <div className="flex items-center gap-32 pr-32">
            {track.map((logo: any, index) => (
              <div key={`A-${logo.alt}-${index}`} className="px-2">
                <div className={`h-24 ${(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 'w-24' : 'w-36'} flex items-center justify-center rounded-md`}>
                  <div className="block dark:hidden">
                    <Image src={logo.lightSrc || logo.src} alt={logo.alt} width={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} height={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} className="h-full w-full object-contain drop-shadow-sm" sizes="84px" unoptimized />
                  </div>
                  <div className="hidden dark:block">
                    <Image src={logo.src} alt={logo.alt} width={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} height={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} className="h-full w-full object-contain drop-shadow-sm" sizes="84px" unoptimized />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Track B (duplicate) */}
          <div className="flex items-center gap-32 pr-32" aria-hidden="true">
            {track.map((logo: any, index) => (
              <div key={`B-${logo.alt}-${index}`} className="px-2">
                <div className={`h-24 ${(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 'w-24' : 'w-36'} flex items-center justify-center rounded-md`}>
                  <div className="block dark:hidden">
                    <Image src={logo.lightSrc || logo.src} alt={logo.alt} width={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} height={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} className="h-full w-full object-contain drop-shadow-sm" sizes="84px" unoptimized />
                  </div>
                  <div className="hidden dark:block">
                    <Image src={logo.src} alt={logo.alt} width={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} height={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook' || logo.alt === 'LinkedIn') ? 60 : 80} className="h-full w-full object-contain drop-shadow-sm" sizes="84px" unoptimized />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee { width: 200%; animation: marquee-scroll 40s linear infinite; }
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
