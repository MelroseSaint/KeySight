
import React, { useEffect, useRef, useState } from 'react';
import { Camera, SystemSettings } from '../types';
import { Activity, ShieldAlert, Wifi, Video, VideoOff, Maximize2, Lock, EyeOff, Disc, Mic, MicOff } from 'lucide-react';
import { secureStorage } from '../utils/secureStorage';

interface CameraFeedProps {
  camera: Camera;
  onMotionDetected: (cameraId: string) => void;
  settings?: SystemSettings;
  onExpand?: (camera: Camera) => void;
  isRecording?: boolean;
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  isExpanded?: boolean; // New prop for clear viewing
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ camera, onMotionDetected, settings, onExpand, isRecording, onRecordingComplete, isExpanded = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null); // Offscreen canvas for processing
  const containerRef = useRef<HTMLDivElement>(null);
  const lastRecordTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0); // Track start time locally
  
  const [streamActive, setStreamActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [motionValue, setMotionValue] = useState(0);
  const [permissionError, setPermissionError] = useState(false);

  // Initialize offscreen canvas once
  useEffect(() => {
    if (!diffCanvasRef.current) {
        diffCanvasRef.current = document.createElement('canvas');
        diffCanvasRef.current.width = 320; // Lower res for processing efficiency
        diffCanvasRef.current.height = 240;
    }
  }, []);

  // Handle stream initialization (Audio + Video)
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startStream = async () => {
      if (camera.isWebcam) {
        try {
          const constraints: MediaStreamConstraints = {
              video: { 
                  width: { ideal: isExpanded ? 1920 : 640 }, // Request higher res if expanded
                  height: { ideal: isExpanded ? 1080 : 480 },
                  frameRate: { ideal: 30 }
              },
              audio: settings?.audioRecordingEnabled ? {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
              } : false
          };

          stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setStreamActive(true);
            setPermissionError(false);
            
            // Check if audio track exists and is enabled
            const audioTracks = stream.getAudioTracks();
            setAudioActive(audioTracks.length > 0 && audioTracks[0].enabled);
          }
        } catch (err) {
          console.error("Camera/Audio access denied:", err);
          // If audio fails but video might work, try fallback (complex logic omitted for brevity, assuming fail-closed)
          setPermissionError(true);
          setStreamActive(false);
          setAudioActive(false);
        }
      } else {
         // Non-webcam cameras have no stream source in this environment
         setStreamActive(false); 
         setAudioActive(false);
      }
    };

    if (camera.status === 'online') {
       startStream();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [camera.isWebcam, camera.status, settings?.audioRecordingEnabled, isExpanded]);

  // Handle Recording Logic (Synchronized A/V)
  useEffect(() => {
      if (isRecording && streamActive && videoRef.current?.srcObject) {
          // START RECORDING
          const stream = videoRef.current.srcObject as MediaStream;
          
          // Verify Master Key Session implicitly via isRecording prop from App.tsx
          // If isRecording is true, App has validated session.
          
          try {
              // Prefer MP4 if available (Safari/Chrome), fallback to WebM
              let mimeType = 'video/webm';
              if (MediaRecorder.isTypeSupported('video/mp4')) {
                  mimeType = 'video/mp4';
              } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                  mimeType = 'video/webm;codecs=vp8,opus';
              }

              const recorder = new MediaRecorder(stream, { mimeType });
              mediaRecorderRef.current = recorder;
              chunksRef.current = [];
              recordingStartTimeRef.current = Date.now(); // Mark start time

              recorder.ondataavailable = (e) => {
                  if (e.data && e.data.size > 0) {
                      chunksRef.current.push(e.data);
                  }
              };

              recorder.onstop = () => {
                  const duration = Date.now() - recordingStartTimeRef.current;
                  const blob = new Blob(chunksRef.current, { type: mimeType });
                  if (onRecordingComplete) {
                      onRecordingComplete(blob, duration);
                  }
                  chunksRef.current = [];
              };

              // Capture in 1s chunks for resilience
              recorder.start(1000); 
          } catch (e) {
              console.error("MediaRecorder failed", e);
          }
      } else if (!isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          // STOP RECORDING
          mediaRecorderRef.current.stop();
      }
  }, [isRecording, streamActive, onRecordingComplete]);

  // Deterministic Motion Detection Loop (Real cameras only)
  useEffect(() => {
    if (!streamActive || camera.status !== 'online' || !camera.isWebcam) return;

    let animationFrameId: number;
    let lastTime = 0;
    
    const isMobile = window.innerWidth < 768;
    const processInterval = isMobile ? 100 : 33; 
    
    let prevImageData: Uint8ClampedArray | null = null;

    const processFrame = (timestamp: number) => {
      if (timestamp - lastTime > processInterval) {
        lastTime = timestamp;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const diffCanvas = diffCanvasRef.current;
        
        if (canvas && diffCanvas) {
            const ctx = canvas.getContext('2d');
            const diffCtx = diffCanvas.getContext('2d');

            if (ctx && diffCtx) {
                // Clear previous drawings
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (video && video.readyState === 4) {
                    // REAL PROCESSING
                    // 1. Draw video frame to small offscreen canvas
                    diffCtx.drawImage(video, 0, 0, diffCanvas.width, diffCanvas.height);
                    
                    // 2. Get pixel data
                    const frameData = diffCtx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
                    const currentPixels = frameData.data;

                    if (prevImageData) {
                        // 3. Compare pixels (Deterministic)
                        let diffScore = 0;
                        let minX = diffCanvas.width, minY = diffCanvas.height, maxX = 0, maxY = 0;
                        
                        // Use Configured Threshold (Default 30)
                        const threshold = settings?.motionThreshold || 30; 
                        
                        // Skip more pixels on mobile for performance
                        const skip = isMobile ? 8 : 4; 

                        for (let i = 0; i < currentPixels.length; i += (4 * skip)) {
                            const rDiff = Math.abs(currentPixels[i] - prevImageData[i]);
                            const gDiff = Math.abs(currentPixels[i+1] - prevImageData[i+1]);
                            const bDiff = Math.abs(currentPixels[i+2] - prevImageData[i+2]);

                            if (rDiff + gDiff + bDiff > threshold * 3) {
                                diffScore++;
                                const pixelIndex = i / 4;
                                const x = pixelIndex % diffCanvas.width;
                                const y = Math.floor(pixelIndex / diffCanvas.width);
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }

                        // 4. Trigger Motion
                        if (diffScore > (isMobile ? 25 : 50)) { // Adjusted threshold for lower resolution scan
                            setMotionValue(diffScore);
                            onMotionDetected(camera.id);
                            
                            // Scale bounding box to display canvas
                            const scaleX = canvas.width / diffCanvas.width;
                            const scaleY = canvas.height / diffCanvas.height;
                            
                            // Respect Global Settings
                            if (settings?.showMotionRects) {
                                ctx.strokeStyle = '#00ff41';
                                ctx.lineWidth = 2;
                                ctx.strokeRect(minX * scaleX, minY * scaleY, (maxX - minX) * scaleX, (maxY - minY) * scaleY);
                                
                                // Stats
                                ctx.fillStyle = '#00ff41';
                                ctx.font = '10px JetBrains Mono';
                                ctx.fillText(`DELTA: ${diffScore} (TH:${threshold})`, minX * scaleX, (minY * scaleY) - 5);
                            }

                            // SECURE AUTOMATED SNAPSHOT (Automatic on motion)
                            const now = Date.now();
                            if (now - lastRecordTimeRef.current > 1000) { // Limit to 1 frame every 1s
                                lastRecordTimeRef.current = now;
                                // Capture evidence snapshot
                                const snapshot = diffCanvas.toDataURL('image/jpeg', 0.5);
                                secureStorage.append({
                                    type: 'EVIDENCE_SNAPSHOT',
                                    cameraId: camera.id,
                                    timestamp: now,
                                    data: snapshot,
                                    delta: diffScore
                                }).catch(e => console.error("Secure storage write failed", e));
                            }
                        } else {
                            setMotionValue(0);
                        }
                    }
                    // Store current frame for next comparison
                    prevImageData = currentPixels;
                }
            }
        }
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [streamActive, camera.status, camera.isWebcam, camera.id, onMotionDetected, settings?.showMotionRects, settings?.motionThreshold]); 

  // If expanded, use 1.0 opacity, otherwise use settings or default
  const overlayOpacity = isExpanded ? 0 : (settings ? settings.overlayOpacity : 0.8);

  return (
    <div ref={containerRef} className={`relative bg-security-black border rounded-sm overflow-hidden group shadow-lg shrink-0 transition-all ${isExpanded ? 'h-full border-none' : 'h-48 sm:h-64 border-security-border hover:border-security-accent/50'} ${isRecording ? 'border-security-alert' : ''}`}>
      
      {/* Hidden Video Element for Source - MUTED to prevent feedback loop during capture */}
      {camera.isWebcam && (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-60 mix-blend-luminosity'}`}
          />
      )}

      {/* Fallback Image for Mock Cams (NO FAKE STREAM) */}
      {!camera.isWebcam && camera.status === 'online' && (
         <div className="absolute inset-0 flex items-center justify-center bg-black">
             <div className="text-security-dim text-[10px] font-mono flex flex-col items-center gap-2">
                 <VideoOff className="w-8 h-8 opacity-20" />
                 <span>REMOTE STREAM UNAVAILABLE</span>
                 <span className="opacity-50">Local Proxy Required</span>
             </div>
         </div>
      )}

      {/* Privacy Mask */}
      {settings?.privacyMaskEnabled && (
          <div className="absolute inset-0 backdrop-blur-md z-10 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center opacity-50">
                  <EyeOff className="w-8 h-8 text-security-text" />
                  <span className="text-[10px] font-mono text-security-text mt-1">PRIVACY MASK ACTIVE</span>
              </div>
          </div>
      )}

      {/* Scanline & Grid Overlay - HIDDEN IF EXPANDED */}
      {!isExpanded && (
        <>
          <div 
            className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none transition-opacity duration-300" 
            style={{ opacity: overlayOpacity }}
          />
          <div 
            className="absolute inset-0 border border-white/5 bg-[size:20px_20px] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] pointer-events-none transition-opacity duration-300"
            style={{ opacity: overlayOpacity }}
          ></div>
        </>
      )}

      {/* Header Info */}
      {settings?.showOverlays !== false && (
          <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/90 to-transparent z-10 flex justify-between items-start pointer-events-none">
            <div>
              <h3 className="text-xs font-mono font-bold text-security-text flex items-center gap-2">
                {camera.name}
                {camera.status === 'online' && !permissionError && (camera.isWebcam) ? (
                   <span className="w-2 h-2 bg-security-accent rounded-full animate-pulse shadow-[0_0_10px_#00ff41]"></span>
                ) : (
                   <span className="w-2 h-2 bg-security-dim rounded-full"></span>
                )}
              </h3>
              <p className="text-[10px] text-security-dim font-mono tracking-tighter">
                 {camera.ip} | ID:{camera.id.slice(-4)} | RES: {isExpanded ? 'HD (EXPANDED)' : (camera.isWebcam ? 'REALTIME' : 'N/A')}
              </p>
            </div>
            <div className="flex gap-2">
                {/* Audio Indicator */}
                {audioActive ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/50 border border-security-dim rounded">
                        <Mic className="w-3 h-3 text-security-accent" />
                    </div>
                ) : settings?.audioRecordingEnabled ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/50 border border-security-dim rounded" title="Audio Enabled but Inactive">
                         <MicOff className="w-3 h-3 text-security-dim" />
                    </div>
                ) : null}

                {isRecording && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-security-alert text-black rounded animate-pulse">
                        <Disc className="w-3 h-3" />
                        <span className="text-[9px] font-mono font-bold">REC</span>
                    </div>
                )}
                {motionValue > 0 && <Activity className="w-4 h-4 text-security-accent animate-bounce" />}
                {permissionError && <VideoOff className="w-4 h-4 text-security-alert" />}
                {camera.status === 'tampered' && <ShieldAlert className="w-4 h-4 text-security-alert" />}
            </div>
          </div>
      )}

      {/* Error State */}
      {(camera.status !== 'online' || permissionError) && (
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-black/80 z-20">
             <ShieldAlert className="w-12 h-12 text-security-dim mb-2" />
             <span className="text-xs font-mono text-security-dim">DEVICE OFFLINE / ACCESS DENIED</span>
        </div>
      )}

      {/* Analysis Layer (Canvas) */}
      <canvas 
        ref={canvasRef}
        width={400} 
        height={300}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Footer Info - Hide if expanded to keep clean, or keep minimal */}
      {settings?.showOverlays !== false && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/80 backdrop-blur-sm border-t border-security-border flex justify-between items-center z-10">
             <span className="text-[10px] font-mono text-security-accent flex items-center gap-1">
                <Lock className="w-2 h-2" /> TLS1.3
             </span>
             <div className="flex items-center gap-2">
                <button 
                    onClick={() => onExpand && onExpand(camera)}
                    className="pointer-events-auto p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <Maximize2 className="w-3 h-3 text-security-dim hover:text-white" />
                </button>
             </div>
          </div>
      )}
    </div>
  );
};
