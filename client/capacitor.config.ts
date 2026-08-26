import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartbasket.app',
  appName: 'Smart Basket',
  webDir: 'dist',
  backgroundColor: '#14B8A6',
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#14B8A6',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#14B8A6',
    },
  },
};

export default config;
