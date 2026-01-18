

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
  
  // New Identity Fields
  manufacturer?: 'YI_HOME' | 'GENERIC_ONVIF' | 'GENERIC_RTSP' | 'CUSTOM';
  serialNumber?: string;
  macAddress?: string; // Simulated or Manual
  
  // Security Fields
  bindingToken?: string; // HMAC of Serial+IP signed by MasterKey
  fingerprintHash?: string; // SHA-256 of configuration
  boundAt?: number;
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
  type: 'AUTH' | 'MOTION' | 'WIFI' | 'SYSTEM' | 'EXPORT' | 'STORAGE' | 'CONFIG' | 'EVIDENCE_SNAPSHOT' | 'EVIDENCE_SIMULATION' | 'VIDEO_CLIP' | 'LOCK_EVIDENCE' | 'SHARE_LINK' | 'TOMBSTONE' | 'SCAN_NETWORK' | 'SECURITY_VIOLATION' | 'INCIDENT' | 'CONSENT_CHANGE';
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

export type ComplianceStandard = 'NONE' | 'SOC2_TYPE_1' | 'ISO_27001' | 'GDPR_CCPA_STRICT';
export type ConsentMode = 'ONE_PARTY' | 'ALL_PARTY';

export interface SystemSettings {
  // Feed Settings
  showOverlays: boolean;
  showMotionRects: boolean;
  overlayOpacity: number; // 0.1 to 1.0
  privacyMaskEnabled: boolean;
  motionThreshold: number; // Pixel difference threshold (Lower = More Sensitive)
  
  // Audio Settings
  audioRecordingEnabled: boolean;

  // Storage Settings
  retentionDays: number;
  maxStorageGB: number;
  encryptionEnabled: boolean;
  
  // Alerts
  motionAlerts: boolean;
  wifiAlerts: boolean;
  
  // Compliance & Governance
  legalConsentAccepted: boolean;
  disclaimerVersion: string;
  complianceStandard: ComplianceStandard;
  consentMode: ConsentMode;
  requireDualAuthForDelete: boolean;
  autoEvidenceLocking: boolean;
}

export interface TrustMetric {
    score: number; // 0-100
    integrity: 'VERIFIED' | 'COMPROMISED';
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
    lastAudit: number;
}
