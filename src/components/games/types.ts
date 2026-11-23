import type { GameId } from '@/data/units';

export interface GameProps {
  unitId: string;
  /** Which game entry is open (a game component shared by two entries, like the two fill-blanks, needs it). */
  gameId?: GameId;
  onExit?: () => void;
  /** A game's own sub-route (Game 3: the chosen letter set), from #/unit/<id>/<game>/<subId>. */
  subId?: string | null;
  /** Go to a sub-route (pushes history), or back out of it with null. */
  onSub?: (subId: string | null) => void;
}
