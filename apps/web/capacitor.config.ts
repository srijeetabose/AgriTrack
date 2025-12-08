import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agritrack.web',
  appName: 'AgriTrack',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
