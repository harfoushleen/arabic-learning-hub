import { useEffect, useState } from 'react';

/** Re-renders once the game font is loaded, so text measurements use real metrics. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = document.fonts;
    if (!fonts) return;
    Promise.all([fonts.load('700 32px "Noto Naskh Arabic"', 'بَ'), fonts.ready])
      .catch(() => undefined)
      .then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
