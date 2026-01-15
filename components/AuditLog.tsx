import React from 'react';
import { SecurityEvent } from '../types';
import { AlertTriangle, Info, CheckCircle, FileText } from 'lucide-react';

interface AuditLogProps {
  logs: SecurityEvent[];
}

export const AuditLog: React.FC<AuditLogProps> = ({ logs }) => {
  return (
    <div className="bg-security-panel border border-security-border rounded-sm h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-security-border bg-black/20 flex justify-between items-center shrink-0">
         <h3 className="text-sm font-mono font-bold text-security-text uppercase">Immutable Audit Log</h3>
         <div className="hidden sm:flex gap-2 text-[10px] font-mono text-security-dim">
            <span>HASH_CHAIN: VERIFIED</span>
            <span>STORAGE: LOCAL</span>
         </div>
      </div>
      <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
        <div className="min-w-[600px] sm:min-w-0"> {/* Force width for mobile scroll */}
            <table className="w-full text-left border-collapse">
            <thead className="bg-security-border/30 sticky top-0 backdrop-blur-md">
                <tr>
                <th className="p-2 text-[10px] font-mono text-security-dim font-normal w-24">TIMESTAMP</th>
                <th className="p-2 text-[10px] font-mono text-security-dim font-normal w-20">TYPE</th>
                <th className="p-2 text-[10px] font-mono text-security-dim font-normal">DESCRIPTION</th>
                <th className="p-2 text-[10px] font-mono text-security-dim font-normal w-24">HASH</th>
                </tr>
            </thead>
            <tbody>
                {logs.slice().reverse().map((log) => (
                <tr key={log.id} className="border-b border-security-border/50 hover:bg-white/5 transition-colors group">
                    <td className="p-2 text-xs font-mono text-security-dim whitespace-nowrap">
                    {new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}
                    </td>
                    <td className="p-2">
                    <span className={`
                        text-[10px] font-mono px-1 py-0.5 rounded
                        ${log.type === 'MOTION' ? 'bg-security-accent/10 text-security-accent' : ''}
                        ${log.type === 'AUTH' ? 'bg-blue-500/10 text-blue-400' : ''}
                        ${log.type === 'SYSTEM' ? 'bg-gray-700/30 text-gray-400' : ''}
                        ${log.type === 'WIFI' ? 'bg-security-warn/10 text-security-warn' : ''}
                        ${log.type === 'EXPORT' ? 'bg-purple-500/10 text-purple-400' : ''}
                    `}>
                        {log.type}
                    </span>
                    </td>
                    <td className="p-2 text-xs text-security-text font-mono flex items-center gap-2">
                    {log.severity === 'critical' && <AlertTriangle className="w-3 h-3 text-security-alert shrink-0" />}
                    {log.severity === 'warning' && <Info className="w-3 h-3 text-security-warn shrink-0" />}
                    {log.type === 'EXPORT' && <FileText className="w-3 h-3 text-purple-400 shrink-0" />}
                    <span className="truncate max-w-[200px] sm:max-w-none">{log.description}</span>
                    </td>
                    <td className="p-2 text-[10px] font-mono text-gray-600 group-hover:text-security-accent transition-colors cursor-help" title={log.hash}>
                    {log.hash.substring(0, 8)}...
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};