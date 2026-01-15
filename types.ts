
export interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'tampered';
  ip: string;
  port?: number;
  rtspPath?: string;
  lastMotion: number | null; // Timestamp
  isWebcam?: boolean; // To distinguish the real local camera
}

export type UserRole = 'ADMIN' | 'VIEWER' | 'AUDITOR';

export interface User {
  username: string;
  role: UserRole;
  deviceId: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'AUTH' | 'MOTION' | 'WIFI' | 'SYSTEM' | 'EXPORT' | 'STORAGE' | 'CONFIG' | 'EVIDENCE_SNAPSHOT' | 'EVIDENCE_SIMULATION' | 'VIDEO_CLIP' | 'LOCK_EVIDENCE' | 'SHARE_LINK' | 'TOMBSTONE' | 'SCAN_NETWORK';
  description: string;
  severity: 'info' | 'warning' | 'critical';
  hash: string; // Integrity hash
  metadata?: Record<string, string | number | boolean>;
  data?: string; // Base64 for images/videos
  cameraId?: string;
  location?: string; // Added for export requirements
}

export interface WifiSignal {
  timestamp: number;
  rssi: number;
  deviceId: string;
  correlatedCameraId?: string;
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  EXPORT = 'EXPORT',
  SETTINGS = 'SETTINGS',
  STORAGE = 'STORAGE',
  SCANNER = 'SCANNER'
}

export interface Session {
  token: string;
  deviceId: string;
  startTime: number;
  expiresAt: number;
}

export interface SystemResources {
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  activeThreads: number;
}

export interface StorageBlock {
  index: number;
  previousHash: string;
  timestamp: number;
  dataHash: string;
  signature: string;
}

export interface SystemSettings {
  // Feed Settings
  showOverlays: boolean;
  showMotionRects: boolean;
  overlayOpacity: number; // 0.1 to 1.0
  privacyMaskEnabled: boolean;
  motionThreshold: number; // Pixel difference threshold (Lower = More Sensitive)
  
  // Storage Settings
  retentionDays: number;
  maxStorageGB: number;
  encryptionEnabled: boolean;
  
  // Alerts
  motionAlerts: boolean;
  wifiAlerts: boolean;
  
  // Legal / Consent
  legalConsentAccepted: boolean;
  disclaimerVersion: string;
}
