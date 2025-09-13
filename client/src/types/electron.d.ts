export interface ElectronAPI {
  // Activation system
  checkActivationStatus: () => Promise<{
    isActivated: boolean;
    activationInfo: any;
    trialInfo: any;
  }>;
  activateLicense: (licenseKey: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  getActivationInfo: () => Promise<any>;
  deactivateLicense: () => Promise<{ success: boolean }>;
  
  // Trial system
  getTrialInfo: () => Promise<{
    isTrialActive: boolean;
    startDate: string;
    expiryDate: string;
    daysRemaining: number;
    expired: boolean;
  } | null>;
  startTrial: () => Promise<{
    success: boolean;
    error?: string;
    trialInfo?: any;
  }>;
  
  // App info
  getAppVersion: () => Promise<string>;
  
  // External links
  openExternal: (url: string) => Promise<void>;
  
  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  
  // App events
  onActivationRequired: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
  
  // Development tools
  isDev: () => boolean;
  openDevTools: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};