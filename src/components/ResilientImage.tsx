import React, { useState } from 'react';
import { Wrench } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#eaedff] via-[#f2f3ff] to-[#dae2fd] text-[#1e40af] ${className}`}
      >
        <Wrench className="h-7 w-7 opacity-75" aria-hidden="true" />
        {fallbackLabel && (
          <span className="mt-2 px-3 text-center text-xs font-semibold text-[#131b2e]">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
};
