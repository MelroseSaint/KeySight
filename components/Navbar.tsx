
import React from 'react';
import { Shield, Lock, HardDrive, LogOut, Settings, FolderLock, Radio, Activity } from 'lucide-react';
import { APP_NAME } from '../constants';

interface NavbarProps {
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenStorage?: () => void;
  onOpenScanner?: () => void;
  sessionTime: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout, onOpenSettings, onOpenStorage, onOpenScanner, sessionTime }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <nav className="h-14 border-b border-security-border bg-security-black flex justify-between items-center px-4 md:px-6 select-none shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-security-accent" />
        <span className="font-mono font-bold text-lg tracking-wider text-security-text truncate">{APP_NAME}</span>
        <span className="hidden sm:inline-block ml-4 px-2 py-0.5 rounded bg-security-border/50 text-[10px] font-mono text-security-dim uppercase tracking-widest border border-security-border">
          NO-AI / DETERMINISTIC
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2 text-security-dim">
           <HardDrive className="w-4 h-4" />
           <span className="text-xs font-mono">LOCAL_STORAGE: MOUNTED</span>
        </div>
        
        <div className="hidden md:block h-4 w-px bg-security-border"></div>

        <div className="hidden sm:flex items-center gap-2 mr-2">
           <div className={`w-2 h-2 rounded-full ${sessionTime < 60 ? 'bg-security-alert animate-ping' : 'bg-security-accent'}`}></div>
           <span className={`text-xs font-mono ${sessionTime < 60 ? 'text-security-alert' : 'text-security-accent'}`}>
             {formatTime(sessionTime)}
           </span>
        </div>

        <button 
          onClick={onOpenScanner}
          className="p-2 text-security-dim hover:text-white transition-colors flex items-center gap-2 border border-transparent hover:border-security-border rounded"
          title="Network Reconnaissance"
        >
            <Radio className="w-4 h-4" />
            <span className="hidden lg:inline text-xs font-mono">NET_RECON</span>
        </button>

        <button 
          onClick={onOpenStorage}
          className="p-2 text-security-dim hover:text-white transition-colors"
          title="Secure Local Storage"
        >
            <FolderLock className="w-4 h-4" />
        </button>

        <button 
          onClick={onOpenSettings}
          className="p-2 text-security-dim hover:text-white transition-colors"
          title="System Configuration"
        >
            <Settings className="w-4 h-4" />
        </button>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-security-panel border border-security-border hover:bg-security-alert/20 hover:border-security-alert text-xs font-mono transition-all rounded-sm text-security-text touch-manipulation ml-2"
        >
          <LogOut className="w-3 h-3" />
          <span className="hidden sm:inline">SECURE_EXIT</span>
          <span className="sm:hidden">EXIT</span>
        </button>
      </div>
    </nav>
  );
};
