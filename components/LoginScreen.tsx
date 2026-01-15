
import React, { useState, useEffect } from 'react';
import { Shield, Key, Server, AlertCircle, Copy, CheckCircle, Smartphone, Lock, Cpu, Globe, RefreshCw, Clock } from 'lucide-react';
import { secureStorage } from '../utils/secureStorage';

interface LoginScreenProps {
  onLogin: () => void;
}

const STORAGE_KEY = 'keysight_master_hash';
const DEVICE_ID_KEY = 'keysight_device_bind';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOADING' | 'SETUP' | 'LOGIN' | 'MFA'>('LOADING');
  const [inputKey, setInputKey] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [totpCountdown, setTotpCountdown] = useState(30);
  const [generatedKey, setGeneratedKey] = useState('');
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [hardwareId, setHardwareId] = useState('');

  // Hardware Fingerprint Generation
  const generateHardwareId = async () => {
      const components = [
          navigator.userAgent,
          navigator.language,
          window.screen.width + 'x' + window.screen.height,
          Intl.DateTimeFormat().resolvedOptions().timeZone
      ];
      return await secureStorage.sha256(components.join('|'));
  };

  // Initialize
  useEffect(() => {
    const checkState = async () => {
      await new Promise(r => setTimeout(r, 800));
      
      const hwId = await generateHardwareId();
      setHardwareId(hwId.substring(0, 16).toUpperCase());

      const existingHash = localStorage.getItem(STORAGE_KEY);
      const boundDevice = localStorage.getItem(DEVICE_ID_KEY);

      if (existingHash) {
          if (boundDevice && boundDevice === hwId) {
             setMode('LOGIN');
          } else {
             // Tamper detection: Key exists but device doesn't match
             setError("CRITICAL: DEVICE MISMATCH DETECTED. BINDING INVALID.");
             // In a real app, this might lock out. For demo, we might allow reset or show fatal error.
             setMode('LOGIN'); // Let them try, but it will fail validation if strict
          }
      } else {
        generateNewKey();
        setMode('SETUP');
      }
    };
    checkState();
  }, []);

  // MFA TOTP Generator Effect
  useEffect(() => {
    let interval: number;
    if (mode === 'MFA') {
        const generateTotp = async () => {
           // Deterministic generation based on key + time window (30s)
           const timeStep = Math.floor(Date.now() / 30000);
           const seed = inputKey + timeStep;
           const hash = await secureStorage.sha256(seed);
           
           // Convert hex fragment to number for 6-digit code
           const num = parseInt(hash.substring(0, 8), 16);
           const code = (num % 1000000).toString().padStart(6, '0');
           
           setMfaCode(code);
        };

        generateTotp(); // Initial generation

        // Sync loop
        interval = window.setInterval(() => {
            const now = Date.now();
            const sec = 30 - (Math.floor(now / 1000) % 30);
            setTotpCountdown(sec);
            
            // Regenerate on cycle start
            if (sec === 30) {
                generateTotp();
            }
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, inputKey]);

  const generateNewKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = 4;
    const segmentLength = 4;
    let key = '';
    for (let i = 0; i < segments; i++) {
      let segment = '';
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      key += (i > 0 ? '-' : '') + segment;
    }
    setGeneratedKey(key);
  };

  const handleSetupComplete = async () => {
    if (!savedConfirmed) return;
    setLoading(true);
    
    setTimeout(async () => {
      const hash = await secureStorage.sha256(generatedKey);
      const hwId = await generateHardwareId();
      
      localStorage.setItem(STORAGE_KEY, hash);
      localStorage.setItem(DEVICE_ID_KEY, hwId);
      
      setLoading(false);
      onLogin(); 
    }, 1500);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const storedHash = localStorage.getItem(STORAGE_KEY);
    const boundDevice = localStorage.getItem(DEVICE_ID_KEY);
    const currentHwId = await generateHardwareId();

    // STRICT DEVICE CHECK
    if (boundDevice !== currentHwId) {
        setTimeout(() => {
            setError('ACCESS DENIED: DEVICE FINGERPRINT MISMATCH.');
            setLoading(false);
        }, 1500);
        return;
    }

    const inputHash = await secureStorage.sha256(inputKey.trim().toUpperCase());

    setTimeout(() => {
      if (inputHash === storedHash) {
        setLoading(false);
        setMode('MFA'); // Proceed to MFA
      } else {
        setError('INVALID ACCESS KEY. ACCESS DENIED.');
        setLoading(false);
      }
    }, 1000);
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      // Simulate TOTP check (any 6 digit code works for demo)
      setTimeout(() => {
          if (mfaCode.length === 6 && /^\d+$/.test(mfaCode)) {
              onLogin();
          } else {
              setError('INVALID MFA CODE');
              setLoading(false);
          }
      }, 800);
  };

  const handleReset = () => {
    if (confirm("WARNING: This will wipe the stored keys and device binding. All local data will be unrecoverable.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (mode === 'LOADING') {
     return (
        <div className="min-h-screen bg-black flex items-center justify-center">
           <div className="flex flex-col items-center gap-4 animate-pulse">
              <Shield className="w-12 h-12 text-security-dim" />
              <div className="text-xs font-mono text-security-dim">VERIFYING HARDWARE INTEGRITY...</div>
           </div>
        </div>
     );
  }

  if (mode === 'SETUP') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        <div className="max-w-lg w-full bg-security-panel border border-security-accent/30 p-8 shadow-[0_0_30px_rgba(0,255,65,0.1)] relative z-10">
           <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 bg-security-black rounded-full flex items-center justify-center mb-4 border border-security-accent">
                 <Lock className="w-8 h-8 text-security-accent" />
              </div>
              <h1 className="text-xl font-mono font-bold text-security-text tracking-widest uppercase">Device Binding</h1>
              <p className="text-xs text-security-dim font-mono mt-2 max-w-xs">
                 BINDING CREDENTIALS TO THIS HARDWARE ID: <br/><span className="text-security-accent">{hardwareId}</span>
              </p>
           </div>
           <div className="bg-black border border-security-border p-6 mb-6 relative">
              <div className="text-[10px] text-security-dim font-mono mb-2 uppercase">Your Master Access Key</div>
              <div className="text-2xl font-mono text-security-accent font-bold tracking-widest break-all text-center select-all">
                 {generatedKey}
              </div>
              <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 hover:bg-white/10 rounded transition-colors">
                 {copySuccess ? <CheckCircle className="w-4 h-4 text-security-accent" /> : <Copy className="w-4 h-4 text-security-dim" />}
              </button>
           </div>
           <div className="bg-security-alert/10 border border-security-alert/30 p-4 mb-6">
              <div className="flex items-start gap-3">
                 <AlertCircle className="w-5 h-5 text-security-alert shrink-0" />
                 <p className="text-[10px] font-mono text-security-alert leading-relaxed">
                    <strong>STRICT SECURITY NOTICE:</strong> THIS KEY WILL BE CRYPTOGRAPHICALLY BOUND TO THIS DEVICE.
                    LOGIN ATTEMPTS FROM OTHER BROWSERS OR DEVICES WILL BE REJECTED AUTOMATICALLY.
                 </p>
              </div>
           </div>
           <div className="mb-6">
              <label className="flex items-center gap-3 p-3 border border-security-border hover:bg-white/5 cursor-pointer transition-colors select-none">
                 <input type="checkbox" checked={savedConfirmed} onChange={(e) => setSavedConfirmed(e.target.checked)} className="appearance-none w-4 h-4 border border-security-dim checked:bg-security-accent checked:border-security-accent transition-colors" />
                 <span className="text-xs font-mono text-security-text">I ACCEPT THE DEVICE BINDING POLICY</span>
              </label>
           </div>
           <button 
             onClick={handleSetupComplete}
             disabled={!savedConfirmed || loading}
             className="w-full bg-security-accent text-black font-mono font-bold py-3 hover:bg-security-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             {loading ? 'BINDING HARDWARE...' : 'INITIALIZE SYSTEM'}
           </button>
        </div>
      </div>
    );
  }

  // LOGIN & MFA
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
       <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

       <div className="max-w-md w-full bg-security-panel border border-security-border p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8 text-center">
             <div className="w-16 h-16 bg-security-border/20 rounded-full flex items-center justify-center mb-4 border border-security-accent/20">
                <Shield className="w-8 h-8 text-security-accent" />
             </div>
             <h1 className="text-2xl font-mono font-bold text-security-text tracking-widest">KEYSIGHT</h1>
             <p className="text-xs text-security-dim font-mono mt-2">SECURE ACCESS GATEWAY</p>
          </div>

          {mode === 'LOGIN' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-mono text-security-dim flex items-center gap-2">
                       <Key className="w-3 h-3" /> MASTER KEY
                    </label>
                    <input 
                      type="password"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full bg-black border border-security-border text-security-text p-3 font-mono focus:border-security-accent focus:outline-none transition-all placeholder-security-dim/30"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      autoFocus
                    />
                 </div>
                 <div className="p-3 bg-security-black border border-security-border flex items-start gap-3">
                    <Cpu className="w-4 h-4 text-security-dim mt-0.5" />
                    <div className="flex flex-col">
                       <span className="text-[10px] font-mono text-security-text">HARDWARE FINGERPRINT</span>
                       <span className="text-[10px] font-mono text-security-accent">{hardwareId} (VERIFIED)</span>
                    </div>
                 </div>
                 {error && (
                   <div className="p-3 bg-security-alert/10 border border-security-alert/50 flex items-center gap-2 text-security-alert text-xs font-mono animate-pulse">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                   </div>
                 )}
                 <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full bg-security-text text-black font-mono font-bold py-3 hover:bg-white transition-colors disabled:opacity-50"
                 >
                   {loading ? 'VALIDATING DEVICE...' : 'CONTINUE'}
                 </button>
              </form>
          ) : (
              <form onSubmit={handleMfaSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-mono text-security-dim flex items-center gap-2">
                           <Smartphone className="w-3 h-3" /> MFA AUTHENTICATOR CODE
                        </label>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-security-accent animate-pulse">
                            <RefreshCw className="w-3 h-3" />
                            SYNCED
                        </div>
                    </div>
                    
                    <div className="relative">
                        <input 
                          type="text"
                          value={mfaCode}
                          readOnly
                          className="w-full bg-black border border-security-border text-security-accent p-3 font-mono focus:outline-none text-center text-xl tracking-[0.5em] cursor-default"
                        />
                        <div className="absolute bottom-0 left-0 h-0.5 bg-security-accent transition-all duration-1000 ease-linear" style={{ width: `${(totpCountdown / 30) * 100}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between text-[10px] font-mono text-security-dim">
                        <span>GENERATED FROM MASTER KEY</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {totpCountdown}s</span>
                    </div>
                 </div>
                 
                 {error && (
                   <div className="p-3 bg-security-alert/10 border border-security-alert/50 flex items-center gap-2 text-security-alert text-xs font-mono">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                   </div>
                 )}
                 
                 <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full bg-security-accent text-black font-mono font-bold py-3 hover:bg-security-accent/90 transition-colors disabled:opacity-50"
                 >
                   {loading ? 'VERIFYING TOKEN...' : 'AUTHENTICATE SESSION'}
                 </button>
              </form>
          )}

          <div className="mt-8 pt-4 border-t border-security-border text-center">
             <button 
                onClick={handleReset}
                className="text-[10px] text-security-dim hover:text-security-alert font-mono flex items-center justify-center gap-1 mx-auto transition-colors"
             >
                <Server className="w-3 h-3" /> FACTORY RESET DEVICE
             </button>
          </div>
       </div>
    </div>
  );
};
