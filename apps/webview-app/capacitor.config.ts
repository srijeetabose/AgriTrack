import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agritrack.app',
  appName: 'AgriTrack',
  webDir: 'www',
  server: {
    // This will load your hosted web app
    url: 'https://your-web-app-url.vercel.app',
    cleartext: true
  }
};

export default config;
