import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const SERVER_PORT = Number(process.env.SERVER_PORT ?? 3001);

/** With AdSense on, add the tag Google looks for to confirm the site is yours when you apply. */
function adsenseMeta(client: string): Plugin {
  return {
    name: 'adsense-meta',
    transformIndexHtml: (html) =>
      /^ca-pub-\d+$/.test(client) ? html.replace('</head>', `  <meta name="google-adsense-account" content="${client}" />\n  </head>`) : html,
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), adsenseMeta(loadEnv(mode, process.cwd(), 'VITE_').VITE_ADSENSE_CLIENT?.trim() ?? '')],
  server: {
    port: 5173,
    host: true,
    // Socket.io traffic goes to the game server, so the client can always use its own origin.
    proxy: {
      '/socket.io': { target: `http://localhost:${SERVER_PORT}`, ws: true },
      '/api': { target: `http://localhost:${SERVER_PORT}` },
    },
  },
}));
