
import React, { useState } from 'react';
import { Save, Disc, FileVideo } from 'lucide-react';

interface SaveRecordingModalProps {
  isOpen: boolean;
  onSave: (title: string) => void;
  onDiscard: () => void;
  defaultTitle?: string;
  duration?: string;
}

export const SaveRecordingModal: React.FC<SaveRecordingModalProps> = ({ 
  isOpen, 
  onSave, 
  onDiscard,
  defaultTitle = '',
  duration = '0s'
}) => {
  const [title, setTitle] = useState(defaultTitle);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="max-w-md w-full bg-security-panel border border-security-border shadow-2xl p-6 rounded-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-security-border pb-4">
            <div className="w-10 h-10 bg-security-accent/10 border border-security-accent rounded-full flex items-center justify-center">
                <Disc className="w-5 h-5 text-security-accent animate-pulse" />
            </div>
            <div>
                <h3 className="text-lg font-mono font-bold text-security-text uppercase">Recording Complete</h3>
                <p className="text-xs font-mono text-security-dim">Duration: {duration}</p>
            </div>
        </div>

        <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-mono text-security-dim uppercase">Evidence Title / Label</label>
                <div className="relative">
                    <FileVideo className="absolute left-3 top-2.5 w-4 h-4 text-security-dim" />
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-black border border-security-border p-2 pl-9 text-xs font-mono text-security-text focus:border-security-accent outline-none"
                        placeholder="e.g., Suspicious activity at Gate 1"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSave(title || defaultTitle);
                        }}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button 
                    onClick={onDiscard}
                    className="flex-1 py-3 bg-black border border-security-border text-security-dim hover:text-security-alert hover:border-security-alert text-xs font-mono font-bold transition-colors"
                >
                    DISCARD
                </button>
                <button 
                    onClick={() => onSave(title || defaultTitle)}
                    className="flex-1 py-3 bg-security-accent text-black hover:bg-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <Save className="w-3 h-3" /> SAVE TO STORAGE
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
