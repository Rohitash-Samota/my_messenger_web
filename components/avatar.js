"use client";

import Image from "next/image";
import { useState } from "react";

const palettes = {
  emerald: "from-emerald-300 via-teal-400 to-cyan-600",
  violet: "from-violet-300 via-fuchsia-400 to-indigo-600",
  amber: "from-amber-200 via-orange-400 to-rose-500",
  blue: "from-sky-300 via-blue-400 to-indigo-600",
  rose: "from-rose-300 via-pink-400 to-purple-600",
  lime: "from-lime-300 via-emerald-400 to-teal-600",
};

const imageSizes = {
  xs: "32px",
  sm: "40px",
  md: "48px",
  lg: "64px",
  xl: "96px",
};

function ProfileImage({ name, size, source }) {
  const [failed, setFailed] = useState(false);

  if (!source || failed) return null;

  return (
    <Image
      src={source}
      alt=""
      fill
      sizes={imageSizes[size] || imageSizes.md}
      unoptimized
      className="object-cover"
      onError={() => setFailed(true)}
      aria-hidden="true"
      title={`${name || "User"} profile photo`}
    />
  );
}

export default function Avatar({
  name,
  color = "emerald",
  size = "md",
  online = false,
  src = null,
  profilePhoto = null,
  className = "",
}) {
  const initials = (name || "User")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const sizes = {
    xs: "h-8 w-8 text-[10px]",
    sm: "h-10 w-10 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl",
  };
  const palette = palettes[color];
  const solidColor = !palette && typeof color === "string" ? color : null;
  const imageSource = src || profilePhoto;

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      role="img"
      aria-label={`${name || "User"} profile photo`}
    >
      <span
        className={`relative grid place-items-center overflow-hidden rounded-full ${
          palette ? `bg-gradient-to-br ${palette}` : ""
        } ${sizes[size] || sizes.md} font-extrabold tracking-tight text-white shadow-inner shadow-white/20`}
        style={solidColor ? { background: `linear-gradient(145deg, ${solidColor}, color-mix(in srgb, ${solidColor} 58%, #071116))` } : undefined}
      >
        {initials}
        {imageSource ? (
          <ProfileImage
            key={typeof imageSource === "string" ? imageSource : imageSource?.src}
            name={name}
            size={size}
            source={imageSource}
          />
        ) : null}
      </span>
      {online ? (
        <span
          className="absolute bottom-0 right-0 h-[27%] w-[27%] rounded-full border-2 border-[#101b21] bg-[#20d69f]"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
