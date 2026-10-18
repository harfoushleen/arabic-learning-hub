// TEMPORARY dev-only page (/dev/joining): each completed Game 3 word rendered from joinedSegments()
// (ب colored, split across spans) next to the plain target string. They must look identical
// apart from the color. The first column is the unfilled worksheet view (dashes beside the blank).
// Delete once checked on a real iPad.
import { units } from '@/data/units';
import { joinedSegments, worksheetSegments } from '@/lib/arabicJoining';

export default function JoiningCheck() {
  const items = units.flatMap((u) => u.letterForms);
  return (
    <div className="p-6">
      <table className="border-separate border-spacing-x-8 border-spacing-y-2">
        <thead>
          <tr className="font-sans text-sm" dir="ltr">
            <th>id</th>
            <th>worksheet (unfilled)</th>
            <th>joinedSegments (spans + ZWJ)</th>
            <th>target (one text node)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const filled = item.parts.map((p) => (p.type === 'blank' ? p.fill : null));
            return (
              <tr key={item.id}>
                <td className="font-sans text-sm" dir="ltr">
                  {item.id}
                </td>
                <td className="whitespace-nowrap text-vowelled text-[72px]">
                  {worksheetSegments(item.parts).map((seg) =>
                    seg.isBlank ? (
                      <span
                        key={seg.key}
                        className="mx-1 inline-block h-[90px] w-[64px] rounded-2xl border-[3px] border-dashed border-amber-400 align-middle"
                      />
                    ) : (
                      <span key={seg.key}>{seg.text}</span>
                    ),
                  )}
                </td>
                <td className="text-vowelled text-[72px]" data-joined={item.id}>
                  {joinedSegments(item.parts, filled).map((seg) => (
                    <span key={seg.key} className={seg.isBlank ? 'text-pink-400' : undefined}>
                      {seg.text}
                    </span>
                  ))}
                </td>
                <td className="text-vowelled text-[72px]">{item.target}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
