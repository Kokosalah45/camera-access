import React, { useState, useRef, useEffect } from 'react';

// Type definitions
type FacingMode = 'user' | 'environment';
type PermissionState = 'granted' | 'denied' | 'prompt';

interface CameraConstraints {
  video: {
    facingMode: FacingMode;
  };
  audio: boolean;
}

const SimpleCameraComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<PermissionState>('prompt');

  // Check for camera support
  const hasCamera: boolean = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Camera constraints
  const getConstraints = (facing: FacingMode): CameraConstraints => ({
    video: { facingMode: facing },
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
      // Check permissions
      const permissionStatus = await navigator.permissions.query({ name: 'camera' });
      setPermissions(permissionStatus.state);
      if (permissionStatus.state === 'denied') {
        setError('Camera access denied. Please allow camera permissions.');
        setIsLoading(false);
        return;
      }

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop();
          track.enabled = false;
        });
      }

      const constraints = getConstraints(facingMode);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      setIsActive(true);
      setPermissions('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((err) => {
          console.error('Video play error:', err);
          setError('Failed to play video stream.');
        });
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
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setIsActive(false);
    setError('');
  };

  // Switch camera
  const switchCamera = async (): Promise<void> => {
    const newFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isActive) {
      await startCamera();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [stream]);

  if (!hasCamera) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <h2 style={styles.errorTitle}>Camera Not Supported</h2>
          <p style={styles.errorText}>
            Your device or browser doesn't support camera access. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.cameraBox}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Camera Access</h1>
          {isActive && (
            <button onClick={switchCamera} style={styles.switchButton} title="Switch Camera">
              ↻
            </button>
          )}
        </div>

        {/* Video Area */}
        <div style={styles.videoContainer}>
          {isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={styles.video}
            />
          ) : (
            <div style={styles.placeholder}>
              <p style={styles.placeholderText}>Camera Preview</p>
              <p style={styles.placeholderSubtext}>Click start to begin</p>
            </div>
          )}
          {isLoading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Starting camera...</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorTitle}>Camera Error</p>
              <p style={styles.errorText}>{error}</p>
              {permissions === 'denied' && (
                <p style={styles.errorSubtext}>
                  To enable camera access, check your browser's camera permissions and try again.
                </p>
              )}
            </div>
          )}
          <div style={styles.buttonContainer}>
            {!isActive ? (
              <button
                onClick={startCamera}
                disabled={isLoading}
                style={isLoading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
              >
                Start Camera
              </button>
            ) : (
              <button onClick={stopCamera} style={styles.stopButton}>
                Stop Camera
              </button>
            )}
          </div>
          <div style={styles.info}>
            <p>Camera: {facingMode === 'user' ? 'Front' : 'Back'}</p>
            {isActive && (
              <p>
                Resolution: {videoRef.current?.videoWidth || 'Unknown'} × {videoRef.current?.videoHeight || 'Unknown'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f0f0',
    padding: '20px',
  },
  cameraBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#333',
    color: '#fff',
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
  },
  switchButton: {
    backgroundColor: '#555',
    color: '#fff',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  videoContainer: {
    position: 'relative',
    backgroundColor: '#000',
    aspectRatio: '16/9',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
  },
  placeholderText: {
    fontSize: '18px',
    margin: '0',
  },
  placeholderSubtext: {
    fontSize: '14px',
    marginTop: '10px',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #fff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '10px',
    fontSize: '14px',
  },
  controls: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #f87171',
    borderRadius: '4px',
    padding: '10px',
    marginBottom: '20px',
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#b91c1c',
    margin: '0 0 5px',
  },
  errorText: {
    fontSize: '14px',
    color: '#b91c1c',
    margin: 0,
  },
  errorSubtext: {
    fontSize: '12px',
    color: '#b91c1c',
    marginTop: '5px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
    cursor: 'not-allowed',
  },
  stopButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  info: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#666',
  },
};

const styleSheet = document.createElement('style');
styleSheet.innerText = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default SimpleCameraComponent;