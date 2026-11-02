// Your social links. Put your real URLs here (or set the VITE_* variables in Render).
// Any link left empty is hidden.
const env = import.meta.env;

export const SOCIAL_LINKS = {
  discord: (env.VITE_DISCORD_URL as string | undefined) ?? 'https://discord.gg/',
  instagram: (env.VITE_INSTAGRAM_URL as string | undefined) ?? 'https://instagram.com/',
  tiktok: (env.VITE_TIKTOK_URL as string | undefined) ?? 'https://tiktok.com/',
  youtube: (env.VITE_YOUTUBE_URL as string | undefined) ?? 'https://youtube.com/',
};
