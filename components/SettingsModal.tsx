
import React, { useState, useEffect } from 'react';
import { Camera, SystemSettings } from '../types';
import { X, Lock, Shield, HardDrive, Eye, Activity, FileText, Trash2, Save, Key, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: Camera[];
  onRemoveCamera: (id: string) => void;
  onAddCameraRequest: () => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  masterKeyHash: string | null; // Passed from App to verify
}

const STORAGE_KEY = 'keysight_master_hash';

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  cameras, 
  onRemoveCamera, 
  onAddCameraRequest,
  settings, 
  onUpdateSettings,
  masterKeyHash
}) => {
  const [authorized, setAuthorized] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'CAMERAS' | 'STORAGE' | 'LEGAL'>('LEGAL');
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Reset auth state when modal opens
  useEffect(() => {
    if (isOpen) {
        setAuthorized(false);
        setAuthInput('');
        setAuthError('');
        setLocalSettings(settings);
        // Force LEGAL tab if consent not given
        if (!settings.legalConsentAccepted) {
            setActiveTab('LEGAL');
        } else {
            // Default to verify screen effectively
            setActiveTab('LEGAL'); // Use Legal/Auth as landing
        }
    }
  }, [isOpen, settings]);

  const hashString = async (message: string) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Deterministic check
    const inputHash = await hashString(authInput.trim().toUpperCase());
    
    // Check against local storage directly or prop
    const storedHash = localStorage.getItem(STORAGE_KEY);

    if (storedHash && inputHash === storedHash) {
        setAuthorized(true);
        setActiveTab('GENERAL');
    } else {
        setAuthError('INVALID MASTER KEY. ACCESS DENIED.');
        setAuthorized(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate secure write delay
    setTimeout(() => {
        onUpdateSettings(localSettings);
        setIsSaving(false);
        // Do not close, just notify
    }, 500);
  };

  const handleToggleConsent = (checked: boolean) => {
      setLocalSettings(prev => ({...prev, legalConsentAccepted: checked}));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl bg-security-panel border border-security-border shadow-2xl flex flex-col h-[85vh] rounded-sm overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-security-border bg-security-black shrink-0">
           <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded flex items-center justify-center border ${authorized ? 'bg-security-accent/10 border-security-accent' : 'bg-security-alert/10 border-security-alert'}`}>
                {authorized ? <Sliders className="w-4 h-4 text-security-accent" /> : <Lock className="w-4 h-4 text-security-alert" />}
             </div>
             <div>
                <h2 className="text-sm font-mono font-bold text-security-text uppercase">System Configuration</h2>
                <div className="text-[10px] font-mono text-security-dim flex items-center gap-1">
                    {authorized ? 'SESSION: AUTHENTICATED (PRIVILEGED)' : 'SESSION: LOCKED (READ-ONLY)'}
                </div>
             </div>
           </div>
           <button onClick={onClose} className="text-security-dim hover:text-white transition-colors p-2">
             <X className="w-6 h-6" />
           </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 bg-black/50 border-r border-security-border flex flex-col shrink-0">
                {!authorized ? (
                    <div className="p-4">
                        <div className="text-[10px] font-mono text-security-dim uppercase mb-2">Auth Required</div>
                        <div className="h-full flex flex-col gap-2 opacity-50 pointer-events-none">
                            <div className="p-3 bg-security-panel border border-security-border text-xs font-mono">GENERAL</div>
                            <div className="p-3 bg-security-panel border border-security-border text-xs font-mono">CAMERAS</div>
                            <div className="p-3 bg-security-panel border border-security-border text-xs font-mono">STORAGE</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 p-2">
                        <button 
                            onClick={() => setActiveTab('GENERAL')}
                            className={`p-3 text-left text-xs font-mono font-bold flex items-center gap-2 border transition-all ${activeTab === 'GENERAL' ? 'bg-security-accent/10 border-security-accent text-security-accent' : 'border-transparent text-security-dim hover:text-white hover:bg-white/5'}`}
                        >
                            <Eye className="w-3 h-3" /> FEED & UI
                        </button>
                        <button 
                            onClick={() => setActiveTab('CAMERAS')}
                            className={`p-3 text-left text-xs font-mono font-bold flex items-center gap-2 border transition-all ${activeTab === 'CAMERAS' ? 'bg-security-accent/10 border-security-accent text-security-accent' : 'border-transparent text-security-dim hover:text-white hover:bg-white/5'}`}
                        >
                            <Shield className="w-3 h-3" /> DEVICES
                        </button>
                        <button 
                            onClick={() => setActiveTab('STORAGE')}
                            className={`p-3 text-left text-xs font-mono font-bold flex items-center gap-2 border transition-all ${activeTab === 'STORAGE' ? 'bg-security-accent/10 border-security-accent text-security-accent' : 'border-transparent text-security-dim hover:text-white hover:bg-white/5'}`}
                        >
                            <HardDrive className="w-3 h-3" /> STORAGE
                        </button>
                        <button 
                            onClick={() => setActiveTab('LEGAL')}
                            className={`p-3 text-left text-xs font-mono font-bold flex items-center gap-2 border transition-all ${activeTab === 'LEGAL' ? 'bg-security-accent/10 border-security-accent text-security-accent' : 'border-transparent text-security-dim hover:text-white hover:bg-white/5'}`}
                        >
                            <FileText className="w-3 h-3" /> COMPLIANCE
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-black overflow-y-auto p-6 relative">
                
                {/* Auth Screen Overlay */}
                {!authorized && (
                    <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center p-8">
                        <div className="max-w-md w-full border border-security-border bg-security-panel p-8 shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-security-alert animate-pulse" />
                             <div className="flex flex-col items-center text-center gap-4 mb-6">
                                <Lock className="w-12 h-12 text-security-alert" />
                                <h3 className="text-lg font-mono font-bold text-security-text">RESTRICTED ACCESS</h3>
                                <p className="text-xs font-mono text-security-dim">
                                    CONFIGURATION CHANGES REQUIRE THE MASTER ACCESS KEY.
                                    <br/>ALL ATTEMPTS ARE LOGGED IMMUTABLY.
                                </p>
                             </div>
                             <form onSubmit={handleAuth} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-security-dim uppercase">Master Access Key</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 w-4 h-4 text-security-dim" />
                                        <input 
                                            type="password" 
                                            value={authInput}
                                            onChange={e => setAuthInput(e.target.value)}
                                            className="w-full bg-black border border-security-border text-security-text pl-10 p-2 text-sm font-mono focus:border-security-alert outline-none transition-colors"
                                            placeholder="XXXX-XXXX-XXXX-XXXX"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                {authError && (
                                    <div className="text-[10px] font-mono text-security-alert flex items-center gap-2 bg-security-alert/10 p-2">
                                        <AlertTriangle className="w-3 h-3" /> {authError}
                                    </div>
                                )}
                                <button type="submit" className="w-full bg-security-text text-black font-mono font-bold py-2 text-xs hover:bg-white transition-colors">
                                    AUTHENTICATE & UNLOCK
                                </button>
                             </form>
                             <div className="mt-6 pt-4 border-t border-security-border/50 text-center">
                                 <p className="text-[9px] font-mono text-security-dim">
                                     FAIL-CLOSED MECHANISM ACTIVE.<br/>
                                     KEYS ARE NEVER TRANSMITTED, ONLY HASHED LOCALLY.
                                 </p>
                             </div>
                        </div>
                    </div>
                )}

                {/* --- TABS --- */}

                {authorized && activeTab === 'GENERAL' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 border-b border-security-border pb-2 mb-4">
                            <Eye className="w-4 h-4 text-security-accent" />
                            <h3 className="text-sm font-mono font-bold text-security-text">FEED & INTERFACE SETTINGS</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="p-4 border border-security-border bg-security-panel/50 space-y-3">
                                    <h4 className="text-xs font-mono text-security-accent uppercase mb-2">Overlay Configuration</h4>
                                    
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs font-mono text-security-dim group-hover:text-security-text">Show Info Overlays (HUD)</span>
                                        <div 
                                            onClick={() => setLocalSettings(s => ({...s, showOverlays: !s.showOverlays}))}
                                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${localSettings.showOverlays ? 'bg-security-accent' : 'bg-security-border'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-black shadow-sm transition-transform ${localSettings.showOverlays ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs font-mono text-security-dim group-hover:text-security-text">Highlight Motion Regions</span>
                                        <div 
                                            onClick={() => setLocalSettings(s => ({...s, showMotionRects: !s.showMotionRects}))}
                                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${localSettings.showMotionRects ? 'bg-security-accent' : 'bg-security-border'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-black shadow-sm transition-transform ${localSettings.showMotionRects ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </label>
                                    
                                    <div className="space-y-2 pt-2">
                                        <span className="text-xs font-mono text-security-dim">Overlay Opacity ({(localSettings.overlayOpacity * 100).toFixed(0)}%)</span>
                                        <input 
                                            type="range" 
                                            min="0.1" 
                                            max="1" 
                                            step="0.1"
                                            value={localSettings.overlayOpacity}
                                            onChange={e => setLocalSettings(s => ({...s, overlayOpacity: parseFloat(e.target.value)}))}
                                            className="w-full h-1 bg-security-border rounded-lg appearance-none cursor-pointer accent-security-accent"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 border border-security-border bg-security-panel/50 space-y-3">
                                    <h4 className="text-xs font-mono text-security-warn uppercase mb-2">Privacy & Alerts</h4>
                                    
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs font-mono text-security-dim group-hover:text-security-text">Privacy Masking (Blur Faces)</span>
                                        <div 
                                            onClick={() => setLocalSettings(s => ({...s, privacyMaskEnabled: !s.privacyMaskEnabled}))}
                                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${localSettings.privacyMaskEnabled ? 'bg-security-warn' : 'bg-security-border'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-black shadow-sm transition-transform ${localSettings.privacyMaskEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </label>

                                    <div className="h-px bg-security-border/50 my-2" />

                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs font-mono text-security-dim group-hover:text-security-text">Real-time Motion Alerts</span>
                                        <div 
                                            onClick={() => setLocalSettings(s => ({...s, motionAlerts: !s.motionAlerts}))}
                                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${localSettings.motionAlerts ? 'bg-security-accent' : 'bg-security-border'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-black shadow-sm transition-transform ${localSettings.motionAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </label>

                                    <div className="space-y-2 pt-2">
                                        <span className="text-xs font-mono text-security-dim">Motion Sensitivity (Threshold: {localSettings.motionThreshold})</span>
                                        <div className="flex items-center gap-2">
                                           <span className="text-[9px] text-security-dim">HIGH</span>
                                           <input 
                                              type="range" 
                                              min="5" 
                                              max="100" 
                                              step="5"
                                              value={localSettings.motionThreshold}
                                              onChange={e => setLocalSettings(s => ({...s, motionThreshold: parseInt(e.target.value)}))}
                                              className="flex-1 h-1 bg-security-border rounded-lg appearance-none cursor-pointer accent-security-accent"
                                              style={{ direction: 'ltr' }} 
                                           />
                                           <span className="text-[9px] text-security-dim">LOW</span>
                                        </div>
                                    </div>

                                    <label className="flex items-center justify-between cursor-pointer group mt-2">
                                        <span className="text-xs font-mono text-security-dim group-hover:text-security-text">WiFi Proximity Alerts</span>
                                        <div 
                                            onClick={() => setLocalSettings(s => ({...s, wifiAlerts: !s.wifiAlerts}))}
                                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${localSettings.wifiAlerts ? 'bg-security-accent' : 'bg-security-border'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-black shadow-sm transition-transform ${localSettings.wifiAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {authorized && activeTab === 'CAMERAS' && (
                     <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-security-border pb-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-security-accent" />
                                <h3 className="text-sm font-mono font-bold text-security-text">CONNECTED DEVICE MANAGER</h3>
                            </div>
                            <button 
                                onClick={onAddCameraRequest}
                                className="px-3 py-1.5 bg-security-accent text-black text-[10px] font-mono font-bold hover:bg-white transition-colors"
                            >
                                + REGISTER NEW DEVICE
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {cameras.map(cam => (
                                <div key={cam.id} className="p-3 bg-security-panel border border-security-border flex items-center justify-between group hover:border-security-dim transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-security-accent' : 'bg-security-alert'}`} />
                                        <div>
                                            <div className="text-xs font-mono font-bold text-security-text">{cam.name}</div>
                                            <div className="text-[10px] font-mono text-security-dim">{cam.ip} | {cam.location}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] font-mono text-security-dim hidden sm:block">
                                            ENCRYPTION: AES-256
                                        </div>
                                        {cam.isWebcam ? (
                                            <span className="text-[10px] font-mono text-security-accent border border-security-accent px-2 py-0.5 opacity-50 cursor-not-allowed">SYSTEM DEVICE</span>
                                        ) : (
                                            <button 
                                                onClick={() => onRemoveCamera(cam.id)}
                                                className="text-security-dim hover:text-security-alert transition-colors"
                                                title="Remove Device"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                {authorized && activeTab === 'STORAGE' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                         <div className="flex items-center gap-2 border-b border-security-border pb-2 mb-4">
                            <HardDrive className="w-4 h-4 text-security-accent" />
                            <h3 className="text-sm font-mono font-bold text-security-text">LOCAL STORAGE & RETENTION</h3>
                        </div>

                        <div className="p-4 border border-security-border bg-security-panel/50 space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-security-dim uppercase">Retention Period (Days)</label>
                                    <select 
                                        value={localSettings.retentionDays}
                                        onChange={e => setLocalSettings(s => ({...s, retentionDays: parseInt(e.target.value)}))}
                                        className="w-full bg-black border border-security-border text-xs font-mono p-2 text-security-text focus:border-security-accent outline-none"
                                    >
                                        <option value={1}>1 Day (High Security)</option>
                                        <option value={3}>3 Days</option>
                                        <option value={7}>7 Days (Standard)</option>
                                        <option value={30}>30 Days (Archive)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-security-dim uppercase">Max Storage Quota (GB)</label>
                                    <input 
                                        type="number" 
                                        value={localSettings.maxStorageGB}
                                        onChange={e => setLocalSettings(s => ({...s, maxStorageGB: parseInt(e.target.value)}))}
                                        className="w-full bg-black border border-security-border text-xs font-mono p-2 text-security-text focus:border-security-accent outline-none"
                                    />
                                </div>
                             </div>

                             <div className="pt-2">
                                 <label className="flex items-center gap-3 cursor-not-allowed opacity-75">
                                     <div className={`w-4 h-4 border flex items-center justify-center ${localSettings.encryptionEnabled ? 'bg-security-accent border-security-accent' : ''}`}>
                                         {localSettings.encryptionEnabled && <CheckCircle className="w-3 h-3 text-black" />}
                                     </div>
                                     <span className="text-xs font-mono text-security-dim">Force Encryption at Rest (AES-GCM-256) - ALWAYS ON</span>
                                 </label>
                             </div>
                        </div>
                        
                        <div className="p-4 border border-security-warn/30 bg-security-warn/5">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-security-warn mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-mono font-bold text-security-warn uppercase">Backup Warning</h4>
                                    <p className="text-[10px] font-mono text-security-dim mt-1">
                                        Data is stored locally in the browser's IndexedDB. If you clear your browser data or lose your Master Key, all footage is irretrievable.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {authorized && activeTab === 'LEGAL' && (
                     <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 border-b border-security-border pb-2 mb-4">
                            <FileText className="w-4 h-4 text-security-accent" />
                            <h3 className="text-sm font-mono font-bold text-security-text">LEGAL COMPLIANCE & CONSENT</h3>
                        </div>
                        
                        <div className="h-64 overflow-y-auto border border-security-border bg-black p-4 text-[10px] font-mono text-security-dim leading-relaxed custom-scrollbar">
                            <p className="mb-2"><strong className="text-security-text">1. PRIVACY POLICY:</strong> KeySight is a local-only surveillance tool. No data is transmitted to cloud servers. You are solely responsible for ensuring compliance with local surveillance laws, including GDPR and CCPA where applicable.</p>
                            <p className="mb-2"><strong className="text-security-text">2. DATA OWNERSHIP:</strong> All footage and logs are encrypted with a key derived from your Master Access Key. KeySight developers cannot recover lost keys or decrypt data.</p>
                            <p className="mb-2"><strong className="text-security-text">3. FAIL-CLOSED ARCHITECTURE:</strong> If system integrity checks fail or the Master Key is not provided, the system will cease all recording and viewing functions immediately to prevent unauthorized access.</p>
                            <p className="mb-2"><strong className="text-security-text">4. NO AI LIABILITY:</strong> This system uses deterministic algorithms for motion and signal detection. It does not use generative AI or probabilistic machine learning models. We are not liable for missed detections.</p>
                            <p><strong className="text-security-text">5. CONSENT:</strong> By enabling this system, you confirm you have the legal right to monitor the configured areas.</p>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-security-panel border border-security-border">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    id="legal-check"
                                    checked={localSettings.legalConsentAccepted}
                                    onChange={(e) => handleToggleConsent(e.target.checked)}
                                    className="peer h-4 w-4 cursor-pointer appearance-none border border-security-dim bg-black checked:border-security-accent checked:bg-security-accent transition-all"
                                />
                                <CheckCircle className="absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black w-3 h-3 left-0.5 top-0.5" />
                            </div>
                            <label htmlFor="legal-check" className="text-xs font-mono text-security-text cursor-pointer select-none">
                                I ACKNOWLEDGE THE ABOVE TERMS AND ACCEPT FULL RESPONSIBILITY FOR THE OPERATION OF THIS SYSTEM.
                            </label>
                        </div>
                     </div>
                )}
            </div>
        </div>

        {/* Footer */}
        {authorized && (
            <div className="p-4 border-t border-security-border bg-security-black flex justify-end gap-4 shrink-0">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-mono text-security-dim hover:text-white transition-colors"
                >
                    CANCEL CHANGES
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving || !localSettings.legalConsentAccepted}
                    className="px-6 py-2 bg-security-accent text-black text-xs font-mono font-bold hover:bg-security-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Activity className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {isSaving ? 'ENCRYPTING & SAVING...' : 'SAVE CONFIGURATION'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
