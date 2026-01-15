
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { WifiSignal } from '../types';

interface WiFiSignalChartProps {
  data: WifiSignal[];
}

export const WiFiSignalChart: React.FC<WiFiSignalChartProps> = ({ data }) => {
  // Format data for chart (Mapping 'rssi' field to 'rtt' for visualization)
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: d.rssi * -1, // Inverting back to positive for visualization if we stored it as negative, or just use raw if changed in App.tsx
    fullTime: d.timestamp
  }));

  // Calculate average latency
  const avgLatency = data.length > 0 
    ? Math.round(data.reduce((acc, curr) => acc + (curr.rssi * -1), 0) / data.length) 
    : 0;

  return (
    <div className="h-full w-full bg-security-panel border border-security-border p-4 rounded-sm flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-mono text-security-text font-bold uppercase">Network Latency (RTT)</h3>
        <span className="text-xs font-mono text-security-accent flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${avgLatency > 100 ? 'bg-security-alert' : 'bg-security-accent'} animate-pulse`} />
            {avgLatency}ms
        </span>
      </div>
      <div className="flex-grow min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="time" 
              tick={{fill: '#888', fontSize: 10, fontFamily: 'monospace'}} 
              tickLine={{stroke: '#333'}}
              axisLine={{stroke: '#333'}}
            />
            <YAxis 
              domain={[0, 'auto']} 
              tick={{fill: '#888', fontSize: 10, fontFamily: 'monospace'}}
              tickLine={{stroke: '#333'}}
              axisLine={{stroke: '#333'}}
              label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#444', fontSize: 10 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', color: '#e5e5e5', fontFamily: 'monospace', fontSize: '12px' }}
              itemStyle={{ color: '#00ff41' }}
              formatter={(value: number) => [`${value} ms`, 'Latency']}
            />
            <ReferenceLine y={150} stroke="#ffcc00" strokeDasharray="3 3" label={{ value: 'LAG THRESHOLD', fill: '#ffcc00', fontSize: 10, position: 'right' }} />
            <Line 
              type="monotone" 
              dataKey="latency" 
              stroke="#00ff41" 
              strokeWidth={1.5} 
              dot={false} 
              isAnimationActive={false} // Real-time feel
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[10px] text-security-dim font-mono border-t border-security-border pt-2 flex justify-between">
        <span>INTERFACE: {(navigator as any).connection ? (navigator as any).connection.effectiveType.toUpperCase() : 'UNKNOWN'}</span>
        <span>JITTER: {data.length > 1 ? Math.abs((data[data.length-1].rssi * -1) - (data[data.length-2].rssi * -1)) : 0}ms</span>
      </div>
    </div>
  );
};