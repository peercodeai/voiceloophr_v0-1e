"use client"

import Image from "next/image"

interface SophisticatedLoaderProps {
  size?: "sm" | "md" | "lg" | "xl"
  text?: string
  className?: string
}

export function SophisticatedLoader({ 
  size = "md", 
  text, 
  className = "" 
}: SophisticatedLoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12", 
    lg: "h-16 w-16",
    xl: "h-24 w-24"
  }

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  }

  const dimensions = {
    sm: 24,
    md: 48,
    lg: 64,
    xl: 96
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className={`${sizeClasses[size]} animate-pulse`}>
        <Image
          src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
          alt="VoiceLoop"
          width={dimensions[size]}
          height={dimensions[size]}
          className="h-full w-full object-contain"
        />
      </div>
      {text && (
        <p className={`text-muted-foreground font-light ${textSizes[size]}`}>
          {text}
        </p>
      )}
    </div>
  )
}


