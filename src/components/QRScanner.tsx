import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config/constants';
import jsQR from 'jsqr';

// Interface for offline time entries
interface OfflineTimeEntry {
  id: string;
  userId: string;
  placeId: string;
  type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  synced: boolean;
}

interface QRScannerProps {
  type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut';
  onClose: () => void;
  onScan: (data?: any) => void;
}

// Function to save offline time entry
const saveOfflineTimeEntry = (entry: Omit<OfflineTimeEntry, 'synced'>) => {
  try {
    // Get existing offline entries
    const offlineEntriesJson = localStorage.getItem('offlineTimeEntries');
    const offlineEntries: OfflineTimeEntry[] = offlineEntriesJson 
      ? JSON.parse(offlineEntriesJson) 
      : [];
    
    // Add new entry with synced=false
    const newEntry: OfflineTimeEntry = {
      ...entry,
      synced: false
    };
    
    offlineEntries.push(newEntry);
    
    // Save back to localStorage
    localStorage.setItem('offlineTimeEntries', JSON.stringify(offlineEntries));
    
    console.log('Saved offline time entry:', newEntry);
    return newEntry;
  } catch (error) {
    console.error('Error saving offline time entry:', error);
    return null;
  }
};

// Function to sync offline entries with server
const syncOfflineEntries = async () => {
  try {
    const offlineEntriesJson = localStorage.getItem('offlineTimeEntries');
    if (!offlineEntriesJson) return;
    
    const offlineEntries: OfflineTimeEntry[] = JSON.parse(offlineEntriesJson);
    const unsyncedEntries = offlineEntries.filter(entry => !entry.synced);
    
    if (unsyncedEntries.length === 0) return;
    
    console.log(`Attempting to sync ${unsyncedEntries.length} offline entries`);
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.error('No token available for syncing offline entries');
      return;
    }
    
    // Try to sync each entry
    const updatedEntries = [...offlineEntries];
    let syncedCount = 0;
    
    for (const entry of unsyncedEntries) {
      try {
        const response = await fetch(`${API_URL}/time-entries/verify-location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            placeId: entry.placeId,
            latitude: entry.location.latitude,
            longitude: entry.location.longitude,
            accuracy: entry.location.accuracy || 0,
            type: entry.type,
            timestamp: entry.timestamp,
            isOfflineSync: true
          })
        });
        
        if (response.ok) {
          // Mark as synced
          const index = updatedEntries.findIndex(e => e.id === entry.id);
          if (index !== -1) {
            updatedEntries[index].synced = true;
            syncedCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to sync entry ${entry.id}:`, error);
      }
    }
    
    // Update localStorage with synced status
    localStorage.setItem('offlineTimeEntries', JSON.stringify(updatedEntries));
    
    if (syncedCount > 0) {
      console.log(`Successfully synced ${syncedCount} offline entries`);
    }
    
    return syncedCount;
  } catch (error) {
    console.error('Error syncing offline entries:', error);
    return 0;
  }
};

