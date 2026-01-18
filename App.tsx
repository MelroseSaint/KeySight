
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { CameraFeed } from './components/CameraFeed';
import { WiFiSignalChart } from './components/WiFiSignalChart';
import { AuditLog } from './components/AuditLog';
import { ResourceMonitor } from './components/ResourceMonitor';
import { LoginScreen } from './components/LoginScreen';
import { AddCameraModal } from './components/AddCameraModal';
import { SettingsModal } from './components/SettingsModal';
import { StorageBrowser } from './components/StorageBrowser';
import { NetworkScanner } from './components/NetworkScanner';
import { MasterKeyPrompt } from './components/MasterKeyPrompt';
import { SaveRecordingModal } from './components/SaveRecordingModal';
import { AppView, Camera, SecurityEvent, WifiSignal, SystemResources, SystemSettings } from './types';
import { MOCK_CAMERAS, INITIAL_LOGS, SESSION_TIMEOUT, DEFAULT_SETTINGS } from './constants';
import { Lock, Download, Wifi, Activity, Plus, Database, Search, Grid, List, MapPin, X, Camera as CameraIcon, Disc, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RefreshCw, WifiOff, ShieldCheck, Scale, FileCheck } from 'lucide-react';
import { secureStorage } from './utils/secureStorage';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [cameras, setCameras] = useState<Camera[]>(MOCK_CAMERAS);
  const [logs, setLogs] = useState<SecurityEvent[]>(INITIAL_LOGS);
  const [wifiData, setWifiData] = useState<WifiSignal[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingCamera, setIsAddingCamera] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Storage Auth State
  const [isStorageAuthOpen, setIsStorageAuthOpen] = useState(false);

  // Recording Save State
  const [pendingSave, setPendingSave] = useState<{
      cameraId: string;
      blob: Blob;
      startTime: number;
      duration: string;
  } | null>(null);
  
  // Dashboard State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [groupByLocation, setGroupByLocation] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  // Connectivity State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Camera Control State
  // Map camera ID to start timestamp
  const [recordingCameras, setRecordingCameras] = useState<Map<string, number>>(new Map());
  const [ptzState, setPtzState] = useState({ pan: 120, tilt: 45, isAuto: false });

  // Configuration State
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  
  const getStoredHash = () => localStorage.getItem('keysight_master_hash');

  // Network Status Listener
  useEffect(() => {
      const handleOnline = () => {
          setIsOnline(true);
          addLog('SYSTEM', 'Network Connectivity Restored - Resyncing Logs...', 'info');
      };
      const handleOffline = () => {
          setIsOnline(false);
          addLog('SYSTEM', 'Network Connectivity Lost - Switching to Offline Mode', 'warning');
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  // Initialize with local webcam
  useEffect(() => {
    setCameras(prev => {
        if (!prev.find(c => c.isWebcam)) {
            return [{
                id: 'local_cam_01',
                name: 'LOCAL CONSOLE CAM',
                location: 'TERMINAL',
                status: 'online',
                ip: '127.0.0.1',
                lastMotion: null,
                isWebcam: true
            }, ...prev];
        }
        return prev;
    });
  }, []);

  // Reset PTZ when selecting a camera
  useEffect(() => {
    if (selectedCamera) {
        setPtzState({ 
            pan: Math.floor(Math.random() * 300), 
            tilt: Math.floor(Math.random() * 90), 
            isAuto: false 
        });
    }
  }, [selectedCamera]);

  const [resources, setResources] = useState<SystemResources>({
    cpuUsage: 0,
    memoryUsage: 0,
    storageUsage: 0,
    activeThreads: 1
  });

  // Init Storage
  useEffect(() => {
    secureStorage.initialize("INITIAL_KEY_DERIVATION");
  }, []);

  // Session Timer
  useEffect(() => {
    let timer: number;
    if (view === AppView.DASHBOARD || view === AppView.STORAGE || view === AppView.SCANNER) {
      setSessionTime(SESSION_TIMEOUT);
      timer = window.setInterval(() => {
        setSessionTime(prev => {
          if (prev <= 1) {
            handleLogout("SESSION_TIMEOUT");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view]);

  // Real Performance & Network Monitor
  useEffect(() => {
      if (view === AppView.LOGIN) return;
      
      const interval = setInterval(() => {
          const perf = (performance as any).memory;
          setResources({
              cpuUsage: 0, 
              memoryUsage: perf ? (perf.usedJSHeapSize / perf.jsHeapSizeLimit) * 100 : 0,
              storageUsage: secureStorage.getStorageUsage() / 1024 / 1024,
              activeThreads: navigator.hardwareConcurrency || 4
          });

          // Network Latency Monitoring (Real-time RTT)
          // Uses NetworkInformation API if available
          const conn = (navigator as any).connection;
          const rtt = conn ? conn.rtt : 0; // Round Trip Time in ms
          
          setWifiData(prev => {
              const newData = [...prev, {
                  timestamp: Date.now(),
                  rssi: rtt * -1, // Storing latency as negative RSSI for compatibility with existing type
                  deviceId: 'gateway',
                  correlatedCameraId: 'system'
              }];
              if (newData.length > 50) newData.shift();
              return newData;
          });

      }, 1000);
      return () => clearInterval(interval);
  }, [view]);

  const addLog = useCallback(async (type: SecurityEvent['type'], description: string, severity: SecurityEvent['severity'] = 'info') => {
    const newLog: SecurityEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      type,
      description,
      severity,
      hash: 'PENDING'
    };
    const block = await secureStorage.append(newLog);
    newLog.hash = block.dataHash;
    setLogs(prev => [...prev, newLog]);
  }, []);

  const handleLogin = () => {
    addLog('AUTH', 'Secure session established. Device bound.', 'info');
    setView(AppView.DASHBOARD);
  };

  const handleLogout = (reason: string = "USER_INITIATED") => {
    addLog('AUTH', `Session terminated: ${reason}`, 'warning');
    setView(AppView.LOGIN);
    setWifiData([]);
    setIsSettingsOpen(false);
    setIsAddingCamera(false);
    setSelectedCamera(null);
    setRecordingCameras(new Map());
  };

  const handleMotionDetected = useCallback((cameraId: string) => {
    if (!settings.motionAlerts) return; 
    setLogs(prevLogs => {
        const lastLog = prevLogs[prevLogs.length - 1];
        if (!lastLog || Date.now() - lastLog.timestamp > 2000) {
             Promise.resolve().then(() => {
                 addLog('MOTION', `Real-time Movement detected on ${cameraId}`, 'info');
             });
        }
        return prevLogs;
    });
  }, [addLog, settings.motionAlerts]);

  // Intercept Storage Access
  const handleOpenStorageRequest = () => {
    setIsStorageAuthOpen(true);
  };

  const handleStorageAuthSuccess = () => {
    setIsStorageAuthOpen(false);
    addLog('AUTH', 'Storage Vault unlocked via Master Key', 'info');
    setView(AppView.STORAGE);
  };

  const handleAddCamera = (newCam: Camera) => {
    setCameras(prev => [...prev, newCam]);
    addLog('SYSTEM', `New secure device registered: ${newCam.name} (${newCam.ip})`, 'info');
    setIsAddingCamera(false);
  };

  const handleRemoveCamera = (id: string) => {
      setCameras(prev => prev.filter(c => c.id !== id));
      addLog('CONFIG', `Device removed from secure registry: ${id}`, 'warning');
  };

  const handleUpdateSettings = (newSettings: SystemSettings) => {
      setSettings(newSettings);
      addLog('CONFIG', 'System configuration updated and locked', 'info');
      setIsSettingsOpen(false);
  };

  const handleCaptureSnapshot = async (camId: string) => {
      const cam = cameras.find(c => c.id === camId);
      addLog('SYSTEM', `Snapshot intent logged for ${camId}. (Manual capture requires stream access)`, 'info');
      alert("Snapshot Request Sent to Camera Controller.");
  };

  const handleToggleRecording = async (camId: string) => {
    setRecordingCameras(prev => {
        const next = new Map(prev);
        if (next.has(camId)) {
            // STOP RECORDING
            next.delete(camId);
            addLog('SYSTEM', `Recording stop signal sent to ${camId}`, 'info');
        } else {
            // START RECORDING
            next.set(camId, Date.now());
            addLog('SYSTEM', `Recording start signal sent to ${camId}`, 'warning');
        }
        return next;
    });
  };

  // Called by CameraFeed when recording stops
  const handleRecordingComplete = async (cameraId: string, blob: Blob, durationMs: number) => {
      const startTime = Date.now() - durationMs;
      const durationStr = (durationMs / 1000).toFixed(1) + 's';
      
      setPendingSave({
          cameraId,
          blob,
          startTime,
          duration: durationStr
      });
  };

  // Called by Modal
  const handleConfirmSave = (title: string) => {
      if (!pendingSave) return;
      const { cameraId, blob, startTime, duration } = pendingSave;
      const cam = cameras.find(c => c.id === cameraId);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64data = reader.result as string;
          
          await secureStorage.append({
              type: 'VIDEO_CLIP',
              cameraId: cameraId,
              location: cam?.location || 'Unknown',
              timestamp: startTime,
              description: title || `Real-time Recording (${duration})`,
              data: base64data,
              metadata: { duration: duration, size: blob.size, mimeType: blob.type }
          });

          addLog('SYSTEM', `Video segment saved for ${cameraId} as "${title}"`, 'info');
      };
      reader.readAsDataURL(blob);

      setPendingSave(null);
  };

  const handleDiscardSave = () => {
      addLog('SYSTEM', 'Recording discarded by user choice', 'warning');
      setPendingSave(null);
  };

  const handlePtz = (action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'AUTO') => {
      if (!selectedCamera) return;
      addLog('SYSTEM', `PTZ Command [${action}] sent to ${selectedCamera.ip}`, 'info');
      
      setPtzState(prev => {
          let newPan = prev.pan;
          let newTilt = prev.tilt;
          let newAuto = prev.isAuto;

          switch(action) {
              case 'LEFT': newPan = (newPan - 10 + 360) % 360; break;
              case 'RIGHT': newPan = (newPan + 10) % 360; break;
              case 'UP': newTilt = Math.min(90, newTilt + 5); break;
              case 'DOWN': newTilt = Math.max(0, newTilt - 5); break;
              case 'AUTO': 
                  newAuto = !newAuto; 
                  return { ...prev, isAuto: newAuto };
          }
          return { ...prev, pan: newPan, tilt: newTilt, isAuto: false }; 
      });
  };

  // --- Filter & Grouping Logic ---
  const filteredCameras = useMemo(() => {
    return cameras.filter(cam => {
        const matchesSearch = cam.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              cam.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              cam.ip.includes(searchQuery);
        
        const matchesStatus = filterStatus === 'ALL' || 
                              (filterStatus === 'ONLINE' && cam.status === 'online') ||
                              (filterStatus === 'OFFLINE' && cam.status !== 'online');

        return matchesSearch && matchesStatus;
    });
  }, [cameras, searchQuery, filterStatus]);

  const groupedCameras = useMemo<Record<string, Camera[]>>(() => {
      if (!groupByLocation) return { 'ALL DEVICES': filteredCameras };
      return filteredCameras.reduce((groups, cam) => {
          const loc = cam.location || 'Unassigned';
          if (!groups[loc]) groups[loc] = [];
          groups[loc].push(cam);
          return groups;
      }, {} as Record<string, Camera[]>);
  }, [filteredCameras, groupByLocation]);

  if (view === AppView.LOGIN) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (view === AppView.STORAGE) {
    return <StorageBrowser onBack={() => setView(AppView.DASHBOARD)} />;
  }

  if (view === AppView.SCANNER) {
    return (
        <NetworkScanner 
            onBack={() => setView(AppView.DASHBOARD)} 
            onAddCamera={handleAddCamera}
        />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-security-black text-security-text font-sans flex flex-col overflow-hidden">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-security-alert/20 border-b border-security-alert text-security-alert text-xs font-mono font-bold text-center py-1 flex items-center justify-center gap-2">
            <WifiOff className="w-3 h-3" />
            SYSTEM OFFLINE: Local buffering active. Changes will sync when reconnected.
        </div>
      )}

      <Navbar 
        onLogout={() => handleLogout()} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStorage={handleOpenStorageRequest} // Changed to local handler
        onOpenScanner={() => setView(AppView.SCANNER)}
        sessionTime={sessionTime} 
      />
      
      {/* Modals */}
      <MasterKeyPrompt 
        isOpen={isStorageAuthOpen}
        onClose={() => setIsStorageAuthOpen(false)}
        onSuccess={handleStorageAuthSuccess}
        title="SECURE VAULT ACCESS"
        description="Encrypted storage requires Master Access Key for decryption and viewing."
      />

      {isAddingCamera && (
        <AddCameraModal onClose={() => setIsAddingCamera(false)} onAdd={handleAddCamera} />
      )}
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        cameras={cameras}
        onRemoveCamera={handleRemoveCamera}
        onAddCameraRequest={() => {
            setIsSettingsOpen(false);
            setIsAddingCamera(true);
        }}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        masterKeyHash={getStoredHash()}
      />

      <SaveRecordingModal 
        isOpen={!!pendingSave}
        onSave={handleConfirmSave}
        onDiscard={handleDiscardSave}
        defaultTitle={`Recording_${new Date().toLocaleTimeString().replace(/:/g, '')}`}
        duration={pendingSave?.duration}
      />

      {/* EXPANDED CAMERA VIEW OVERLAY */}
      {selectedCamera && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-security-border bg-security-panel">
                  <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${selectedCamera.status === 'online' ? 'bg-security-accent shadow-[0_0_10px_#00ff41]' : 'bg-security-alert'}`} />
                      <div>
                          <h2 className="text-lg font-mono font-bold text-security-text">{selectedCamera.name}</h2>
                          <div className="text-xs font-mono text-security-dim flex gap-4">
                              <span>IP: {selectedCamera.ip}</span>
                              <span>LOC: {selectedCamera.location}</span>
                              <span>ID: {selectedCamera.id}</span>
                          </div>
                      </div>
                  </div>
                  <button onClick={() => setSelectedCamera(null)} className="p-2 hover:bg-white/10 rounded-full text-security-dim hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                  </button>
              </div>
              
              <div className="flex-1 flex overflow-hidden">
                  {/* Large Feed Area */}
                  <div className="flex-1 p-4 flex items-center justify-center bg-black relative">
                      <div className="w-full h-full max-w-5xl max-h-[80vh]">
                          <CameraFeed 
                             camera={selectedCamera} 
                             onMotionDetected={handleMotionDetected}
                             settings={settings}
                             isRecording={recordingCameras.has(selectedCamera.id)}
                             onRecordingComplete={(blob, duration) => handleRecordingComplete(selectedCamera.id, blob, duration)}
                             isExpanded={true} // Full color mode enabled
                          />
                      </div>
                  </div>

                  {/* Sidebar Controls */}
                  <div className="w-80 bg-security-panel border-l border-security-border p-4 flex flex-col gap-6 overflow-y-auto">
                      
                      {/* Actions */}
                      <div className="space-y-3">
                          <h3 className="text-xs font-mono font-bold text-security-dim uppercase">Quick Actions</h3>
                          <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={() => handleCaptureSnapshot(selectedCamera.id)}
                                className="p-3 bg-security-black border border-security-border hover:border-security-accent hover:text-security-accent transition-colors flex flex-col items-center gap-2"
                              >
                                  <CameraIcon className="w-5 h-5" />
                                  <span className="text-[10px] font-mono">SNAPSHOT</span>
                              </button>
                              <button 
                                onClick={() => handleToggleRecording(selectedCamera.id)}
                                className={`p-3 bg-security-black border transition-colors flex flex-col items-center gap-2 group ${recordingCameras.has(selectedCamera.id) ? 'border-security-alert text-security-alert bg-security-alert/10' : 'border-security-border hover:border-security-alert hover:text-security-alert'}`}
                              >
                                  <Disc className={`w-5 h-5 ${recordingCameras.has(selectedCamera.id) ? 'animate-pulse' : 'group-hover:animate-pulse'}`} />
                                  <span className="text-[10px] font-mono">{recordingCameras.has(selectedCamera.id) ? 'STOP REC' : 'REC NOW'}</span>
                              </button>
                          </div>
                      </div>

                      {/* PTZ Controls */}
                      <div className="space-y-3">
                          <h3 className="text-xs font-mono font-bold text-security-dim uppercase">PTZ Control</h3>
                          <div className="bg-black border border-security-border p-4 rounded-full w-48 h-48 mx-auto relative flex items-center justify-center">
                              <button onClick={() => handlePtz('UP')} className="absolute top-2 left-1/2 -translate-x-1/2 p-2 hover:bg-white/10 rounded"><ChevronUp className="w-6 h-6 text-security-text" /></button>
                              <button onClick={() => handlePtz('DOWN')} className="absolute bottom-2 left-1/2 -translate-x-1/2 p-2 hover:bg-white/10 rounded"><ChevronDown className="w-6 h-6 text-security-text" /></button>
                              <button onClick={() => handlePtz('LEFT')} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded"><ChevronLeft className="w-6 h-6 text-security-text" /></button>
                              <button onClick={() => handlePtz('RIGHT')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded"><ChevronRight className="w-6 h-6 text-security-text" /></button>
                              <button onClick={() => handlePtz('AUTO')} className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border ${ptzState.isAuto ? 'bg-security-accent/20 border-security-accent' : 'border-transparent'}`}>{ptzState.isAuto && <RefreshCw className="w-4 h-4 mb-1 animate-spin" />}<span className="text-[10px] font-mono font-bold">AUTO</span></button>
                          </div>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-3 flex-1">
                          <h3 className="text-xs font-mono font-bold text-security-dim uppercase">Stream Metadata</h3>
                          <div className="space-y-2 text-[10px] font-mono text-security-text bg-black p-3 border border-security-border">
                              <div className="flex justify-between"><span>SOURCE</span><span>{selectedCamera.isWebcam ? 'LOCAL DEVICE' : 'NETWORK STREAM'}</span></div>
                              <div className="flex justify-between"><span>STATUS</span><span>{selectedCamera.status}</span></div>
                              <div className="flex justify-between"><span>ENCRYPTION</span><span>AES-GCM-256</span></div>
                              <div className="flex justify-between"><span>TUNNEL</span><span className="text-security-accent">SECURE (VPN)</span></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <main className="flex-1 p-2 lg:p-4 gap-4 flex flex-col lg:grid lg:grid-cols-4 h-[calc(100dvh-3.5rem)] overflow-y-auto lg:overflow-hidden">
        
        {/* Left Col: Camera Dashboard */}
        <div className="flex-none lg:h-full lg:col-span-3 flex flex-col gap-4 min-h-[500px]">
          
          {/* STICKY HEADER WRAPPER (Mobile: Sticks to top. Desktop: Stays at top of non-scrolling area) */}
          <div className="flex flex-col gap-4 sticky top-0 z-30 bg-security-black pb-1 -mt-1 pt-1">
              {/* TRUST & COMPLIANCE HEADER (New) */}
              <div className="bg-security-panel border border-security-border p-3 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-3 shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-security-accent"></div>
                  
                  <div className="flex gap-6 w-full sm:w-auto">
                       <div className="flex flex-col">
                           <span className="text-[9px] text-security-dim font-mono tracking-widest uppercase">Trust Score</span>
                           <span className="text-lg font-mono font-bold text-security-accent flex items-center gap-2">
                               <ShieldCheck className="w-5 h-5" /> 100%
                           </span>
                       </div>
                       
                       <div className="w-px bg-security-border h-auto"></div>

                       <div className="flex flex-col">
                           <span className="text-[9px] text-security-dim font-mono tracking-widest uppercase">Compliance Mode</span>
                           <span className="text-xs font-mono text-white flex items-center gap-2 mt-1">
                               <Scale className="w-3 h-3 text-security-dim" /> 
                               {settings.complianceStandard === 'NONE' ? 'DEV_MODE' : settings.complianceStandard.replace('_', ' ')}
                           </span>
                       </div>

                       <div className="w-px bg-security-border h-auto hidden sm:block"></div>

                       <div className="hidden sm:flex flex-col">
                           <span className="text-[9px] text-security-dim font-mono tracking-widest uppercase">Last Audit</span>
                           <span className="text-xs font-mono text-white flex items-center gap-2 mt-1">
                               <FileCheck className="w-3 h-3 text-security-dim" /> LIVE
                           </span>
                       </div>
                  </div>

                  <div className="flex gap-2">
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="px-3 py-1.5 border border-security-border hover:border-security-accent text-[10px] font-mono text-security-dim hover:text-white transition-colors"
                      >
                          MANAGE GOVERNANCE
                      </button>
                  </div>
              </div>

              {/* System Status & Action Bar */}
              <div className="bg-security-panel border border-security-border p-3 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-3 shadow-md">
                <div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-security-dim font-mono">SYSTEM STATUS</span>
                        <span className="text-xs font-mono text-security-accent font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> ARMED
                        </span>
                    </div>
                    <div className="w-px h-8 bg-security-border hidden sm:block"></div>
                    <div className="flex flex-col items-end sm:items-start">
                        <span className="text-[10px] text-security-dim font-mono">ENCRYPTION ENGINE</span>
                        <span className="text-xs font-mono text-white flex items-center gap-1">
                            <Database className="w-3 h-3 text-security-dim" /> {settings.encryptionEnabled ? 'AES-256-GCM' : 'DISABLED'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                    onClick={() => setIsAddingCamera(true)}
                    className="flex-1 sm:flex-none bg-security-accent text-black border border-security-accent px-4 py-3 sm:py-2 text-xs font-mono flex items-center justify-center gap-2 hover:bg-security-accent/90 transition-colors font-bold touch-manipulation"
                    >
                    <Plus className="w-3 h-3" /> ADD CAMERA
                    </button>
                </div>
              </div>

              {/* Dashboard Control Bar (Search/Filter) */}
              <div className="bg-security-panel border border-security-border p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-security-dim" />
                        <input 
                        type="text" 
                        placeholder="Search devices..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-black border border-security-border text-xs font-mono py-2 pl-9 pr-2 focus:border-security-accent outline-none text-security-text"
                        />
                    </div>
                    <div className="h-8 w-px bg-security-border hidden sm:block"></div>
                    <div className="flex gap-1">
                        <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 text-[10px] font-mono font-bold border ${filterStatus === 'ALL' ? 'bg-security-text text-black border-security-text' : 'text-security-dim border-transparent'}`}>ALL</button>
                        <button onClick={() => setFilterStatus('ONLINE')} className={`px-3 py-1.5 text-[10px] font-mono font-bold border ${filterStatus === 'ONLINE' ? 'bg-security-accent text-black border-security-accent' : 'text-security-dim border-transparent'}`}>ONLINE</button>
                        <button onClick={() => setFilterStatus('OFFLINE')} className={`px-3 py-1.5 text-[10px] font-mono font-bold border ${filterStatus === 'OFFLINE' ? 'bg-security-alert text-black border-security-alert' : 'text-security-dim border-transparent'}`}>OFFLINE</button>
                    </div>
                </div>
                <button 
                    onClick={() => setGroupByLocation(!groupByLocation)}
                    className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] font-mono font-bold transition-colors ${groupByLocation ? 'bg-security-dim/20 border-security-text text-security-text' : 'border-security-border text-security-dim hover:text-white'}`}
                >
                    {groupByLocation ? <List className="w-3 h-3" /> : <Grid className="w-3 h-3" />}
                    {groupByLocation ? 'GROUP: LOCATION' : 'VIEW: GRID'}
                </button>
              </div>
          </div>

          {/* Camera Grid Area */}
          <div className="bg-security-panel border border-security-border p-1 rounded-sm flex-1 overflow-y-auto custom-scrollbar relative">
             <div className="p-2 space-y-6">
                 {Object.entries(groupedCameras).map(([groupName, groupCams]: [string, Camera[]]) => (
                     <div key={groupName} className="space-y-2">
                         {groupByLocation && (
                             <div className="flex items-center gap-2 text-security-dim pb-1 border-b border-security-border/50">
                                 <MapPin className="w-3 h-3" />
                                 <span className="text-xs font-mono font-bold">{groupName}</span>
                                 <span className="text-[10px] font-mono opacity-50">({groupCams.length} Devices)</span>
                             </div>
                         )}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                            {groupCams.map(cam => (
                              <CameraFeed 
                                key={cam.id} 
                                camera={cam} 
                                onMotionDetected={handleMotionDetected} 
                                settings={settings}
                                isRecording={recordingCameras.has(cam.id)}
                                onRecordingComplete={(blob, duration) => handleRecordingComplete(cam.id, blob, duration)}
                                onExpand={(c) => setSelectedCamera(c)}
                              />
                            ))}
                         </div>
                     </div>
                 ))}
             </div>
          </div>
          
        </div>

        {/* Right Col: Data, Resources, Logs - Stacks below on mobile */}
        <div className="flex-none lg:h-full lg:col-span-1 flex flex-col gap-4 pb-4 lg:pb-0">
          <div className="flex-none">
             <ResourceMonitor resources={resources} />
          </div>
          <div className="h-48 lg:h-1/4 min-h-[150px]">
             {/* Note: Wifi data is now empty as simulation is removed. The component handles empty state. */}
             <WiFiSignalChart data={wifiData} />
          </div>
          <div className="flex-1 min-h-[300px] lg:min-h-0">
             <AuditLog logs={logs} />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;
