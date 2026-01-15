
import { Camera, SecurityEvent, SystemSettings } from './types';

export const APP_NAME = "KEYSIGHT";
export const VERSION = "1.0.0-RC1 (NO-AI)";

export const MOCK_CAMERAS: Camera[] = [
  { id: 'cam_01', name: 'Gate Entry Main', location: 'North Perimeter', status: 'online', ip: '192.168.1.101', lastMotion: null },
  { id: 'cam_02', name: 'Server Room', location: 'Interior Zone A', status: 'online', ip: '192.168.1.102', lastMotion: null },
  { id: 'cam_03', name: 'Loading Dock', location: 'South Perimeter', status: 'online', ip: '192.168.1.103', lastMotion: null },
  { id: 'cam_04', name: 'Archive Vault', location: 'Secure Zone B', status: 'offline', ip: '192.168.1.104', lastMotion: null },
];

export const INITIAL_LOGS: SecurityEvent[] = [
  { id: 'evt_init', timestamp: Date.now() - 100000, type: 'SYSTEM', description: 'System integrity check passed', severity: 'info', hash: '8a9f...3d21' },
  { id: 'evt_boot', timestamp: Date.now() - 95000, type: 'SYSTEM', description: 'Storage encryption keys loaded (Local)', severity: 'info', hash: '7b2c...9e11' },
];

// Deterministic thresholds
export const MOTION_THRESHOLD = 15; // Pixel difference percentage
export const WIFI_VARIANCE_THRESHOLD = 5; // RSSI variance
export const SESSION_TIMEOUT = 3600; // Seconds

export const DEFAULT_SETTINGS: SystemSettings = {
  showOverlays: true,
  showMotionRects: true,
  overlayOpacity: 0.8,
  privacyMaskEnabled: false,
  motionThreshold: 30,
  retentionDays: 7,
  maxStorageGB: 50,
  encryptionEnabled: true,
  motionAlerts: true,
  wifiAlerts: true,
  legalConsentAccepted: false,
  disclaimerVersion: "v1.0-STD"
};
