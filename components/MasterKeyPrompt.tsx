
import React, { useState } from 'react';
import { Key, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { secureStorage } from '../utils/secureStorage';

interface MasterKeyPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

const STORAGE_KEY = 'keysight_master_hash';

export const MasterKeyPrompt: React.FC<MasterKeyPromptProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  title = "Authentication Required",
  description = "Enter your Master Access Key to proceed with this privileged action."
}) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const storedHash = localStorage.getItem(STORAGE_KEY);
        // Deterministic delay for security
        await new Promise(r => setTimeout(r, 600));

        const inputHash = await secureStorage.sha256(inputKey.trim().toUpperCase());

        if (inputHash === storedHash) {
            setInputKey('');
            onSuccess();
        } else {
            setError('ACCESS DENIED: Invalid Key.');
        }
    } catch (e) {
        setError('Verification Error.');
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-security-panel border border-security-border shadow-2xl p-6 relative rounded-sm">
        <div className="flex flex-col items-center text-center gap-4 mb-6">
          <div className="w-12 h-12 bg-security-black border border-security-accent/50 rounded-full flex items-center justify-center">
             <Lock className="w-6 h-6 text-security-accent" />
          </div>
          <h3 className="text-lg font-mono font-bold text-security-text uppercase">{title}</h3>
          <p className="text-xs font-mono text-security-dim max-w-xs">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-mono text-security-dim uppercase">Master Key</label>
                <div className="relative">
                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-security-dim" />
                    <input 
                        type="password"
                        value={inputKey}
                        onChange={e => setInputKey(e.target.value)}
                        className="w-full bg-black border border-security-border p-2 pl-9 text-xs font-mono text-security-text focus:border-security-accent outline-none"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        autoFocus
                    />
                </div>
            </div>

            {error && (
                <div className="p-2 bg-security-alert/10 border border-security-alert/30 text-security-alert text-[10px] font-mono flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> {error}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 py-2 bg-black border border-security-border text-security-dim hover:text-white text-xs font-mono font-bold"
                >
                    CANCEL
                </button>
                <button 
                    type="submit" 
                    disabled={loading || !inputKey}
                    className="flex-1 py-2 bg-security-accent text-black hover:bg-white text-xs font-mono font-bold flex items-center justify-center gap-2"
                >
                    {loading ? 'VERIFYING...' : 'AUTHORIZE'}
                    {!loading && <ShieldCheck className="w-3 h-3" />}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
