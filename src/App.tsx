import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, RotateCcw, AlertCircle } from 'lucide-react';

// Type definitions
type FacingMode = 'user' | 'environment';
type PermissionState = 'granted' | 'denied' | 'prompt';

interface CameraConstraints {
  video: {
    facingMode: FacingMode;
    width: { ideal: number; max: number };
    height: { ideal: number; max: number };
    aspectRatio: { ideal: number };
  };
  audio: boolean;
}

interface BasicConstraints {
  video: boolean;
  audio: boolean;
}

const CameraComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<FacingMode>('user'); // 'user' for front, 'environment' for back
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<PermissionState>('prompt');

  // Check if device has camera capabilities
  const hasCamera: boolean = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Get camera constraints based on facing mode
  const getConstraints = (facing: FacingMode): CameraConstraints => ({
    video: {
      facingMode: facing,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      aspectRatio: { ideal: 16/9 }
    },
    audio: false
  });

  // Start camera
  const startCamera = async (): Promise<void> => {
    if (!hasCamera) {
      setError('Camera not supported on this device');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      const constraints = getConstraints(facingMode);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      setIsActive(true);
      setPermissions('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.error('Camera error:', err);
      
      const error = err as DOMException;
      
      if (error.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions.');
        setPermissions('denied');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setError('Camera constraints not supported. Trying basic settings...');
        // Fallback with basic constraints
        try {
          const basicConstraints: BasicConstraints = { 
            video: true, 
            audio: false 
          };
          const basicStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          setStream(basicStream);
          setIsActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
          }
          setError('');
        } catch (basicErr: unknown) {
          setError('Unable to access camera with any settings.');
        }
      } else {
        setError('Unable to access camera. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Stop camera
  const stopCamera = (): void => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
    }
    setIsActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Switch camera (front/back)
  const switchCamera = async (): Promise<void> => {
    const newFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    if (isActive) {
      await startCamera();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [stream]);

  // Check permissions and auto-start camera on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'camera' as PermissionName })
        .then((result: PermissionStatus) => {
          setPermissions(result.state as PermissionState);
          result.addEventListener('change', () => {
            setPermissions(result.state as PermissionState);
          });
          
          // Auto-start camera if permissions are already granted
          if (result.state === 'granted') {
            startCamera();
          }
        })
        .catch(() => {
          // Permissions API not supported, keep default
        });
    }
  }, []);

  // Auto-start camera with user interaction fallback
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!isActive && !isLoading && permissions !== 'denied') {
        startCamera();
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // Add interaction listeners for auto-start
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isActive, isLoading, permissions]);

  if (!hasCamera) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CameraOff className="mx-auto mb-4 text-gray-400" size={64} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Camera Not Supported</h2>
          <p className="text-gray-600">
            Your device or browser doesn't support camera access. Please try using a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl w-full">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Camera size={24} />
            Camera Access
          </h1>
          {isActive && (
            <button
              onClick={switchCamera}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Switch Camera"
            >
              <RotateCcw size={20} />
            </button>
          )}
        </div>

        {/* Video Area */}
        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          {isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Camera size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Camera Preview</p>
                <p className="text-sm mt-2">Click start to begin</p>
              </div>
            </div>
          )}
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
              <div>
                <p className="text-red-700 font-medium">Camera Error</p>
                <p className="text-red-600 text-sm">{error}</p>
                {permissions === 'denied' && (
                  <p className="text-red-600 text-xs mt-1">
                    To enable camera access, click the camera icon in your browser's address bar or check your browser settings.
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Auto-start message */}
          {!isActive && !error && !isLoading && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <p className="text-blue-700 text-sm">
                📸 Camera will start automatically. If it doesn't, click the "Start Camera" button below or anywhere on the page.
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            {!isActive ? (
              <button
                onClick={startCamera}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                <Camera size={20} />
                {isLoading ? 'Starting...' : 'Start Camera'}
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <CameraOff size={20} />
                Stop Camera
              </button>
            )}
          </div>
          
          {/* Info */}
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Camera facing: {facingMode === 'user' ? 'Front' : 'Back'}</p>
            {isActive && (
              <p className="mt-1">
                Resolution: {videoRef.current?.videoWidth || 'Unknown'} × {videoRef.current?.videoHeight || 'Unknown'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraComponent;