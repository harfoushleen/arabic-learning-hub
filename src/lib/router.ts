import { useCallback, useEffect, useState } from 'react';
import { gameHasContent, getUnit, type GameId } from '@/data/units';

// Hash routes: #/ (home), #/unit/<unitId> (unit screen), #/unit/<unitId>/<gameId> (game dialog),
// #/unit/<unitId>/<gameId>/<subId> (a game's own sub-screen: Game 3's chosen letter set).
export interface Route {
  unitId: string | null;
  gameId: GameId | null;
  subId?: string | null;
}

const HOME: Route = { unitId: null, gameId: null };

/** Parses a hash; null if it names a unit or game that doesn't exist, or a game that is still "coming soon". */
export function parseHash(hash: string): Route | null {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return HOME;
  if (parts[0] !== 'unit' || parts.length > 4) return null;
  const unit = getUnit(decodeURIComponent(parts[1] ?? ''));
  if (!unit) return null;
  if (parts.length === 2) return { unitId: unit.id, gameId: null };
  const game = unit.games.find((g) => g.id === decodeURIComponent(parts[2]!));
  if (!game || !gameHasContent(unit, game.id)) return null;
  if (parts.length === 3) return { unitId: unit.id, gameId: game.id };
  // Only Game 3 has sub-screens: one per letter set.
  const set = game.id === 'letter-forms' ? unit.letterForms.find((s) => s.id === decodeURIComponent(parts[3]!)) : undefined;
  return set ? { unitId: unit.id, gameId: game.id, subId: set.id } : null;
}

export function hashFor({ unitId, gameId, subId }: Route): string {
  if (!unitId) return '#/';
  if (!gameId) return `#/unit/${unitId}`;
  return subId ? `#/unit/${unitId}/${gameId}/${subId}` : `#/unit/${unitId}/${gameId}`;
}

// Entries the app pushed itself carry their depth (how many app pushes since the page was opened),
// so "close" can step back through history (keeping browser back and iPad swipe-back in sync)
// instead of stacking up new entries — even several steps, e.g. from a letter set to the unit.
interface AppState {
  inApp: true;
  depth: number;
}
const depth = () => ((history.state as AppState | null)?.inApp ? (history.state as AppState).depth : 0);

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
    const state: AppState = { inApp: true, depth: depth() + 1 };
    history.pushState(state, '', hashFor(next));
    setRoute(next);
  }, []);

  /**
   * Back to `parent`, `steps` levels up: real history steps if the app pushed that many entries
   * itself, else a replace (deep link).
   */
  const leave = useCallback((parent: Route, steps = 1) => {
    if (depth() >= steps) {
      history.go(-steps);
    } else {
      history.replaceState(null, '', hashFor(parent));
      setRoute(parent);
    }
  }, []);

  return { route, go, leave };
}
