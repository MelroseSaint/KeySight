
import React, { useState, useEffect } from 'react';
import { secureStorage } from '../utils/secureStorage';
import { MasterKeyPrompt } from './MasterKeyPrompt';
import { ArrowLeft, Download, FileJson, Image, Film, Search, Filter, ShieldCheck, Clock, CheckSquare, Square, Package, Lock, Share2, Trash2, Link, Copy, ExternalLink, X, Check, Unlock, Loader2, FileCode, CheckCircle, Archive, Video } from 'lucide-react';
import JSZip from 'jszip';

interface StorageBrowserProps {
  onBack: () => void;
}

interface StorageItem {
  _blockIndex: number;
  _blockHash: string;
  _timestamp: number;
  type: string;
  description?: string;
  data?: string; 
  cameraId?: string;
  location?: string;
  locked?: boolean;
  metadata?: {
      mimeType?: string;
      size?: number;
      duration?: string;
  };
  [key: string]: any;
}

interface RenderItemCardProps {
    item: StorageItem;
    isSelected: boolean;
    onToggle: (index: number) => void;
    onInspect: (item: StorageItem) => void;
}

const RenderItemCard: React.FC<RenderItemCardProps> = ({ item, isSelected, onToggle, onInspect }) => {
    const isImage = item.type === 'EVIDENCE_SNAPSHOT';
    const isVideo = item.type === 'VIDEO_CLIP';
    const isLocked = item.locked;
    
    // Format detection
    let formatLabel = '';
    if (isVideo) {
        if (item.metadata?.mimeType?.includes('mp4')) formatLabel = 'MP4';
        else if (item.metadata?.mimeType?.includes('webm')) formatLabel = 'WEBM';
        else formatLabel = 'MOV';
    }

    return (
        <div 
          onClick={() => onToggle(item._blockIndex)}
          className={`bg-security-panel border cursor-pointer hover:border-security-accent transition-all group flex flex-col h-48 relative overflow-hidden ${isSelected ? 'border-security-accent ring-1 ring-security-accent' : 'border-security-border'} ${isLocked ? 'border-security-warn/30' : ''}`}
        >
          {/* Indicators */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
              {isVideo && formatLabel && (
                  <span className="text-[8px] font-mono font-bold bg-black/80 text-security-accent px-1.5 py-0.5 rounded border border-security-accent/30">{formatLabel}</span>
              )}
              {isSelected ? <CheckSquare className="w-5 h-5 text-security-accent bg-black" /> : <Square className="w-5 h-5 text-security-dim bg-black/50" />}
          </div>

          {/* Header */}
          <div className={`p-1.5 border-b flex justify-between items-center text-[9px] font-mono ${isLocked ? 'bg-security-warn/10 border-security-warn/30 text-security-warn' : 'bg-black/40 border-security-border/50 text-security-dim'}`}>
              <span className="truncate">{item.type}</span>
              <span>{new Date(item._timestamp).toLocaleTimeString()}</span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative bg-black flex items-center justify-center">
              {(isImage || isVideo) && item.data ? (
                  <>
                      {/* Media Container with Blur if Locked */}
                      <div className={`w-full h-full flex items-center justify-center relative ${isLocked ? 'filter blur-xl opacity-50 scale-110' : ''} transition-all duration-500`}>
                          
                          {/* Video Preview */}
                          {isVideo && (
                              <video 
                                src={item.data}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                muted
                                playsInline
                                loop
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0;
                                }}
                              />
                          )}

                          {/* Image Preview */}
                          {isImage && <img src={item.data} alt="Evidence" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                          
                          {/* Type Overlay Icon */}
                          {isVideo && <Film className="w-8 h-8 text-security-accent absolute z-10 opacity-50 group-hover:opacity-0 transition-opacity duration-300 drop-shadow-md" />}
                      </div>
                      
                      {/* Lock Overlay */}
                      {isLocked && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                              <Lock className="w-8 h-8 text-security-warn mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" />
                              <span className="text-[10px] font-mono text-black bg-security-warn px-2 py-0.5 rounded font-bold shadow-lg">EVIDENCE LOCKED</span>
                          </div>
                      )}
                  </>
              ) : (
                  <div className={`p-3 text-[10px] font-mono text-security-dim break-all h-full w-full overflow-hidden ${isLocked ? 'blur-[3px] opacity-60' : ''}`}>
                      {item.description}
                  </div>
              )}
              
              {/* Inspect Button - Conditional */}
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2" onClick={e => e.stopPropagation()}>
                      {!isLocked ? (
                          <button 
                          onClick={(e) => { e.stopPropagation(); onInspect(item); }}
                          className="px-3 py-1 bg-white text-black text-xs font-mono font-bold hover:bg-security-accent transition-colors"
                          >
                          INSPECT
                          </button>
                      ) : (
                          <div className="text-[10px] font-mono text-security-warn flex flex-col items-center gap-1 border border-security-warn/50 p-2 rounded bg-black/90">
                              <Lock className="w-4 h-4" />
                              <span>REQUIRES UNLOCK</span>
                          </div>
                      )}
              </div>
          </div>
          
          {/* Footer */}
          <div className="p-1 border-t border-security-border/50 bg-black/40 text-[9px] font-mono text-security-dim truncate">
              {item.cameraId || item._blockHash.substring(0,8)}
          </div>
        </div>
    );
};