export function QRScanner({ type, onClose, onScan }: QRScannerProps) {
  // State variables
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [scanSuccess, setScanSuccess] = useState<{ message: string, data: any } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(import.meta.env.PROD); // Auto-enable in production
  const [skipLocationCheck, setSkipLocationCheck] = useState(import.meta.env.PROD); // Auto-enable in production
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [pendingOfflineEntries, setPendingOfflineEntries] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const scannerIntervalRef = useRef<number | null>(null);
  
  // Create a hidden canvas element for QR scanning
  useEffect(() => {
    // Create canvas element if it doesn't exist
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      document.body.appendChild(canvas);
      canvasRef.current = canvas;
      console.log("Created canvas element for QR scanning");
    }
    
    // Cleanup on unmount
    return () => {
      if (canvasRef.current && document.body.contains(canvasRef.current)) {
        document.body.removeChild(canvasRef.current);
      }
    };
  }, []);
  
  // Check for pending offline entries
  const checkPendingOfflineEntries = useCallback(() => {
    try {
      const offlineEntriesJson = localStorage.getItem('offlineTimeEntries');
      if (!offlineEntriesJson) {
        setPendingOfflineEntries(0);
        return 0;
      }
      
      const offlineEntries: OfflineTimeEntry[] = JSON.parse(offlineEntriesJson);
      const unsyncedCount = offlineEntries.filter(entry => !entry.synced).length;
      setPendingOfflineEntries(unsyncedCount);
      return unsyncedCount;
    } catch (error) {
      console.error('Error checking pending offline entries:', error);
      return 0;
    }
  }, []);
  
  // Check if the server is available
  const checkServerAvailability = useCallback(async () => {
    if (import.meta.env.DEV) {
      // In development, assume server is available
      console.log("Development environment detected, assuming server is available");
      setServerAvailable(true);
      setOfflineMode(false);
      return true;
    }
    
    try {
      // Try both the /health endpoint and the root endpoint
      console.log("Checking server availability at:", API_URL);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // First try the /health endpoint
      let response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      }).catch(error => {
        console.log("Health endpoint check failed, trying root endpoint");
        return { ok: false };
      });
      
      // If health endpoint fails, try the root endpoint
      if (!response.ok) {
        response = await fetch(API_URL, {
          method: 'GET',
          signal: controller.signal
        }).catch(error => {
          console.error("Root endpoint check failed:", error);
          return { ok: false };
        });
      }
      
      clearTimeout(timeoutId);
      
      const isAvailable = response.ok;
      console.log("Server available:", isAvailable);
      setServerAvailable(isAvailable);
      setOfflineMode(!isAvailable);
      
      // If server is available, try to sync any pending offline entries
      if (isAvailable) {
        const pendingCount = checkPendingOfflineEntries();
        if (pendingCount > 0) {
          console.log(`Found ${pendingCount} pending offline entries to sync`);
          syncOfflineEntries().then(syncedCount => {
            if (syncedCount && syncedCount > 0) {
              checkPendingOfflineEntries();
            }
          });
        }
      }
      
      return isAvailable;
    } catch (error) {
      console.error("Error checking server availability:", error);
      setServerAvailable(false);
      setOfflineMode(true);
      return false;
    }
  }, [checkPendingOfflineEntries]);
  
  // Get available cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      // Prefer back camera on mobile devices
      if (isMobile()) {
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        
        if (backCamera) {
          setSelectedCamera(backCamera.deviceId);
          console.log("Selected back camera:", backCamera.label);
        } else if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } else if (videoDevices.length > 0) {
        // On desktop, just use the first camera
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }, []);

  // Get user's geolocation
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          console.error('Geolocation error:', error);
          if (error.code === 1) {
            reject(new Error('Location access denied. Please enable location services.'));
          } else if (error.code === 2) {
            reject(new Error('Unable to determine your location. Please try again.'));
          } else if (error.code === 3) {
            reject(new Error('Location request timed out. Please try again.'));
          } else {
            reject(new Error('Failed to get your location. Please try again.'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  };

  // Process QR code data
  const processQrCode = async (decodedText: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setError(null);

      console.log("QR Code detected:", decodedText);
      
      // Stop scanning
      stopScanning();

      // If we're in debug mode, bypass normal processing
      if (debugMode) {
        console.log("Debug mode enabled, bypassing normal processing");
        
        // Create mock data
        const mockData = {
          id: "debug-entry-" + Date.now(),
          userId: "debug-user",
          timestamp: new Date().toISOString(),
          type: type,
          location: {
            latitude: 0,
            longitude: 0
          }
        };
        
        // Set success state with message
        const actionMessages = {
          clockIn: 'Clock In successful! (Debug Mode)',
          breakStart: 'Break Start recorded successfully! (Debug Mode)',
          breakEnd: 'Break End recorded successfully! (Debug Mode)',
          clockOut: 'Clock Out successful! (Debug Mode)'
        };
        
        const successMessage = actionMessages[type] || 'Scan successful! (Debug Mode)';
        
        // Add a small delay to simulate processing
        setTimeout(() => {
          setScanSuccess({ message: successMessage, data: mockData });
          setIsProcessing(false);
        }, 1000);
        
        return;
      }

      // Normal processing with location check
      try {
        if (skipLocationCheck) {
          await processWithLocation(decodedText, {
            latitude: 0,
            longitude: 0,
            accuracy: 0
          });
        } else {
          const position = await getCurrentPosition();
          await processWithLocation(decodedText, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        }
      } catch (geoError) {
        console.error('Geolocation error:', geoError);
        setError(geoError instanceof Error ? geoError.message : 'Failed to get your location');
        setIsProcessing(false);
        
        // Restart scanning after a short delay
        setTimeout(() => {
          startScanning();
        }, 1000);
      }
    } catch (error) {
      console.error('Detailed scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process scan');
      setIsProcessing(false);
      // Restart scanning after a short delay
      setTimeout(() => {
        startScanning();
      }, 1000);
    }
  };

  // Process with location data
  const processWithLocation = async (qrData: string, locationData: { latitude: number, longitude: number, accuracy?: number }) => {
    try {
      const now = new Date();
      
      // Debug mode - bypass API call completely
      if (debugMode) {
        console.log("Debug mode enabled, bypassing normal processing");
        console.log("QR Data:", qrData);
        console.log("Location Data:", locationData);
        
        // If we're in offline mode, save the entry to localStorage
        if ((offlineMode || !serverAvailable) && !debugMode) {
          console.log("Offline mode active, saving entry to local storage");
          
          // Get user ID from token if available
          let userId = "offline-user";
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            try {
              // Simple JWT parsing (not secure but works for basic extraction)
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              
              const payload = JSON.parse(jsonPayload);
              if (payload.id) {
                userId = payload.id;
              }
            } catch (e) {
              console.error("Error extracting user ID from token:", e);
            }
          }
          
          // Create offline entry
          const offlineEntry = {
            id: "offline-" + Date.now(),
            userId,
            placeId: qrData,
            type,
            timestamp: now.toISOString(),
            location: locationData
          };
          
          // Save to localStorage
          const savedEntry = saveOfflineTimeEntry(offlineEntry);
          
          if (savedEntry) {
            checkPendingOfflineEntries();
            
            // Set success state with message
            const actionMessages = {
              clockIn: 'Clock In saved offline! Will sync later.',
              breakStart: 'Break Start saved offline! Will sync later.',
              breakEnd: 'Break End saved offline! Will sync later.',
              clockOut: 'Clock Out saved offline! Will sync later.'
            };
            
            const successMessage = actionMessages[type] || 'Entry saved offline! Will sync later.';
            console.log("Offline entry saved:", successMessage);
            
            setScanSuccess({ 
              message: successMessage, 
              data: savedEntry 
            });
            setIsProcessing(false);
            return;
          }
        }
        
        // Create mock data for debug mode (not offline)
        const mockData = {
          id: "debug-entry-" + Date.now(),
          userId: "debug-user",
          timestamp: now.toISOString(),
          type: type,
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          },
          placeId: qrData // Include the scanned QR code data
        };
        
        // Set success state with message
        const actionMessages = {
          clockIn: 'Clock In successful! (Debug Mode)',
          breakStart: 'Break Start recorded successfully! (Debug Mode)',
          breakEnd: 'Break End recorded successfully! (Debug Mode)',
          clockOut: 'Clock Out successful! (Debug Mode)'
        };
        
        const successMessage = actionMessages[type] || 'Scan successful! (Debug Mode)';
        console.log("Debug mode success:", successMessage);
        
        // Add a small delay to simulate processing
        setTimeout(() => {
          setScanSuccess({ message: successMessage, data: mockData });
          setIsProcessing(false);
        }, 1000);
        
        return;
      }
      
      // Normal API call (when online and not in debug mode)
      console.log("Making API call to record time entry");
      
      // Prepare the data for the API call
      const apiData = {
        placeId: qrData,
        type,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        }
      };

      try {
        // Make the API call
        const response = await fetch(`${API_URL}/time-entries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`
          },
          body: JSON.stringify(apiData),
        });

        if (!response.ok) {
          // If server returns an error, try to save offline
          if (response.status >= 500 || response.status === 0) {
            console.log("Server error, attempting to save offline");
            setServerAvailable(false);
            setOfflineMode(true);
            
            // Recursively call this function again - it will now use the offline path
            return processWithLocation(qrData, locationData);
          }
          
          // Handle other errors
          const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
          throw new Error(errorData.message || `Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Set success state with message
        const actionMessages = {
          clockIn: 'Clock In successful!',
          breakStart: 'Break Start recorded successfully!',
          breakEnd: 'Break End recorded successfully!',
          clockOut: 'Clock Out successful!'
        };
        
        const successMessage = actionMessages[type] || 'Scan successful!';
        setScanSuccess({ message: successMessage, data });
        
        // Since we successfully made an API call, check if we have any offline entries to sync
        if (pendingOfflineEntries > 0) {
          syncOfflineEntries();
        }
      } catch (error) {
        console.error('Error processing scan:', error);
        
        // If there's a network error, try to save offline
        if (error instanceof TypeError && error.message.includes('network')) {
          console.log("Network error, attempting to save offline");
          setServerAvailable(false);
          setOfflineMode(true);
          
          // Recursively call this function again - it will now use the offline path
          return processWithLocation(qrData, locationData);
        }
        
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('API error:', error);
      let errorMessage = error instanceof Error ? error.message : 'Failed to process time entry';
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  // Handle success confirmation
  const handleSuccessConfirm = () => {
    if (scanSuccess) {
      onScan(scanSuccess.data);
    }
  };

  // Stop scanning and release resources
  const stopScanning = useCallback(() => {
    // Stop animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);
  
  // jsQR scanning loop
  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      console.log("Missing refs for scanning:", {
        video: !!videoRef.current,
        canvas: !!canvasRef.current,
        stream: !!streamRef.current
      });
      
      // Try again in a moment if video isn't ready
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          scanQRCode();
        }
      }, 500);
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      console.error("Failed to get canvas context");
      return;
    }
    
    try {
      // Check if video is ready
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log("Video not ready yet, waiting...");
        animationRef.current = requestAnimationFrame(scanQRCode);
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for QR code scanning
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Scan for QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      // Process QR code if found
      if (code) {
        console.log("QR code detected with data:", code.data);
        processQrCode(code.data);
        return;
      }
    } catch (error) {
      console.error("Error in QR scanning loop:", error);
    }
    
    // Continue scanning
    animationRef.current = requestAnimationFrame(scanQRCode);
  }, []);
  
  // Start camera and scanning
  const startScanning = useCallback(async () => {
    if (!selectedCamera) {
      setError('No camera selected. Please select a camera.');
      return;
    }

    try {
      // Stop any existing stream
      stopScanning();
      
      // Get camera stream
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 }
        }
      };
      
      console.log("Requesting camera with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, playing video");
          videoRef.current?.play().catch(err => {
            console.error("Error playing video:", err);
          });
        };
        
        // Fallback if onloadedmetadata doesn't fire
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            console.log("Fallback: trying to play video after timeout");
            videoRef.current.play().catch(err => {
              console.error("Error playing video in fallback:", err);
            });
          }
        }, 1000);
      } else {
        console.error("Video element not found");
      }
      
      // Start jsQR scanning loop after a short delay to ensure video is ready
      setTimeout(() => {
        console.log("Starting QR scanning loop");
        scanQRCode();
      }, 1500);
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to start camera. Please check permissions and try again.');
    }
  }, [selectedCamera, scanQRCode, stopScanning]);
  
  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
  };
  
  // Simulate a successful QR scan for testing
  const simulateSuccessfulScan = () => {
    if (!isProcessing && debugMode) {
      setIsProcessing(true);
      // Use one of our actual place IDs for testing
      const testQRData = "ChIJMVmxBW2wEmsROqYsviTainU"; // Home location
      console.log("Simulating successful scan with data:", testQRData);
      
      // Create mock data directly without API call
      const mockData = {
        id: "debug-entry-" + Date.now(),
        userId: "debug-user",
        timestamp: new Date().toISOString(),
        type: type,
        location: {
          latitude: -33.8977679,
          longitude: 151.1544713
        },
        placeId: testQRData
      };
      
      // Set success state with message
      const actionMessages = {
        clockIn: 'Clock In successful! (Debug Mode)',
        breakStart: 'Break Start recorded successfully! (Debug Mode)',
        breakEnd: 'Break End recorded successfully! (Debug Mode)',
        clockOut: 'Clock Out successful! (Debug Mode)'
      };
      
      const successMessage = actionMessages[type] || 'Scan successful! (Debug Mode)';
      
      // Add a small delay to simulate processing
      setTimeout(() => {
        setScanSuccess({ message: successMessage, data: mockData });
        setIsProcessing(false);
      }, 1000);
    }
  };
  
  // Handle login redirect
  const handleLoginRedirect = () => {
    // Clear any existing tokens
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    // Redirect to login page
    window.location.href = '/login';
  };
  
  // Initialize on mount
  useEffect(() => {
    getCameras();
    
    // Auto-enable debug mode in production
    if (import.meta.env.PROD) {
      setDebugMode(true);
      setSkipLocationCheck(true);
      console.log("Production environment detected. Debug mode and skip location check enabled by default.");
      
      // Check server availability
      checkServerAvailability().then(isAvailable => {
        if (!isAvailable) {
          console.log("Server is not available. Forcing debug mode.");
          setDebugMode(true);
          setSkipLocationCheck(true);
        }
      });
    }
    
    return () => {
      stopScanning();
    };
  }, []);
  
  // Start scanning when camera is selected
  useEffect(() => {
    if (selectedCamera) {
      startScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [selectedCamera]);
  
  // Handle camera selection change
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(e.target.value);
  };
  
  // Reset scanner
  const resetScanner = () => {
    setScanSuccess(null);
    setScanError(null);
    setIsProcessing(false);
    
    // Restart the scanner if it was stopped
    startScanning();
  };
  
  // Handle retry button click
  const handleRetry = () => {
    resetScanner();
  };
  
  const titles = {
    clockIn: 'Clock In',
    breakStart: 'Break Start',
    breakEnd: 'Break End',
    clockOut: 'Clock Out'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-full max-w-md">
        {/* Hidden canvas for QR scanning */}
        <canvas ref={canvasRef} className="hidden" width="640" height="480" />
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">QR Scanner - {titles[type]}</h2>
          
          {/* Status indicators */}
          <div className="status-indicators flex flex-col items-end text-xs">
            {/* Server status indicator */}
            <div className={`server-status px-2 py-1 rounded mb-1 ${
              serverAvailable === true 
                ? 'bg-green-100 text-green-800' 
                : serverAvailable === false 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {serverAvailable === true 
                ? '✓ Server Online' 
                : serverAvailable === false 
                  ? '✗ Server Offline' 
                  : '? Server Status Unknown'}
            </div>
            
            {/* Offline mode indicator */}
            {offlineMode && (
              <div className="offline-mode-indicator bg-yellow-100 text-yellow-800 px-2 py-1 rounded mb-1">
                <span>📱 Offline Mode</span>
                {pendingOfflineEntries > 0 && (
                  <span className="pending-syncs ml-1 bg-yellow-200 px-1 rounded-full">
                    {pendingOfflineEntries}
                  </span>
                )}
              </div>
            )}
            
            {/* Debug mode indicator */}
            {debugMode && (
              <div className="debug-mode-indicator bg-purple-100 text-purple-800 px-2 py-1 rounded">
                🐞 Debug Mode
              </div>
            )}
          </div>
        </div>
        
        {/* Manual sync button */}
        {pendingOfflineEntries > 0 && serverAvailable && (
          <div className="mb-4">
            <button 
              onClick={() => syncOfflineEntries()}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center justify-center"
              disabled={isProcessing}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync {pendingOfflineEntries} Offline {pendingOfflineEntries === 1 ? 'Entry' : 'Entries'}
            </button>
          </div>
        )}
        
        {/* QR Scanner content */}
        {!scanSuccess && !scanError && (
          <>
            <div className="relative aspect-square w-full mb-4 bg-gray-100 rounded overflow-hidden">
              {/* QR Scanner video */}
              <div ref={videoContainerRef} className="absolute inset-0">
                <video ref={videoRef} className="h-full w-full object-cover" />
              </div>
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="scanner-overlay">
                  <div className="scanner-line"></div>
                </div>
              </div>
              
              {/* Processing indicator */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="spinner mb-2"></div>
                    <p>Processing...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex flex-col space-y-4">
              {/* Debug mode toggle */}
              <div className="flex items-center justify-between">
                <label htmlFor="debug-mode" className="text-sm font-medium text-gray-700">
                  Debug Mode
                  <span className="ml-2 text-xs text-gray-500">(Bypasses API calls)</span>
                </label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="debug-mode" 
                    checked={debugMode} 
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label 
                    htmlFor="debug-mode" 
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${debugMode ? 'bg-green-400' : 'bg-gray-300'}`}
                  ></label>
                </div>
              </div>
              
              {/* Skip location check toggle */}
              <div className="flex items-center justify-between">
                <label htmlFor="skip-location" className="text-sm font-medium text-gray-700">
                  Skip Location Check
                  <span className="ml-2 text-xs text-gray-500">(For testing only)</span>
                </label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="skip-location" 
                    checked={skipLocationCheck} 
                    onChange={(e) => setSkipLocationCheck(e.target.checked)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label 
                    htmlFor="skip-location" 
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${skipLocationCheck ? 'bg-green-400' : 'bg-gray-300'}`}
                  ></label>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex space-x-2">
                <button 
                  onClick={onClose} 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRetry} 
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                >
                  Reset
                </button>
              </div>
              
              {/* Debug test button */}
              {debugMode && (
                <button 
                  onClick={simulateSuccessfulScan}
                  className="w-full mt-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
                  disabled={isProcessing}
                >
                  Test Scan (Debug)
                </button>
              )}
            </div>
          </>
        )}
        
        {/* Success message */}
        {scanSuccess && (
          <div className="text-center">
            <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-medium">{scanSuccess.message}</p>
              {offlineMode && (
                <p className="text-xs mt-2">Entry saved offline and will sync when connection is restored.</p>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded w-full"
            >
              Close
            </button>
          </div>
        )}
        
        {/* Error message */}
        {scanError && (
          <div className="text-center">
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="font-medium">Error</p>
              <p className="text-sm">{scanError}</p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={onClose} 
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
              >
                Close
              </button>
              <button 
                onClick={handleRetry} 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}