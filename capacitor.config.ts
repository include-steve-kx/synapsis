import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'studio.synapsis.camera',
  appName: 'Synapsis',
  webDir: 'dist',
  backgroundColor: '#0b0d0f',
  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    scheme: 'Synapsis',
  },
};

export default config;
