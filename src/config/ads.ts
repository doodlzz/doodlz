// Ads. Off unless VITE_ADS is set at build time (Render env vars):
//   VITE_ADS=preview   grey boxes at the real sizes, to see where ads go. Loads nothing from Google.
//   VITE_ADS=adsense   real Google AdSense ads. Also needs VITE_ADSENSE_CLIENT (ca-pub-…) and a slot id
//                      per placement (VITE_ADSENSE_SLOT_HOME / _SIDE / _ROOM / _GAME / _GAMEOVER); a placement without one stays empty.
// During a game there is only one, a still square under the scores, away from the canvas and the chat.
const env = import.meta.env;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export type AdPlacement = 'home' | 'side' | 'room' | 'game' | 'gameover' | 'gameoverSide' | 'gameoverLeft';

const mode = str(env.VITE_ADS).toLowerCase();
const client = str(env.VITE_ADSENSE_CLIENT);

export const ADS = {
  mode: mode === 'adsense' && client ? ('adsense' as const) : mode === 'preview' ? ('preview' as const) : ('off' as const),
  client,
  slots: {
    home: str(env.VITE_ADSENSE_SLOT_HOME),
    /** Tall ad in the empty space right of the home screen, on wide screens only. */
    side: str(env.VITE_ADSENSE_SLOT_SIDE),
    room: str(env.VITE_ADSENSE_SLOT_ROOM),
    /** Square under the scores while playing, on wide screens only. */
    game: str(env.VITE_ADSENSE_SLOT_GAME),
    gameover: str(env.VITE_ADSENSE_SLOT_GAMEOVER),
    /** Tall ads either side of the podium: the same ad unit as the home screen's side ad. */
    gameoverSide: str(env.VITE_ADSENSE_SLOT_SIDE),
    gameoverLeft: str(env.VITE_ADSENSE_SLOT_SIDE),
  } satisfies Record<AdPlacement, string>,
};

/** Real ads from Google are on: the cookie notice and policies have to say so. */
export const ADS_LIVE = ADS.mode === 'adsense';
