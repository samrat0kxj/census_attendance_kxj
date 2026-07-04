import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, Check, AlertTriangle, Image as ImageIcon } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64Img: string) => void;
  onCancel?: () => void;
  label?: string;
}

export default function CameraCapture({ onCapture, onCancel, label = "Take Photo" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize and list video devices
  useEffect(() => {
    async function initCamera() {
      try {
        setLoading(true);
        setError("");
        
        // Request camera permission first
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(track => track.stop()); // Stop immediately, just to list devices

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === "videoinput");
        setDevices(videoDevices);
        
        if (videoDevices.length > 0) {
          // Default to front camera on mobile or first camera on desktop
          const frontCamera = videoDevices.find(d => d.label.toLowerCase().includes("front") || d.label.toLowerCase().includes("user"));
          setActiveDeviceId(frontCamera ? frontCamera.deviceId : videoDevices[0].deviceId);
        } else {
          setError("No camera devices found. Please ensure a camera is connected.");
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Camera permission denied or camera not found. Please enable camera permissions in your browser.");
      } finally {
        setLoading(false);
      }
    }
    
    initCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  // Start the video stream whenever device id changes
  useEffect(() => {
    if (activeDeviceId && !capturedImage) {
      startCamera(activeDeviceId);
    }
    return () => {
      stopCamera();
    };
  }, [activeDeviceId, capturedImage]);

  const startCamera = async (deviceId: string) => {
    stopCamera();
    try {
      setLoading(true);
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error starting camera stream:", err);
      setError("Failed to stream from the selected camera.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setActiveDeviceId(devices[nextIndex].deviceId);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        // Match canvas dimensions to video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw watermark timestamp
        context.fillStyle = "rgba(0, 0, 0, 0.6)";
        context.fillRect(10, canvas.height - 40, canvas.width - 20, 30);
        context.font = "14px monospace";
        context.fillStyle = "#ffffff";
        const timestampStr = `Census 2027 TA • ${new Date().toLocaleString()}`;
        context.fillText(timestampStr, 20, canvas.height - 20);
        
        // Convert to Base64 (compress quality to 0.7 for reasonable size)
        const base64 = canvas.toDataURL("image/jpeg", 0.75);
        setCapturedImage(base64);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setError("");
    if (activeDeviceId) {
      startCamera(activeDeviceId);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-slate-900 text-white rounded-2xl shadow-xl w-full max-w-md mx-auto">
      <div className="text-center mb-3">
        <h3 className="font-display font-semibold text-lg">{label}</h3>
        <p className="text-xs text-slate-400">Live Camera Stream for Verification</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center bg-red-950/40 border border-red-800 p-6 rounded-xl text-center my-4 w-full">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
          <p className="text-sm font-medium text-red-300">{error}</p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg transition-all"
            >
              Go Back
            </button>
          )}
        </div>
      ) : (
        <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-slate-700 shadow-inner flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10">
              <RefreshCw className="h-8 w-8 text-indigo-455 animate-spin mb-2" />
              <p className="text-xs text-slate-400">Accessing Camera...</p>
            </div>
          )}
          
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured verification"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]" // mirror for user comfort
            />
          )}
          
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Status Overlay */}
          {!capturedImage && stream && (
            <div className="absolute bottom-3 left-3 bg-slate-950/75 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider flex items-center gap-1.5 border border-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </div>
          )}
        </div>
      )}

      {!error && (
        <div className="flex gap-3 justify-center w-full mt-5">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Confirm Photo
              </button>
            </>
          ) : (
            <>
              {onCancel && (
                <button
                  onClick={() => {
                    stopCamera();
                    onCancel();
                  }}
                  className="px-4 py-2.5 bg-transparent hover:bg-slate-800/50 text-slate-300 text-sm font-medium rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
              
              {devices.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Switch Camera"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
              
              <button
                onClick={capturePhoto}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                <Camera className="h-5 w-5" />
                Capture
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