export const StorageBrowser: React.FC<StorageBrowserProps> = ({ onBack }) => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'VIDEO' | 'PHOTO' | 'LOGS'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'24H' | '7D' | 'ALL'>('24H');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Auth Prompts
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Slight delay to simulate decryption load
    setTimeout(async () => {
        const all = await secureStorage.getAllItems();
        setItems(all);
        setLoading(false);
    }, 500);
  };

  const filteredItems = items.filter(item => {
      // 1. Text Search
      const matchesSearch = 
        (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
        (item.type && item.type.toLowerCase().includes(search.toLowerCase())) ||
        (item.cameraId && item.cameraId.toLowerCase().includes(search.toLowerCase()));
      
      // 2. Type Filter
      const matchesType = 
        filterType === 'ALL' ||
        (filterType === 'VIDEO' && item.type === 'VIDEO_CLIP') ||
        (filterType === 'PHOTO' && item.type === 'EVIDENCE_SNAPSHOT') ||
        (filterType === 'LOGS' && item.type !== 'EVIDENCE_SNAPSHOT' && item.type !== 'VIDEO_CLIP');

      // 3. Time Filter
      let matchesTime = true;
      const now = Date.now();
      if (timeFilter === '24H') {
          matchesTime = (now - item._timestamp) < 24 * 60 * 60 * 1000;
      } else if (timeFilter === '7D') {
          matchesTime = (now - item._timestamp) < 7 * 24 * 60 * 60 * 1000;
      }

      return matchesSearch && matchesType && matchesTime;
  });

  const lockedItems = filteredItems.filter(i => i.locked);
  const standardItems = filteredItems.filter(i => !i.locked);

  const toggleSelect = (index: number) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
      });
  };

  const toggleSelectAll = (subset: StorageItem[]) => {
      const subsetIds = subset.map(i => i._blockIndex);
      const allSelected = subsetIds.every(id => selectedIds.has(id));
      setSelectedIds(prev => {
          const next = new Set(prev);
          subsetIds.forEach(id => {
              if (allSelected) next.delete(id);
              else next.add(id);
          });
          return next;
      });
  };

  // --- ACTIONS ---

  const handleLock = async () => {
      if (selectedIds.size === 0) return;
      setIsProcessing(true);
      setProcessingStatus('MOVING TO EVIDENCE VAULT...');
      
      const idsToLock = Array.from(selectedIds);
      const itemsToLock = items.filter(i => idsToLock.includes(i._blockIndex) && !i.locked);

      for (const item of itemsToLock) {
          await secureStorage.lockItem(item._blockIndex, 'admin_user');
      }
      
      await loadData();
      setIsProcessing(false);
      setSelectedIds(new Set());
      setProcessingStatus('');
  };

  const handleUnlockSuccess = async () => {
      setShowUnlockPrompt(false);
      setIsProcessing(true);
      setProcessingStatus('DECRYPTING & UNLOCKING...');

      const idsToUnlock = Array.from(selectedIds);
      const itemsToUnlock = items.filter(i => idsToUnlock.includes(i._blockIndex) && i.locked);

      for (const item of itemsToUnlock) {
          await secureStorage.unlockItem(item._blockIndex, 'admin_user');
      }

      await loadData();
      setIsProcessing(false);
      setSelectedIds(new Set());
      setProcessingStatus('');
  };

  const requestUnlock = () => {
      if (selectedIds.size === 0) return;
      const hasLocked = items.some(i => selectedIds.has(i._blockIndex) && i.locked);
      if (!hasLocked) {
          alert("No locked evidence selected.");
          return;
      }
      setShowUnlockPrompt(true);
  };

  const handleDelete = async () => {
      if (selectedIds.size === 0) return;
      
      const lockedSelected = items.filter(i => selectedIds.has(i._blockIndex) && i.locked);
      if (lockedSelected.length > 0) {
          alert(`ERROR: ${lockedSelected.length} items are LOCKED as evidence and cannot be deleted. Unlock them first.`);
          return;
      }

      if (!confirm(`Are you sure you want to delete ${selectedIds.size} items? This action will be logged.`)) return;

      setIsProcessing(true);
      setProcessingStatus('REMOVING & LOGGING...');
      
      const idsToDelete = Array.from(selectedIds);
      for (const id of idsToDelete) {
          await secureStorage.deleteItem(id as number, 'admin_user');
      }

      await loadData();
      setIsProcessing(false);
      setSelectedIds(new Set());
      setProcessingStatus('');
  };

  // --- SHARE / EXPORT LOGIC ---

  const handleShare = () => {
      if (selectedIds.size === 0) return;
      setShareUrl(''); // Reset url
      setShowShareModal(true);
  };

  // Reusable HTML Generator for both Download and Link
  const generateHtmlExportString = (selectedItems: StorageItem[]) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KeySight Secure Evidence Export</title>
    <style>
        body { background-color: #0a0a0a; color: #e5e5e5; font-family: 'Courier New', monospace; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 1px solid #333; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #00ff41; font-weight: bold; font-size: 24px; }
        .meta { font-size: 12px; color: #888; }
        .item { background: #111; border: 1px solid #333; margin-bottom: 20px; overflow: hidden; border-radius: 4px; }
        .item-header { background: #1a1a1a; padding: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; font-size: 11px; color: #888; }
        .item-content { padding: 15px; display: flex; justify-content: center; }
        img, video { max-width: 100%; border: 1px solid #333; }
        .text-content { padding: 10px; white-space: pre-wrap; word-break: break-all; font-size: 12px; }
        .footer { text-align: center; font-size: 10px; color: #444; margin-top: 50px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">KEYSIGHT SECURITY</div>
            <div class="meta">SECURE EVIDENCE EXPORT</div>
        </div>
        <div class="meta">
            GENERATED: ${new Date().toISOString()}<br/>
            ITEMS: ${selectedItems.length}
        </div>
    </div>

    ${selectedItems.map(item => `
        <div class="item">
            <div class="item-header">
                <span>TYPE: ${item.type}</span>
                <span>TIME: ${new Date(item._timestamp).toLocaleString()}</span>
                <span>ID: ${item._blockHash.substring(0, 8)}</span>
            </div>
            <div class="item-content">
                ${item.data ? (
                    item.type === 'VIDEO_CLIP' 
                    ? `<video controls src="${item.data}"></video>`
                    : `<img src="${item.data}" alt="Evidence" />`
                ) : `<div class="text-content">${item.description}</div>`}
            </div>
             ${item.cameraId ? `<div style="padding: 0 15px 15px; font-size: 10px; color: #666;">SOURCE: ${item.cameraId} | ${item.location || 'Unknown'}</div>` : ''}
        </div>
    `).join('')}

    <div class="footer">
        Generated by KeySight Deterministic Security Platform.<br/>
        Integrity of this document is not guaranteed if modified.
    </div>
</body>
</html>`;
  };

  const executeDownloadHtml = async () => {
      setIsProcessing(true);
      setProcessingStatus('GENERATING SECURE HTML PACKAGE...');
      await new Promise(r => setTimeout(r, 500));

      const selected = items.filter(i => selectedIds.has(i._blockIndex));
      const htmlContent = generateHtmlExportString(selected);

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KeySight_Evidence_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setIsProcessing(false);
      setProcessingStatus('');
      setShowShareModal(false);
  };

  const executeDownloadZip = async () => {
    setIsProcessing(true);
    setProcessingStatus('PACKAGING ZIP ARCHIVE...');
    
    try {
        const selected = items.filter(i => selectedIds.has(i._blockIndex));
        const zip = new JSZip();
        
        // Create Evidence folder
        const evidenceFolder = zip.folder("evidence");
        
        // Add items
        selected.forEach((item) => {
            try {
                const safeId = item._blockHash.substring(0, 8);
                const timestamp = new Date(item._timestamp).toISOString().replace(/[:.]/g, '-');
                
                if (item.data && (item.type === 'EVIDENCE_SNAPSHOT' || item.type === 'VIDEO_CLIP')) {
                    // Robust Base64 extraction
                    let base64Data = item.data;
                    
                    // If it contains the comma separator (Standard Data URI)
                    if (item.data.includes(',')) {
                        base64Data = item.data.split(',')[1];
                    }
                    
                    // Clean whitespace and line breaks
                    base64Data = base64Data.replace(/[\s\r\n]+/g, '');

                    // Ensure padding is correct for base64
                    while (base64Data.length % 4 !== 0) {
                        base64Data += '=';
                    }

                    // VALIDATION STEP
                    try {
                        window.atob(base64Data);
                    } catch (e) {
                        console.warn(`Skipping item ${item._blockIndex} (Corrupt Base64)`, e);
                        return; // Skip this item
                    }

                    // Dynamic extension based on mimeType in metadata, fallback to WebM
                    let ext = 'bin';
                    if (item.type === 'EVIDENCE_SNAPSHOT') ext = 'jpg';
                    else if (item.type === 'VIDEO_CLIP') {
                        if (item.metadata?.mimeType?.includes('mp4')) ext = 'mp4';
                        else ext = 'webm';
                    }
                    
                    if (base64Data) {
                         // Pass {base64: true} to tell JSZip this is base64 content
                        evidenceFolder?.file(`${timestamp}_${safeId}.${ext}`, base64Data, {base64: true});
                    }
                } else {
                    // Log files / Text Data
                    evidenceFolder?.file(`${timestamp}_${safeId}.txt`, JSON.stringify(item, null, 2));
                }
            } catch (err) {
                console.error(`Skipping invalid item ${item._blockIndex} during ZIP generation`, err);
            }
        });

        // Add Manifest
        zip.file("manifest.json", JSON.stringify({
            exportedAt: new Date().toISOString(),
            totalItems: selected.length,
            system: "KeySight Security Platform",
            items: selected.map(i => ({
                id: i._blockHash,
                type: i.type,
                timestamp: i._timestamp,
                locked: i.locked,
                metadata: i.metadata
            }))
        }, null, 2));

        // Generate Blob
        const content = await zip.generateAsync({type: "blob"});
        
        // Trigger Download
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KeySight_Archive_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Zip generation failed", e);
        alert("Failed to create ZIP archive. One or more files may be corrupted. Check console.");
    } finally {
        setIsProcessing(false);
        setProcessingStatus('');
        setShowShareModal(false);
    }
  };

  const executeGenerateLink = async () => {
      setIsProcessing(true);
      setProcessingStatus('GENERATING PLAYABLE LINK...');
      await new Promise(r => setTimeout(r, 500));
      
      const selected = items.filter(i => selectedIds.has(i._blockIndex));
      
      // Use HTML format for playable links
      const htmlContent = generateHtmlExportString(selected);
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setShareUrl(url);
      
      setIsProcessing(false);
      setProcessingStatus('');
  };


  return (
    <div className="h-full bg-black flex flex-col text-security-text font-sans relative">
        {/* Modals */}
        <MasterKeyPrompt 
            isOpen={showUnlockPrompt}
            onClose={() => setShowUnlockPrompt(false)}
            onSuccess={handleUnlockSuccess}
            title="EVIDENCE VAULT ACCESS"
            description="Modifying locked evidence requires strict Master Key validation."
        />

        {/* PROCESSING OVERLAY */}
        {isProcessing && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                <Loader2 className="w-12 h-12 text-security-accent animate-spin mb-4" />
                <div className="text-sm font-mono font-bold text-security-accent animate-pulse">{processingStatus}</div>
            </div>
        )}

        {/* SHARE MODAL */}
        {showShareModal && (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-security-panel border border-security-border shadow-2xl p-6 relative rounded-sm animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                             <Share2 className="w-5 h-5 text-security-accent" />
                             <h3 className="text-sm font-mono font-bold text-security-text uppercase">Export Evidence</h3>
                        </div>
                        <button onClick={() => setShowShareModal(false)} className="text-security-dim hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <p className="text-xs font-mono text-security-dim mb-6">
                        You have selected <span className="text-security-accent font-bold">{selectedIds.size}</span> items. 
                        Choose an export method below.
                    </p>

                    {!shareUrl ? (
                        <div className="space-y-3">
                            <button 
                                onClick={executeDownloadHtml}
                                className="w-full p-4 bg-black border border-security-border hover:border-security-accent hover:bg-security-accent/5 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-security-panel border border-security-border flex items-center justify-center group-hover:border-security-accent">
                                        <FileCode className="w-5 h-5 text-security-text group-hover:text-security-accent" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-mono font-bold text-security-text group-hover:text-security-accent">DOWNLOAD SECURE HTML</div>
                                        <div className="text-[9px] font-mono text-security-dim">Standalone viewer file with embedded media</div>
                                    </div>
                                </div>
                                <ArrowLeft className="w-4 h-4 rotate-180 text-security-dim group-hover:text-security-accent" />
                            </button>

                            <button 
                                onClick={executeDownloadZip}
                                className="w-full p-4 bg-black border border-security-border hover:border-security-accent hover:bg-security-accent/5 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-security-panel border border-security-border flex items-center justify-center group-hover:border-security-accent">
                                        <Archive className="w-5 h-5 text-security-text group-hover:text-security-accent" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-mono font-bold text-security-text group-hover:text-security-accent">DOWNLOAD ZIP ARCHIVE</div>
                                        <div className="text-[9px] font-mono text-security-dim">Raw media files + JSON manifest</div>
                                    </div>
                                </div>
                                <ArrowLeft className="w-4 h-4 rotate-180 text-security-dim group-hover:text-security-accent" />
                            </button>

                            <button 
                                onClick={executeGenerateLink}
                                className="w-full p-4 bg-black border border-security-border hover:border-security-accent hover:bg-security-accent/5 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-security-panel border border-security-border flex items-center justify-center group-hover:border-security-accent">
                                        <Link className="w-5 h-5 text-security-text group-hover:text-security-accent" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-mono font-bold text-security-text group-hover:text-security-accent">GENERATE SHARE LINK</div>
                                        <div className="text-[9px] font-mono text-security-dim">Create temporary link to view/play evidence in browser</div>
                                    </div>
                                </div>
                                <ArrowLeft className="w-4 h-4 rotate-180 text-security-dim group-hover:text-security-accent" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="p-3 bg-security-accent/10 border border-security-accent/30 rounded flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-security-accent" />
                                <span className="text-xs font-mono text-security-accent">Link Generated Successfully</span>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-security-dim uppercase">Temporary Resource Link</label>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={shareUrl} 
                                        className="flex-1 bg-black border border-security-border p-2 text-xs font-mono text-security-text outline-none focus:border-security-accent"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(shareUrl);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="px-3 bg-security-panel border border-security-border hover:bg-white/10 transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-security-accent" /> : <Copy className="w-4 h-4 text-security-dim" />}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <a 
                                    href={shareUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex-1 py-2 bg-security-accent text-black text-xs font-mono font-bold flex items-center justify-center gap-2 hover:bg-white transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" /> OPEN IN BROWSER
                                </a>
                                <button 
                                    onClick={() => setShareUrl('')}
                                    className="flex-1 py-2 bg-black border border-security-border text-security-dim text-xs font-mono font-bold hover:text-white transition-colors"
                                >
                                    BACK
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {/* Header */}
        <div className="h-14 border-b border-security-border flex items-center justify-between px-4 bg-security-panel shrink-0">
             <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-security-dim" />
                </button>
                <div>
                    <h1 className="text-lg font-mono font-bold uppercase tracking-wider">Secure Storage Browser</h1>
                    <div className="text-[10px] font-mono text-security-dim flex items-center gap-2">
                        <Lock className="w-3 h-3 text-security-accent" />
                        <span>SESSION: AUTHENTICATED</span>
                    </div>
                </div>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-2">
                 <div className="flex bg-black border border-security-border rounded p-1 gap-1">
                     <button onClick={handleShare} disabled={selectedIds.size === 0} className="p-2 text-security-dim hover:text-white disabled:opacity-30 rounded" title="Share"><Share2 className="w-4 h-4"/></button>
                     <button onClick={handleDelete} disabled={selectedIds.size === 0} className="p-2 text-security-dim hover:text-security-alert disabled:opacity-30 rounded" title="Delete"><Trash2 className="w-4 h-4"/></button>
                 </div>
            </div>
        </div>

        {/* Filters Bar */}
        <div className="p-3 bg-black border-b border-security-border flex justify-between items-center gap-4 shrink-0 overflow-x-auto">
             <div className="flex items-center gap-2 bg-security-panel border border-security-border p-1 rounded-sm">
                 <Search className="w-4 h-4 text-security-dim ml-2" />
                 <input 
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search hash, ID..." 
                    className="bg-transparent border-none text-xs font-mono text-white focus:outline-none w-32 md:w-64"
                 />
             </div>
             
             <div className="flex items-center gap-4">
                {/* Time Filter */}
                <div className="flex items-center bg-black border border-security-border rounded-sm">
                    {['24H', '7D', 'ALL'].map(time => (
                        <button 
                            key={time}
                            onClick={() => setTimeFilter(time as any)} 
                            className={`px-2 py-1 text-[9px] font-mono font-bold ${timeFilter === time ? 'bg-white text-black' : 'text-security-dim hover:text-white'}`}
                        >
                            {time}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    {[
                        { id: 'ALL', label: 'ALL' },
                        { id: 'VIDEO', label: 'VIDEO', icon: Video },
                        { id: 'PHOTO', label: 'PHOTO', icon: Image },
                        { id: 'LOGS', label: 'LOGS', icon: FileJson }
                    ].map(type => (
                        <button 
                            key={type.id}
                            onClick={() => setFilterType(type.id as any)} 
                            className={`px-3 py-1 text-[10px] font-mono font-bold border flex items-center gap-2 ${filterType === type.id ? 'bg-security-accent text-black border-security-accent' : 'border-security-border text-security-dim'}`}
                        >
                            {type.icon && <type.icon className="w-3 h-3" />}
                            {type.label}
                        </button>
                    ))}
                </div>
             </div>
        </div>

        {/* SPLIT VIEW CONTENT */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: General Storage */}
            <div className="flex-1 flex flex-col border-r border-security-border bg-black/50 min-w-[300px]">
                <div className="p-3 border-b border-security-border bg-security-panel/30 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-security-dim" />
                        <h3 className="text-xs font-mono font-bold text-security-text">GENERAL STORAGE</h3>
                        <span className="text-[10px] bg-security-border px-1 rounded text-security-dim">{standardItems.length}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => toggleSelectAll(standardItems)} className="text-[10px] font-mono text-security-dim hover:text-white">SELECT ALL</button>
                        <button onClick={handleLock} disabled={selectedIds.size === 0} className="flex items-center gap-1 px-2 py-1 bg-security-panel border border-security-border hover:border-security-accent text-security-text text-[10px] font-mono transition-colors disabled:opacity-50">
                            <Lock className="w-3 h-3" /> LOCK
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {standardItems.map(item => (
                            <RenderItemCard 
                                key={item._blockIndex} 
                                item={item} 
                                isSelected={selectedIds.has(item._blockIndex)}
                                onToggle={toggleSelect}
                                onInspect={setSelectedItem}
                            />
                        ))}
                        {standardItems.length === 0 && <div className="col-span-full text-center text-[10px] font-mono text-security-dim py-10 opacity-50">NO ITEMS FOUND ({timeFilter})</div>}
                    </div>
                </div>
            </div>

            {/* RIGHT: Locked Evidence Vault */}
            <div className="w-[40%] flex flex-col bg-security-black/80 border-l-4 border-security-warn/10 min-w-[300px]">
                <div className="p-3 border-b border-security-border bg-security-warn/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-security-warn" />
                        <h3 className="text-xs font-mono font-bold text-security-warn">EVIDENCE VAULT</h3>
                        <span className="text-[10px] bg-security-warn/20 text-security-warn px-1 rounded">{lockedItems.length}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => toggleSelectAll(lockedItems)} className="text-[10px] font-mono text-security-dim hover:text-white">SELECT ALL</button>
                        <button onClick={requestUnlock} disabled={selectedIds.size === 0} className="flex items-center gap-1 px-2 py-1 bg-security-warn/10 border border-security-warn/30 hover:bg-security-warn hover:text-black text-security-warn text-[10px] font-mono transition-colors disabled:opacity-50">
                            <Unlock className="w-3 h-3" /> UNLOCK
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMTEwMDEwIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxYTFhMWEiPjwvcmVjdD4KPC9zdmc+')]">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {lockedItems.map(item => (
                            <RenderItemCard 
                                key={item._blockIndex} 
                                item={item} 
                                isSelected={selectedIds.has(item._blockIndex)}
                                onToggle={toggleSelect}
                                onInspect={setSelectedItem}
                            />
                        ))}
                        {lockedItems.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-10 opacity-50 text-security-dim gap-2">
                                <ShieldCheck className="w-8 h-8 opacity-20" />
                                <span className="text-[10px] font-mono">VAULT EMPTY</span>
                            </div>
                        )}
                     </div>
                </div>
            </div>

        </div>

        {/* Item Inspector Modal (Simplified) */}
        {selectedItem && (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                <div className="max-w-4xl w-full bg-security-panel border border-security-border shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-security-border bg-black">
                        <h3 className="text-sm font-mono font-bold text-security-text">INSPECTOR</h3>
                        <button onClick={() => setSelectedItem(null)}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-4 overflow-y-auto">
                        <pre className="text-xs text-security-dim font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedItem, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
