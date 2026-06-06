import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5175, open: true },
  /** Share baked atlas with phaser-demo — run `npm run assets:placeholder` there first. */
  publicDir: '../phaser-demo/public',
});
