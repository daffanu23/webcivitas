// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import db from '@astrojs/db';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // <--- TAMBAHKAN BARIS INI
  output: 'server',
  adapter: vercel(),
  integrations: [db(), react()],
});