import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pixtech.pos',
  appName: 'PIX TECH POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow localhost for dev hot-reload (remove for production builds)
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6366f1',
    },
    Geolocation: {
      // Required for background location on Android
    },
  },
  android: {
    // Override colors to match app dark theme
    backgroundColor: '#0f172a',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set to true during development
  },
};

export default config;
