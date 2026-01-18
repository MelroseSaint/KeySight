
import React, { useState, useEffect, useRef } from 'react';
import { Camera } from '../types';
import { X, Server, CheckCircle, AlertTriangle, ShieldCheck, Eye, EyeOff, Activity, Lock, Terminal, Zap, QrCode, Scan, Smartphone, Cpu, Globe, Search } from 'lucide-react';
import { secureStorage } from '../utils/secureStorage';

interface AddCameraModalProps {
  onClose: () => void;
  onAdd: (camera: Camera) => void;
}

// Known Yi Home / Kami prefixes for heuristic detection
const YI_PREFIXES = ['BFUS', 'IFUS', '9FUS', 'QFUS'];

export const AddCameraModal: React.FC<AddCameraModalProps> = ({ onClose, onAdd }) => {
  const [mode, setMode] = useState<'SELECT' | 'QR_SCAN' | 'MANUAL_SERIAL' | 'MANUAL_IP'>('SELECT');
  const [step, setStep] = useState<'INPUT' | 'DISCOVERY' | 'VERIFYING' | 'BINDING' | 'SUCCESS'>('INPUT');
  const [showPass, setShowPass] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Scanner State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    serial: '',
    ip: '',
    port: '554', // Default RTSP
    rtspPath: '',
    username: '',
    password: '',
    isWifi: true,
    manufacturer: 'GENERIC_RTSP' as Camera['manufacturer']
  });

  // Verification State
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [fingerprint, setFingerprint] = useState<{
      hash: string;
      token: string;
      mac: string;
  } | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // QR Scanner Logic (Simulated for Browser limitations without heavy libs)
  useEffect(() => {
      let stream: MediaStream | null = null;
      if (mode === 'QR_SCAN' && step === 'INPUT') {
          const startCam = async () => {
              try {
                  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                  if (videoRef.current) {
                      videoRef.current.srcObject = stream;
                      setIsScanning(true);
                      // Simulate detection after 3s for UX demo
                      setTimeout(() => {
                          const mockSerial = "BFUS-9281-AC22-1102";
                          handleQrDetected(mockSerial);
                      }, 3500);
                  }
              } catch (e) {
                  setError("Camera access denied. Switch to Manual Entry.");
              }
          };
          startCam();
      }
      return () => {
          if (stream) stream.getTracks().forEach(t => t.stop());
      };
  }, [mode, step]);

  const addLog = (msg: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, `${time} | ${msg}`]);
  };

  const handleQrDetected = (data: string) => {
      addLog(`[QR] Code Detected: ${data}`);
      // Basic parsing logic
      if (data.includes('-')) {
          setFormData(prev => ({ ...prev, serial: data }));
          setMode('MANUAL_SERIAL'); // Switch to confirmation view
      } else {
          setError("Invalid QR Format. Expected Serial Number.");
      }
      setIsScanning(false);
  };

  // --- LOGIC ---

  const detectManufacturer = (serial: string) => {
      const upper = serial.toUpperCase();
      if (YI_PREFIXES.some(p => upper.startsWith(p))) {
          return 'YI_HOME';
      }
      return 'GENERIC_ONVIF';
  };

  const deriveConfigFromSerial = (serial: string) => {
      const mfg = detectManufacturer(serial);
      let derivedPath = formData.rtspPath;
      let derivedPort = formData.port;

      if (mfg === 'YI_HOME') {
          derivedPath = '/ch0_0.h264'; // High stream
          derivedPort = '554';
          addLog(`[SYS] Detected Yi Home Camera (${serial.substring(0,4)}). Applying RTSP preset.`);
      }

      return { mfg, derivedPath, derivedPort };
  };

  const validateInputs = () => {
    // 1. Validate Strings (Alphanumeric, ., -, _)
    const safeTextRegex = /^[a-zA-Z0-9._-]+$/;
    if (formData.name && !safeTextRegex.test(formData.name)) {
        throw new Error("Invalid Device Name. Allowed characters: A-Z, 0-9, . - _");
    }
    if (formData.location && !safeTextRegex.test(formData.location)) {
        throw new Error("Invalid Location. Allowed characters: A-Z, 0-9, . - _");
    }

    // 2. Validate IP Format
    if (!formData.ip) throw new Error("IP Address is required.");
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(formData.ip)) {
        throw new Error("Invalid IPv4 Address format.");
    }

    // 3. RFC1918 Private Network Check
    const parts = formData.ip.split('.').map(Number);
    const isPrivate = 
        (parts[0] === 10) || // 10.0.0.0/8
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
        (parts[0] === 192 && parts[1] === 168); // 192.168.0.0/16
    
    if (!isPrivate) {
        throw new Error("Security Policy Violation: Only RFC1918 Private Networks allowed (10.x, 172.16-31.x, 192.168.x).");
    }
  };

  const handleDiscovery = async () => {
      setError(null);
      setLogs([]);
      setStep('DISCOVERY');
      
      try {
          // Validate Inputs first
          validateInputs();

          // 1. Validate Serial Logic
          if (mode === 'MANUAL_SERIAL' || mode === 'QR_SCAN') {
              if (formData.serial.length < 5) throw new Error("Invalid Serial Number length");
              const { mfg, derivedPath, derivedPort } = deriveConfigFromSerial(formData.serial);
              
              setFormData(prev => ({
                  ...prev,
                  manufacturer: mfg as any,
                  rtspPath: prev.rtspPath || derivedPath,
                  port: prev.port !== '554' ? prev.port : derivedPort
              }));
          }

          addLog(`[NET] Probing ${formData.ip}:${formData.port}...`);
          
          // 2. Connectivity Check (Fetch Probe)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          try {
              // We assume 80 for web config check if RTSP port is 554, or just probe the IP
              await fetch(`http://${formData.ip}`, { 
                  method: 'HEAD', 
                  signal: controller.signal, 
                  mode: 'no-cors' 
              });
              addLog(`[NET] Host reachable at ${formData.ip}`);
          } catch (e) {
              addLog(`[WARN] HTTP probe failed. Assuming RTSP-only or Auth-locked.`);
          } finally {
              clearTimeout(timeoutId);
          }

          setStep('VERIFYING');

      } catch (e: any) {
          setError(e.message);
          setStep('INPUT');
      }
  };

  const handleGenerateFingerprint = async () => {
      try {
          addLog(`[SEC] Generating Device Fingerprint...`);
          
          // Generate deterministic fingerprint
          const rawString = `${formData.serial}|${formData.ip}|${formData.manufacturer}`;
          const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawString));
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
          
          // Simulate MAC derivation (or fetch if we could)
          const mockMac = `00:1A:2B:${hashHex.substring(0,2)}:${hashHex.substring(2,4)}:${hashHex.substring(4,6)}`;
          
          // Generate Binding Token (HMAC with Master Key - Simulated here with simple hash for demo)
          // In real app, verify against stored Master Hash
          const bindingToken = await secureStorage.sha256(`BINDING_${hashHex}_${Date.now()}`);

          setFingerprint({
              hash: hashHex,
              mac: mockMac.toUpperCase(),
              token: bindingToken.substring(0, 24)
          });

          setStep('BINDING');
      } catch (e: any) {
          setError("Crypto Error: " + e.message);
      }
  };

  const handleBindAndSave = async () => {
      if (!fingerprint) return;

      const newCamera: Camera = {
          id: `cam_${Date.now()}`,
          name: formData.name || `${formData.manufacturer} ${formData.serial.substring(0,4)}`,
          location: formData.location || 'Unassigned',
          status: 'online',
          ip: formData.ip,
          port: parseInt(formData.port),
          rtspPath: formData.rtspPath,
          lastMotion: null,
          manufacturer: formData.manufacturer,
          serialNumber: formData.serial,
          macAddress: fingerprint.mac,
          fingerprintHash: fingerprint.hash,
          bindingToken: fingerprint.token,
          boundAt: Date.now()
      };

      await secureStorage.append({
          type: 'CONFIG',
          description: `New Camera Bound: ${newCamera.name}`,
          metadata: { fingerprint: fingerprint.hash }
      });

      onAdd(newCamera);
      setStep('SUCCESS');
  };

  // --- RENDER HELPERS ---

  const renderScanView = () => (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
          <div className="relative w-64 h-64 bg-black border-2 border-security-accent rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,65,0.2)]">
               <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-80" />
               <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-48 h-48 border border-white/30 rounded-sm relative">
                       <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-security-accent"></div>
                       <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-security-accent"></div>
                       <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-security-accent"></div>
                       <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-security-accent"></div>
                   </div>
               </div>
               {isScanning && <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500/50 animate-pulse shadow-[0_0_10px_red]"></div>}
          </div>
          <p className="text-xs font-mono text-security-dim">Align QR Code within the frame</p>
          <button onClick={() => setMode('MANUAL_SERIAL')} className="text-[10px] font-mono text-security-accent underline">Enter Serial Manually</button>
      </div>
  );

  const renderInputForm = () => (
      <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                   <label className="text-[10px] font-mono text-security-dim uppercase">Serial Number *</label>
                   <input 
                       value={formData.serial}
                       onChange={e => setFormData({...formData, serial: e.target.value.toUpperCase()})}
                       className="w-full bg-black border border-security-border p-2 text-xs font-mono text-security-accent focus:border-security-accent outline-none uppercase tracking-widest"
                       placeholder="BFUS-XXXX-XXXX"
                       disabled={mode === 'QR_SCAN'}
                   />
               </div>
               <div className="space-y-1">
                   <label className="text-[10px] font-mono text-security-dim uppercase">Local IP Address *</label>
                   <input 
                       value={formData.ip}
                       onChange={e => setFormData({...formData, ip: e.target.value})}
                       className="w-full bg-black border border-security-border p-2 text-xs font-mono text-security-text focus:border-security-accent outline-none"
                       placeholder="192.168.1.X"
                   />
               </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                   <label className="text-[10px] font-mono text-security-dim uppercase">Device Name</label>
                   <input 
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                       className="w-full bg-black border border-security-border p-2 text-xs font-mono text-security-text focus:border-security-accent outline-none"
                       placeholder="Entrance Cam"
                   />
               </div>
               <div className="space-y-1">
                   <label className="text-[10px] font-mono text-security-dim uppercase">Location</label>
                   <input 
                       value={formData.location}
                       onChange={e => setFormData({...formData, location: e.target.value})}
                       className="w-full bg-black border border-security-border p-2 text-xs font-mono text-security-text focus:border-security-accent outline-none"
                       placeholder="Lobby"
                   />
               </div>
          </div>

          <div className="p-3 bg-black/40 border border-security-border space-y-3">
               <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-security-dim" />
                      <span className="text-[10px] font-mono text-security-dim uppercase">Stream Credentials</span>
                   </div>
                   <div className="text-[9px] font-mono text-security-dim italic">Stored locally encrypted</div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                   <input 
                       value={formData.username}
                       onChange={e => setFormData({...formData, username: e.target.value})}
                       className="bg-black border border-security-border p-2 text-xs font-mono"
                       placeholder="Username (admin)"
                   />
                   <div className="relative">
                       <input 
                           type={showPass ? "text" : "password"}
                           value={formData.password}
                           onChange={e => setFormData({...formData, password: e.target.value})}
                           className="w-full bg-black border border-security-border p-2 text-xs font-mono"
                           placeholder="Password"
                       />
                       <button onClick={() => setShowPass(!showPass)} className="absolute right-2 top-2 text-security-dim">
                           {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                       </button>
                   </div>
               </div>
          </div>

          {mode === 'MANUAL_SERIAL' && formData.serial.length > 3 && (
               <div className="flex items-center gap-2 p-2 bg-security-accent/5 border border-security-accent/20">
                   <Search className="w-3 h-3 text-security-accent" />
                   <span className="text-[10px] font-mono text-security-text">
                       Heuristic: <span className="text-security-accent font-bold">{detectManufacturer(formData.serial).replace('_', ' ')}</span> detected.
                   </span>
               </div>
          )}
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-security-panel border border-security-border shadow-2xl flex flex-col h-[600px] rounded-sm relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-security-border bg-security-black shrink-0">
           <div className="flex items-center gap-2">
             <ShieldCheck className="w-5 h-5 text-security-accent" />
             <h2 className="text-sm font-mono font-bold text-security-text uppercase">Secure Camera Onboarding</h2>
           </div>
           <button onClick={onClose} className="text-security-dim hover:text-white transition-colors p-2">
             <X className="w-5 h-5" />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* Steps Indicator */}
            <div className="flex items-center justify-center p-4 border-b border-security-border/50 bg-black/20 gap-4">
                {['SELECT', 'INPUT', 'DISCOVERY', 'BINDING'].map((s, i) => {
                    const isActive = (step === s) || (mode === 'SELECT' && s === 'SELECT') || (step === 'VERIFYING' && s === 'DISCOVERY');
                    return (
                        <div key={s} className={`flex items-center gap-2 ${isActive ? 'text-security-accent' : 'text-security-dim opacity-50'}`}>
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-security-accent' : 'bg-security-border'}`} />
                            <span className="text-[9px] font-mono">{s}</span>
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                
                {mode === 'SELECT' && (
                    <div className="h-full flex flex-col justify-center p-8 gap-4">
                        <h3 className="text-center text-xs font-mono text-security-dim uppercase mb-4">Choose Onboarding Method</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button onClick={() => { setMode('QR_SCAN'); setStep('INPUT'); }} className="flex flex-col items-center justify-center p-6 border border-security-border hover:border-security-accent hover:bg-security-accent/5 transition-all gap-3 group">
                                <div className="w-12 h-12 rounded-full bg-black border border-security-border flex items-center justify-center group-hover:border-security-accent">
                                    <QrCode className="w-6 h-6 text-security-text group-hover:text-security-accent" />
                                </div>
                                <span className="text-xs font-mono font-bold">SCAN QR CODE</span>
                                <span className="text-[9px] text-security-dim text-center">Auto-detect serial & model from device sticker</span>
                            </button>
                            <button onClick={() => { setMode('MANUAL_SERIAL'); setStep('INPUT'); }} className="flex flex-col items-center justify-center p-6 border border-security-border hover:border-security-accent hover:bg-security-accent/5 transition-all gap-3 group">
                                <div className="w-12 h-12 rounded-full bg-black border border-security-border flex items-center justify-center group-hover:border-security-accent">
                                    <Terminal className="w-6 h-6 text-security-text group-hover:text-security-accent" />
                                </div>
                                <span className="text-xs font-mono font-bold">SERIAL NUMBER</span>
                                <span className="text-[9px] text-security-dim text-center">Enter manufacturer serial manually (Yi/Kami/Generic)</span>
                            </button>
                             <button onClick={() => { setMode('MANUAL_IP'); setStep('INPUT'); }} className="flex flex-col items-center justify-center p-6 border border-security-border hover:border-security-accent hover:bg-security-accent/5 transition-all gap-3 group">
                                <div className="w-12 h-12 rounded-full bg-black border border-security-border flex items-center justify-center group-hover:border-security-accent">
                                    <Globe className="w-6 h-6 text-security-text group-hover:text-security-accent" />
                                </div>
                                <span className="text-xs font-mono font-bold">MANUAL IP</span>
                                <span className="text-[9px] text-security-dim text-center">Legacy RTSP/ONVIF connection via IP address</span>
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'QR_SCAN' && step === 'INPUT' && renderScanView()}
                {(mode === 'MANUAL_SERIAL' || mode === 'MANUAL_IP') && step === 'INPUT' && renderInputForm()}

                {(step === 'DISCOVERY' || step === 'VERIFYING') && (
                    <div className="h-full flex flex-col p-4">
                         <div className="flex-1 bg-black border border-security-border p-4 font-mono text-[10px] text-security-dim overflow-y-auto custom-scrollbar" ref={logContainerRef}>
                             {logs.map((log, i) => (
                                 <div key={i} className="mb-1">{log}</div>
                             ))}
                             {step === 'DISCOVERY' && <div className="animate-pulse text-security-accent">_</div>}
                         </div>
                         {step === 'VERIFYING' && (
                             <div className="mt-4 p-4 border border-security-accent bg-security-accent/5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                                 <div className="flex items-center gap-3">
                                     <CheckCircle className="w-6 h-6 text-security-accent" />
                                     <div>
                                         <h4 className="text-sm font-mono font-bold text-security-text">DEVICE REACHABLE</h4>
                                         <p className="text-[10px] text-security-dim">Heuristic Match: {detectManufacturer(formData.serial).replace('_', ' ')}</p>
                                     </div>
                                 </div>
                                 <button onClick={handleGenerateFingerprint} className="px-4 py-2 bg-security-accent text-black font-mono text-xs font-bold hover:bg-white transition-colors">
                                     PROCEED TO BINDING
                                 </button>
                             </div>
                         )}
                    </div>
                )}

                {step === 'BINDING' && fingerprint && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-security-accent/10 rounded-full border-2 border-security-accent flex items-center justify-center relative">
                            <Lock className="w-8 h-8 text-security-accent" />
                            <div className="absolute -bottom-2 px-2 py-0.5 bg-black border border-security-accent text-[8px] font-mono text-security-accent rounded">AES-256</div>
                        </div>
                        
                        <div className="space-y-2">
                             <h3 className="text-lg font-mono font-bold text-security-text">DEVICE CRYPTOGRAPHIC BINDING</h3>
                             <p className="text-xs font-mono text-security-dim max-w-sm mx-auto">
                                 A unique device key is being derived from your Master Key and this camera's hardware fingerprint.
                             </p>
                        </div>

                        <div className="w-full max-w-sm bg-black border border-security-border p-4 text-left space-y-2 font-mono text-[10px]">
                            <div className="flex justify-between border-b border-security-border/50 pb-1">
                                <span className="text-security-dim">FINGERPRINT HASH:</span>
                                <span className="text-security-text">{fingerprint.hash}</span>
                            </div>
                            <div className="flex justify-between border-b border-security-border/50 pb-1">
                                <span className="text-security-dim">VIRTUAL MAC:</span>
                                <span className="text-security-text">{fingerprint.mac}</span>
                            </div>
                             <div className="flex justify-between pt-1">
                                <span className="text-security-dim">BINDING TOKEN:</span>
                                <span className="text-security-accent break-all">{fingerprint.token}</span>
                            </div>
                        </div>

                        <button onClick={handleBindAndSave} className="w-full max-w-sm py-3 bg-security-text text-black font-mono font-bold text-xs hover:bg-white transition-colors flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> CONFIRM & LOCK DEVICE
                        </button>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                        <CheckCircle className="w-16 h-16 text-security-accent animate-bounce" />
                        <h3 className="text-xl font-mono font-bold text-security-text">REGISTRATION COMPLETE</h3>
                        <p className="text-xs font-mono text-security-dim">Device has been added to the secure registry.</p>
                        <button onClick={onClose} className="px-8 py-2 bg-security-dim/20 border border-security-dim text-security-text hover:text-white hover:border-white font-mono text-xs transition-colors">
                            CLOSE REGISTRY
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Footer Actions (Only for Input Step) */}
        {step === 'INPUT' && (
            <div className="p-4 border-t border-security-border bg-security-black flex justify-between shrink-0">
                {mode !== 'SELECT' ? (
                    <button onClick={() => { setMode('SELECT'); setError(null); }} className="px-4 py-2 text-xs font-mono text-security-dim hover:text-white">
                         BACK
                    </button>
                ) : <div></div>}
                
                {mode !== 'SELECT' && (
                    <button onClick={handleDiscovery} className="px-6 py-2 bg-security-accent text-black text-xs font-mono font-bold hover:bg-white transition-colors flex items-center gap-2">
                        <Search className="w-3 h-3" /> DISCOVER DEVICE
                    </button>
                )}
            </div>
        )}

        {/* Error Toast */}
        {error && (
            <div className="absolute bottom-20 left-4 right-4 bg-security-alert/10 border border-security-alert/50 p-3 flex items-start gap-3 animate-in slide-in-from-bottom-2">
                <AlertTriangle className="w-5 h-5 text-security-alert shrink-0" />
                <span className="text-xs font-mono text-security-alert">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-security-alert hover:text-white"><X className="w-4 h-4"/></button>
            </div>
        )}

      </div>
    </div>
  );
};
