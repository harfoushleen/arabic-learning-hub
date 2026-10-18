export interface GameProps {
  unitId: string;
  onExit?: () => void;
  /** A game's own sub-route (Game 3: the chosen letter set), from #/unit/<id>/<game>/<subId>. */
  subId?: string | null;
  /** Go to a sub-route (pushes history), or back out of it with null. */
  onSub?: (subId: string | null) => void;
}
