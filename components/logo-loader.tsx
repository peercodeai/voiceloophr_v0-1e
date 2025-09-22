"use client"

import Image from "next/image"

interface LogoLoaderProps {
  size?: "sm" | "md" | "lg"
  text?: string
}

export function LogoLoader({ size = "md", text = "Processing..." }: LogoLoaderProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  }

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`${sizeClasses[size]} animate-pulse`}>
        <Image
          src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
          alt="VoiceLoop"
          width={size === "sm" ? 32 : size === "md" ? 48 : 64}
          height={size === "sm" ? 32 : size === "md" ? 48 : 64}
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
