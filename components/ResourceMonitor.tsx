import React from 'react';
import { SystemResources } from '../types';
import { Cpu, HardDrive, Zap } from 'lucide-react';

interface ResourceMonitorProps {
  resources: SystemResources;
}

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({ resources }) => {
  const getStatusColor = (val: number, threshold: number) => {
    return val > threshold ? 'text-security-alert' : 'text-security-accent';
  };

  const getBarColor = (val: number, threshold: number) => {
    return val > threshold ? 'bg-security-alert' : 'bg-security-accent';
  };

  return (
    <div className="bg-security-panel border border-security-border p-3 rounded-sm flex flex-col gap-3">
      <div className="flex justify-between items-center border-b border-security-border pb-2">
        <h3 className="text-xs font-mono font-bold text-security-text uppercase flex items-center gap-2">
          <Zap className="w-3 h-3 text-security-warn" /> System Resources
        </h3>
        <span className="text-[10px] font-mono text-security-dim">REAL-TIME</span>
      </div>

      {/* CPU */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-security-dim flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU_LOAD</span>
          <span className={getStatusColor(resources.cpuUsage, 80)}>{resources.cpuUsage.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 bg-black border border-security-border rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getBarColor(resources.cpuUsage, 80)}`} 
            style={{ width: `${resources.cpuUsage}%` }}
          />
        </div>
      </div>

      {/* Memory */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-security-dim flex items-center gap-1"><HardDrive className="w-3 h-3" /> RAM_ALLOC</span>
          <span className={getStatusColor(resources.memoryUsage, 70)}>{resources.memoryUsage.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 bg-black border border-security-border rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getBarColor(resources.memoryUsage, 70)}`} 
            style={{ width: `${resources.memoryUsage}%` }}
          />
        </div>
      </div>

      {/* Storage IO */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-security-dim">STORAGE_WRITE_OPS</span>
          <span className="text-security-text">{resources.storageUsage.toFixed(0)} MB/s</span>
        </div>
         <div className="flex gap-0.5 mt-1">
             {Array.from({length: 10}).map((_, i) => (
                 <div key={i} className={`h-1 flex-1 ${i < resources.storageUsage / 10 ? 'bg-security-accent' : 'bg-security-border'}`} />
             ))}
         </div>
      </div>
      
      <div className="text-[10px] font-mono text-security-dim pt-2 border-t border-security-border mt-1">
         ACTIVE_WORKERS: {resources.activeThreads}
      </div>
    </div>
  );
};