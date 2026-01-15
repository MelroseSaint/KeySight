
import React, { useState, useEffect } from 'react';
import { secureStorage } from '../utils/secureStorage';
import { ArrowLeft, Download, FileJson, Image, Film, Search, Filter, ShieldCheck, Clock, CheckSquare, Square, Package, Lock, Share2, Trash2, Link } from 'lucide-react';
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
  [key: string]: any;
}

export const StorageBrowser: React.FC<StorageBrowserProps> = ({ onBack }) => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'MEDIA' | 'LOGS'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

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
      const matchesSearch = 
        (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
        (item.type && item.type.toLowerCase().includes(search.toLowerCase())) ||
        (item.cameraId && item.cameraId.toLowerCase().includes(search.toLowerCase()));
      
      const matchesType = 
        filterType === 'ALL' ||
        (filterType === 'MEDIA' && (item.type === 'EVIDENCE_SNAPSHOT' || item.type === 'EVIDENCE_SIMULATION' || item.type === 'VIDEO_CLIP')) ||
        (filterType === 'LOGS' && item.type !== 'EVIDENCE_SNAPSHOT' && item.type !== 'EVIDENCE_SIMULATION' && item.type !== 'VIDEO_CLIP');

      return matchesSearch && matchesType;
  });

  const toggleSelect = (index: number) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
      });
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredItems.map(i => i._blockIndex)));
      }
  };

  // --- ACTIONS ---

  const handleLock = async () => {
      if (selectedIds.size === 0) return;
      setIsProcessing(true);
      setProcessingStatus('APPLYING IMMUTABLE LOCK...');
      
      const idsToLock = Array.from(selectedIds);
      for (const id of idsToLock) {
          await secureStorage.lockItem(id as number, 'admin_user');
      }
      
      await loadData();
      setIsProcessing(false);
      setSelectedIds(new Set());
      setProcessingStatus('');
  };

  const handleDelete = async () => {
      if (selectedIds.size === 0) return;
      
      const lockedItems = items.filter(i => selectedIds.has(i._blockIndex) && i.locked);
      if (lockedItems.length > 0) {
          alert(`ERROR: ${lockedItems.length} items are LOCKED as evidence and cannot be deleted.`);
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

  const handleShare = async () => {
      if (selectedIds.size === 0) return;
      setIsProcessing(true);
      setProcessingStatus('GENERATING SECURE LINK...');
      
      // Simulate link generation delay
      await new Promise(r => setTimeout(r, 1000));
      
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const url = `https://keysight-secure.io/share/${token}?exp=${Date.now() + 3600000}`;
      
      // Log the share event
      await secureStorage.append({
          type: 'SHARE_LINK',
          targetCount: selectedIds.size,
          tokenHash: await secureStorage.sha256(token),
          expiration: Date.now() + 3600000,
          description: 'Secure temporary link generated'
      });

      setIsProcessing(false);
      alert(`SECURE LINK GENERATED (Expires 1h):\n${url}\n\n(Copied to clipboard)`);
      navigator.clipboard.writeText(url);
      setProcessingStatus('');
      await loadData(); // Refresh logs
  };

  const handleBatchExport = async () => {
      if (selectedIds.size === 0) return;
      setIsProcessing(true);
      setProcessingStatus('BUILDING SIGNED MANIFEST...');

      const zip = new JSZip();
      const footageFolder = zip.folder("footage");
      const photosFolder = zip.folder("photos");
      const manifestList: any[] = [];

      const exportItems = items.filter(i => selectedIds.has(i._blockIndex));

      // 1. Process Files
      for (const item of exportItems) {
          const entry = {
              id: item.id || `block_${item._blockIndex}`,
              timestamp: new Date(item._timestamp).toISOString(),
              type: item.type,
              cameraId: item.cameraId || 'system',
              location: item.location || 'unknown',
              description: item.description,
              originalHash: item._blockHash,
              fileChecksum: '',
              locked: !!item.locked
          };

          if (item.data) {
              const base64Data = item.data.split(',')[1];
              const dateStr = new Date(item._timestamp).toISOString().replace(/[:.]/g, '-');
              const fileName = `${item.cameraId || 'sys'}_${dateStr}`;
              
              // Calculate checksum of the file content itself
              entry.fileChecksum = await secureStorage.sha256(base64Data);

              if (item.type === 'VIDEO_CLIP') {
                  footageFolder?.file(`${fileName}.webm`, base64Data, {base64: true});
                  entry['fileName'] = `${fileName}.webm`;
              } else if (item.type === 'EVIDENCE_SNAPSHOT' || item.type === 'EVIDENCE_SIMULATION') {
                  photosFolder?.file(`${fileName}.jpg`, base64Data, {base64: true});
                  entry['fileName'] = `${fileName}.jpg`;
              }
          }
          manifestList.push(entry);
      }

      // 2. Generate Manifest
      const manifestJson = JSON.stringify({
          exportTimestamp: new Date().toISOString(),
          exportedBy: 'admin_user',
          deviceFingerprint: localStorage.getItem('keysight_device_bind') || 'UNKNOWN',
          items: manifestList,
          integritySignature: await secureStorage.sha256(JSON.stringify(manifestList)) // Simulate digital signature
      }, null, 2);

      zip.file("manifest.json", manifestJson);
      
      // 3. Generate Zip
      try {
          const content = await zip.generateAsync({type: "blob"});
          const url = URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.download = `keysight_export_${Date.now()}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Log Export
          await secureStorage.append({
             type: 'EXPORT',
             count: exportItems.length,
             description: 'Batch export with signed manifest'
          });
          
      } catch (err) {
          console.error("Export failed", err);
          alert("Failed to generate export package.");
      } finally {
          setIsProcessing(false);
          setProcessingStatus('');
          setSelectedIds(new Set());
          await loadData();
      }
  };

  return (
    <div className="h-full bg-black flex flex-col text-security-text font-sans relative">
        {/* Processing Overlay */}
        {isProcessing && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-security-accent border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm font-mono text-security-accent animate-pulse">{processingStatus}</div>
            </div>
        )}

        {/* Header */}
        <div className="h-16 border-b border-security-border flex items-center justify-between px-4 bg-security-panel">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-security-dim" />
                </button>
                <div>
                    <h1 className="text-lg font-mono font-bold uppercase tracking-wider">Secure Local Storage</h1>
                    <div className="text-[10px] font-mono text-security-dim flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" />
                        <span>ENCRYPTED (AES-256)</span>
                        <span className="text-security-border">|</span>
                        <span>{items.length} RECORDS</span>
                    </div>
                </div>
            </div>
            
            {/* Action Bar */}
            <div className="flex items-center gap-2">
                 {selectedIds.size > 0 && (
                     <span className="text-xs font-mono text-security-dim mr-2 border-r border-security-border pr-4 hidden sm:inline">
                         {selectedIds.size} SELECTED
                     </span>
                 )}
                 
                 <div className="flex bg-black border border-security-border rounded p-1 gap-1">
                     <button 
                       onClick={handleShare}
                       disabled={selectedIds.size === 0}
                       className="p-2 text-security-dim hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded transition-colors"
                       title="Generate Secure Share Link"
                     >
                         <Link className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={handleLock}
                       disabled={selectedIds.size === 0}
                       className="p-2 text-security-dim hover:text-security-accent disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded transition-colors"
                       title="Lock as Evidence"
                     >
                         <Lock className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={handleDelete}
                       disabled={selectedIds.size === 0}
                       className="p-2 text-security-dim hover:text-security-alert disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded transition-colors"
                       title="Delete Selected"
                     >
                         <Trash2 className="w-4 h-4" />
                     </button>
                 </div>

                 <button 
                   onClick={handleBatchExport}
                   disabled={selectedIds.size === 0}
                   className="flex items-center gap-2 px-4 py-2 bg-security-text text-black text-xs font-mono font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                 >
                     <Download className="w-4 h-4" />
                     EXPORT
                 </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar / Filters */}
            <div className="w-64 bg-black border-r border-security-border p-4 flex flex-col gap-6 hidden md:flex">
                 <div className="space-y-2">
                     <label className="text-xs font-mono text-security-dim uppercase font-bold">Search</label>
                     <div className="relative">
                         <Search className="absolute left-3 top-2.5 w-4 h-4 text-security-dim" />
                         <input 
                           type="text" 
                           placeholder="Hash, ID, Type..." 
                           value={search}
                           onChange={e => setSearch(e.target.value)}
                           className="w-full bg-security-panel border border-security-border p-2 pl-9 text-xs font-mono focus:border-security-accent outline-none"
                         />
                     </div>
                 </div>

                 <div className="space-y-2">
                     <label className="text-xs font-mono text-security-dim uppercase font-bold">Filter By Type</label>
                     <div className="flex flex-col gap-1">
                         <button 
                           onClick={() => setFilterType('ALL')}
                           className={`p-2 text-left text-xs font-mono flex items-center gap-2 transition-colors border ${filterType === 'ALL' ? 'bg-security-accent/10 border-security-accent text-security-accent' : 'border-transparent hover:bg-white/5 text-security-dim'}`}
                         >
                             <Filter className="w-3 h-3" /> ALL RECORDS
                         </button>
                         <button 
                           onClick={() => setFilterType('MEDIA')}
                           className={`p-2 text-left text-xs font-mono flex items-center gap-2 transition-colors border ${filterType === 'MEDIA' ? 'bg-security-accent/10 border-security-accent text-security-accent' : 'border-transparent hover:bg-white/5 text-security-dim'}`}
                         >
                             <Image className="w-3 h-3" /> EVIDENCE (MEDIA)
                         </button>
                         <button 
                           onClick={() => setFilterType('LOGS')}
                           className={`p-2 text-left text-xs font-mono flex items-center gap-2 transition-colors border ${filterType === 'LOGS' ? 'bg-security-accent/10 border-security-accent text-security-accent' : 'border-transparent hover:bg-white/5 text-security-dim'}`}
                         >
                             <FileJson className="w-3 h-3" /> AUDIT LOGS
                         </button>
                     </div>
                 </div>
                 
                 <div className="mt-auto p-4 bg-security-panel border border-security-border text-[10px] font-mono text-security-dim">
                     <p className="mb-2 font-bold text-security-text">STORAGE STATS</p>
                     <div className="flex justify-between mb-1"><span>USED</span><span>{(secureStorage.getStorageUsage() / 1024).toFixed(1)} KB</span></div>
                     <div className="flex justify-between"><span>BLOCKS</span><span>{secureStorage.getChainLength()}</span></div>
                 </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 bg-black p-4 overflow-y-auto custom-scrollbar">
                
                {/* Mobile Search/Filter Bar */}
                <div className="md:hidden mb-4 flex gap-2">
                    <input 
                       type="text" 
                       placeholder="Search..." 
                       value={search}
                       onChange={e => setSearch(e.target.value)}
                       className="flex-1 bg-security-panel border border-security-border p-2 text-xs font-mono outline-none"
                    />
                     <button 
                       onClick={toggleSelectAll}
                       className="bg-security-panel border border-security-border p-2 text-xs font-mono"
                     >
                         {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? 'DESELECT' : 'SELECT ALL'}
                     </button>
                </div>

                {/* Desktop Select All Bar */}
                <div className="hidden md:flex justify-between items-center mb-4 px-1">
                     <button 
                       onClick={toggleSelectAll}
                       className="flex items-center gap-2 text-xs font-mono text-security-dim hover:text-white"
                     >
                         {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="w-4 h-4 text-security-accent" /> : <Square className="w-4 h-4" />}
                         SELECT ALL VISIBLE
                     </button>
                     <span className="text-[10px] font-mono text-security-dim">{filteredItems.length} ITEMS FOUND</span>
                </div>

                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-security-dim gap-4">
                        <div className="w-8 h-8 border-2 border-security-accent border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-mono animate-pulse">DECRYPTING LOCAL BLOCKS...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.map((item) => {
                            const isImage = item.type === 'EVIDENCE_SNAPSHOT';
                            const isVideo = item.type === 'VIDEO_CLIP';
                            const isSelected = selectedIds.has(item._blockIndex);
                            const isLocked = item.locked;
                            
                            return (
                                <div 
                                    key={item._blockIndex} 
                                    onClick={() => toggleSelect(item._blockIndex)}
                                    className={`bg-security-panel border cursor-pointer hover:border-security-accent transition-all group flex flex-col h-64 relative overflow-hidden ${isSelected ? 'border-security-accent ring-1 ring-security-accent' : 'border-security-border'}`}
                                >
                                    {/* Locked Indicator */}
                                    {isLocked && (
                                        <div className="absolute top-2 left-2 z-10 bg-security-accent text-black p-1 rounded-sm shadow-lg">
                                            <Lock className="w-3 h-3" />
                                        </div>
                                    )}

                                    {/* Selection Indicator */}
                                    <div className="absolute top-2 right-2 z-10">
                                        {isSelected ? <CheckSquare className="w-5 h-5 text-security-accent bg-black" /> : <Square className="w-5 h-5 text-security-dim bg-black/50" />}
                                    </div>

                                    {/* Card Header */}
                                    <div className="p-2 border-b border-security-border/50 bg-black/40 flex justify-between items-center text-[10px] font-mono">
                                        <span className={isImage || isVideo ? "text-security-accent" : "text-security-dim"}>{item.type.replace('_', ' ')}</span>
                                        <span className="text-security-dim">{new Date(item._timestamp).toLocaleTimeString()}</span>
                                    </div>

                                    {/* Card Content */}
                                    <div className="flex-1 overflow-hidden relative bg-black flex items-center justify-center">
                                        {(isImage || isVideo) && item.data ? (
                                            <>
                                               {isVideo && <Film className="w-8 h-8 text-security-accent absolute z-10 opacity-50" />}
                                               {isImage && <img src={item.data} alt="Evidence" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                                               {isVideo && <div className="w-full h-full bg-black/50 flex items-center justify-center"><div className="w-full h-full bg-security-panel/20"></div></div>} 
                                            </>
                                        ) : (
                                            <div className="p-3 text-[10px] font-mono text-security-dim break-all overflow-hidden h-full w-full">
                                                {item.description || JSON.stringify(item, null, 2)}
                                            </div>
                                        )}
                                        
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2" onClick={e => e.stopPropagation()}>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                className="px-3 py-1 bg-white text-black text-xs font-mono font-bold hover:bg-security-accent transition-colors"
                                             >
                                                INSPECT
                                             </button>
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="p-2 border-t border-security-border/50 bg-black/40 text-[10px] font-mono text-security-dim truncate">
                                        {item.cameraId ? `CAM: ${item.cameraId}` : `HASH: ${item._blockHash.substring(0, 8)}`}
                                    </div>
                                </div>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <div className="col-span-full py-12 text-center text-security-dim font-mono text-xs border border-dashed border-security-border">
                                NO RECORDS FOUND MATCHING CRITERIA
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Modal Inspector */}
        {selectedItem && (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                <div className="max-w-4xl w-full bg-security-panel border border-security-border shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-security-border bg-black">
                        <div className="flex items-center gap-3">
                            {selectedItem.locked && <Lock className="w-4 h-4 text-security-accent" />}
                            <h3 className="text-sm font-mono font-bold text-security-text">RECORD INSPECTOR {selectedItem.locked && '(EVIDENCE LOCKED)'}</h3>
                        </div>
                        <button onClick={() => setSelectedItem(null)}><ArrowLeft className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-auto p-0 flex flex-col md:flex-row">
                        {selectedItem.data && (selectedItem.type === 'EVIDENCE_SNAPSHOT' || selectedItem.type === 'VIDEO_CLIP') && (
                             <div className="bg-black flex-1 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-security-border min-h-[300px]">
                                 {selectedItem.type === 'VIDEO_CLIP' ? (
                                    <video 
                                        src={selectedItem.data} 
                                        controls 
                                        autoPlay 
                                        className="max-w-full max-h-[60vh] border border-security-border"
                                    />
                                 ) : (
                                    <img src={selectedItem.data} alt="Full Evidence" className="max-w-full max-h-[60vh] object-contain border border-security-border" />
                                 )}
                             </div>
                        )}
                        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                             <div>
                                 <label className="text-[10px] font-mono text-security-dim uppercase font-bold block mb-1">Block Metadata</label>
                                 <div className="text-xs font-mono text-security-text grid grid-cols-[100px_1fr] gap-2">
                                     <span className="text-security-dim">INDEX:</span> <span>{selectedItem._blockIndex}</span>
                                     <span className="text-security-dim">HASH:</span> <span className="break-all">{selectedItem._blockHash}</span>
                                     <span className="text-security-dim">TIMESTAMP:</span> <span>{new Date(selectedItem._timestamp).toISOString()}</span>
                                     <span className="text-security-dim">TYPE:</span> <span className="text-security-accent">{selectedItem.type}</span>
                                     <span className="text-security-dim">STATUS:</span> <span className={selectedItem.locked ? 'text-security-accent' : 'text-security-dim'}>{selectedItem.locked ? 'LOCKED (IMMUTABLE)' : 'STANDARD'}</span>
                                 </div>
                             </div>

                             <div>
                                 <label className="text-[10px] font-mono text-security-dim uppercase font-bold block mb-1">Content Data</label>
                                 <div className="bg-black border border-security-border p-3 text-[10px] font-mono text-security-dim whitespace-pre-wrap h-48 overflow-y-auto custom-scrollbar">
                                     {JSON.stringify(selectedItem, (key, value) => {
                                         if (key === 'data') return '[BASE64_BLOB]';
                                         return value;
                                     }, 2)}
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
