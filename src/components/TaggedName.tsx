import type { NameFxId } from '../../shared/cosmetics';
import { splitTag } from '../../shared/tag';

interface Props {
  name: string;
  tag?: string | null;
  className?: string;
  /** Put the tag on its own line (for narrow cards). */
  stacked?: boolean;
  /** Bought name effect. */
  fx?: NameFxId;
}

/** Shows "name#1234" with the tag a little faded, Discord-style. */
export default function TaggedName({ name, tag, className = '', stacked = false, fx }: Props) {
  const parts = tag === undefined ? splitTag(name) : { name, tag };
  if (fx) className = `${className} fx-anim name-fx name-${fx}`;
  if (stacked) {
    return (
      <span className={`flex min-w-0 flex-col items-center leading-tight ${className}`}>
        <span className="w-full truncate">{parts.name}</span>
        {parts.tag && <span className="text-xs font-semibold opacity-50">#{parts.tag}</span>}
      </span>
    );
  }
  return (
    <span className={className}>
      {parts.name}
      {parts.tag && <span className="font-semibold opacity-50">#{parts.tag}</span>}
    </span>
  );
}
