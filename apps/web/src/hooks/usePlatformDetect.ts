import { useState, useEffect } from 'react';

export type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

export function usePlatformDetect(): Platform {
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid || window.innerWidth < 768;

    let detectedPlatform: Platform = 'unknown';
    if (isIOS) {
      detectedPlatform = 'ios';
    } else if (isAndroid) {
      detectedPlatform = 'android';
    } else if (!isMobile) {
      detectedPlatform = 'desktop';
    }

    // Only update if changed to prevent unnecessary re-renders
    setPlatform(prev => prev !== detectedPlatform ? detectedPlatform : prev);
  }, []);

  return platform;
}

export function useIsMobile(): boolean {
  const platform = usePlatformDetect();
  return platform === 'ios' || platform === 'android';
}

export function useIsIOS(): boolean {
  const platform = usePlatformDetect();
  return platform === 'ios';
}

export function useIsAndroid(): boolean {
  const platform = usePlatformDetect();
  return platform === 'android';
}

export function useIsDesktop(): boolean {
  const platform = usePlatformDetect();
  return platform === 'desktop';
}
