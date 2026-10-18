import { useCallback, useEffect, useState } from 'react';
import { getUnit, type GameId } from '@/data/units';

// Hash routes: #/ (home), #/unit/<unitId> (unit screen), #/unit/<unitId>/<gameId> (game dialog).
export interface Route {
  unitId: string | null;
  gameId: GameId | null;
}

const HOME: Route = { unitId: null, gameId: null };

/** Parses a hash; null if it names a unit or game that doesn't exist. */
export function parseHash(hash: string): Route | null {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return HOME;
  if (parts[0] !== 'unit' || parts.length > 3) return null;
  const unit = getUnit(decodeURIComponent(parts[1] ?? ''));
  if (!unit) return null;
  if (parts.length === 2) return { unitId: unit.id, gameId: null };
  const game = unit.games.find((g) => g.id === decodeURIComponent(parts[2]!));
  return game ? { unitId: unit.id, gameId: game.id } : null;
}

export function hashFor({ unitId, gameId }: Route): string {
  if (!unitId) return '#/';
  return gameId ? `#/unit/${unitId}/${gameId}` : `#/unit/${unitId}`;
}

// Entries the app pushed itself are marked, so "close" can step back through history (keeping
// browser back and iPad swipe-back in sync) instead of stacking up new entries.
const IN_APP = { inApp: true };
const pushedByApp = () => (history.state as typeof IN_APP | null)?.inApp === true;

function current(): Route {
  const route = parseHash(location.hash);
  if (route) {
    if (!location.hash) history.replaceState(history.state, '', '#/'); // bare "/" is home too
    return route;
  }
  history.replaceState(null, '', '#/'); // unknown unit or game
  return HOME;
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(current);

  useEffect(() => {
    const sync = () => setRoute(current());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const go = useCallback((next: Route) => {
    history.pushState(IN_APP, '', hashFor(next));
    setRoute(next);
  }, []);

  /** Back to `parent`: a real history step if the app got here itself, else a replace (deep link). */
  const leave = useCallback((parent: Route) => {
    if (pushedByApp()) {
      history.back();
    } else {
      history.replaceState(null, '', hashFor(parent));
      setRoute(parent);
    }
  }, []);

  return { route, go, leave };
}
