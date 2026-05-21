'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  const [iconError, setIconError] = useState(false);
  const [textError, setTextError] = useState(false);

  return (
    <Link href="/" className={`flex items-center gap-4 group transition-all duration-300 hover:scale-[1.05] ${className}`}>
      {/* Logo Icon - Speech Bubbles */}
      <div className="relative w-14 h-12 flex-shrink-0 flex items-center justify-center">
        {!iconError ? (
          <Image 
            src="/logo.png" 
            alt="GetCareerTruth Logo" 
            fill
            sizes="(max-width: 768px) 56px, 56px"
            className="object-contain drop-shadow-sm"
            priority
            onError={() => setIconError(true)}
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-white font-bold text-xl">
            G
          </div>
        )}
      </div>

      {/* Logo Text - GetCareerTruth Image */}
      {showText && (
        <div className="relative h-8 min-w-[120px] md:min-w-[160px] flex items-center">
          <Image
            src="/getcareertruth-text-image.png"
            alt="GetCareerTruth Text Logo"
            width={200}
            height={40}
            style={{ width: 'auto', height: 'auto' }}
            className="object-contain dark:invert-0 invert"
            priority
            onError={() => setTextError(true)}
          />
          {textError && (
            <span className="text-xl font-bold text-text-primary tracking-tight">
              GetCareer<span className="text-primary">Truth</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}