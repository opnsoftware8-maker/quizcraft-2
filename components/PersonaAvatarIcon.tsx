"use client";

import React from "react";
import Image from "next/image";

interface PersonaAvatarProps {
  profileImage?: string;
  alt?: string;
  sizeClass?: string;
}

export function PersonaAvatar({
  profileImage,
  alt = "Persona profile",
  sizeClass = "w-8 h-8",
}: PersonaAvatarProps) {
  if (profileImage) {
    return (
      <span
        className={`${sizeClass} rounded-full bg-white border border-[#DFDDD6] overflow-hidden inline-flex items-center justify-center shrink-0`}
      >
        <Image
          src={profileImage}
          alt={alt}
          width={96}
          height={96}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} rounded-full bg-white border border-[#DFDDD6] inline-flex items-center justify-center shrink-0`}
    />
  );
}
