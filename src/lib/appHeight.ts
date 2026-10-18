// Publishes the real visible height as --app-h. iOS Safari sizes 100vh against the viewport
// with its bars hidden, so anything sized with vh is taller than what a child can see.

export function installAppHeight(): void {
  const root = document.documentElement;
  const update = () => {
    const vv = window.visualViewport;
    // Undo pinch-zoom so an accidental zoom doesn't shrink the game.
    const h = vv ? vv.height * vv.scale : window.innerHeight;
    root.style.setProperty('--app-h', `${Math.round(h)}px`);
  };
  update();
  window.visualViewport?.addEventListener('resize', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => {
    update();
    // iOS reports the old size during the rotation event itself.
    window.setTimeout(update, 300);
  });
}
