// Discord-style name tags: every player shows as "name#1234", so two people can share a name.

export const TAG_RE = /^\d{4}$/;

/** Random tag from 0001 to 9999. */
export function randomTag(): string {
  return String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
}

/** "sandro#0042" → { name: "sandro", tag: "0042" }; names without a tag come back with tag null. */
export function splitTag(full: string): { name: string; tag: string | null } {
  const m = /^(.*)#(\d{4})$/.exec(full);
  return m ? { name: m[1], tag: m[2] } : { name: full, tag: null };
}
