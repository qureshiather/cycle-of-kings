/** Shown in the Kingdom tab header as `{name}'s Town`. */
export const KINGDOM_HEADER_SUFFIX = "'s Town";

/** Fits the Kingdom header beside the map button and season pill. */
export const MIN_RULER_NAME_LENGTH = 2;
export const MAX_RULER_NAME_LENGTH = 14;

export function formatKingdomHeaderTitle(playerName: string | null): string {
  if (!playerName) return "Your Town";
  return `${playerName}${KINGDOM_HEADER_SUFFIX}`;
}
