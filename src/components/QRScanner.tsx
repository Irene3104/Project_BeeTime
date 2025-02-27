import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config/constants';
import jsQR from 'jsqr';
import { BrowserQRCodeReader } from '@zxing/library';

interface QRScannerProps {
  type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut';
  onClose: () => void;
  onScan: (data?: any) => void;
}

// Add a type for valid time entry types
type TimeEntryType = 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';

export function QRScanner({ type, onClose, onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [scanMethod, setScanMethod] = useState<'jsqr' | 'zxing'>('jsqr');
  const [scanSuccess, setScanSuccess] = useState<{ message: string; data: any } | null>(null);
  const [manualLocationMode, setManualLocationMode] = useState(false);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '' });
  const [scannedQRData, setScannedQRData] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(true);
  const [loginStatus, setLoginStatus] = useState<string>('Checking...');
  const [serverStatus, setServerStatus] = useState<string>('Unknown');
  const [skipLocationCheck, setSkipLocationCheck] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<BrowserQRCodeReader | null>(null);
  
  // Get available cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      // Select the back camera by default if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      if (backCamera) {
        setSelectedCamera(backCamera.deviceId);
        console.log("Selected back camera:", backCamera.label);
      } else if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
        console.log("Selected first available camera:", videoDevices[0].label);
      }
      
      // Force camera selection if none was selected
      if (videoDevices.length > 0 && !selectedCamera) {
        setTimeout(() => {
          if (!selectedCamera && videoDevices.length > 0) {
            console.log("Forcing camera selection");
            setSelectedCamera(videoDevices[0].deviceId);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }, [selectedCamera]);

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
          // More user-friendly error message based on error code
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
          timeout: 15000, // Increased from 5000ms to 15000ms (15 seconds)
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

      // If we're skipping location check in debug mode
      if (debugMode && skipLocationCheck) {
        await processWithLocation(decodedText, {
          latitude: 0,
          longitude: 0,
          accuracy: 0
        });
        return;
      }

      try {
        const position = await getCurrentPosition();
        await processWithLocation(decodedText, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      } catch (geoError) {
        console.error('Geolocation error:', geoError);
        // Save the QR data and show manual location entry
        setScannedQRData(decodedText);
        setManualLocationMode(true);
        setError(geoError instanceof Error ? geoError.message : 'Failed to get your location');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process scan');
      // Restart scanning if there was an error
      startScanning();
      setIsProcessing(false);
    }
  };

  // Process with location data (either from geolocation or manual entry)
  const processWithLocation = async (qrData: string, locationData: { latitude: number, longitude: number, accuracy?: number }) => {
    try {
      const now = new Date();
      
      // Debug mode - bypass API call
      if (debugMode) {
        console.log("Debug mode: Bypassing API call");
        console.log("QR Data:", qrData);
        console.log("Location:", locationData);
        
        // Simulate successful response
        const mockData = {
          id: "debug-entry-" + Date.now(),
          userId: "debug-user",
          timestamp: now.toISOString(),
          type: type,
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
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
      
      // Rest of the function for non-debug mode
      // Check if API_URL is defined
      if (!API_URL) {
        throw new Error('API URL is not defined. Please check your configuration.');
      }
      
      // Get token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const apiEndpoint = `${API_URL}/time-entries/verify-location`;
      console.log("Sending request to:", apiEndpoint);
      console.log("With token:", token.substring(0, 10) + '...');
      
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            placeId: qrData,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy || 0,
            type: type,
            timestamp: now.toISOString()
          })
        });

        // Handle different HTTP status codes
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          throw new Error('API endpoint not found. Please check server configuration.');
        } else if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
          throw new Error(errorData.error || errorData.details || `Server error: ${response.status}`);
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
      } catch (fetchError) {
        // Handle network errors specifically
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          console.error('Network error:', fetchError);
          throw new Error(`Cannot connect to server at ${API_URL}. Please check your internet connection.`);
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('API error:', error);
      
      // Handle specific error messages
      let errorMessage = error instanceof Error ? error.message : 'Failed to verify location';
      
      setError(errorMessage);
      
      // Restart scanning if there was an error with the API
      if (!manualLocationMode) {
        startScanning();
      }
    } finally {
      // Only set isProcessing to false if we're not in debug mode
      // For debug mode, we handle this in the setTimeout
      if (!debugMode) {
        setIsProcessing(false);
      }
    }
  };

  // Handle manual location submission
  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scannedQRData) {
      setError('No QR code data available. Please scan again.');
      return;
    }
    
    const lat = parseFloat(manualLocation.latitude);
    const lng = parseFloat(manualLocation.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid latitude and longitude values.');
      return;
    }
    
    setIsProcessing(true);
    processWithLocation(scannedQRData, {
      latitude: lat,
      longitude: lng
    });
  };

  // Handle manual location input change
  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualLocation(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Cancel manual location entry and restart scanning
  const handleCancelManualLocation = () => {
    setManualLocationMode(false);
    setScannedQRData(null);
    setError(null);
    startScanning();
  };

  // Handle success confirmation
  const handleSuccessConfirm = () => {
    if (scanSuccess) {
      // Call the onScan callback with the data
      onScan(scanSuccess.data);
    }
  };

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
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      if (scanMethod === 'jsqr') {
        // Start jsQR scanning loop
        scanQRCode();
      } else {
        // Start ZXing scanning
        startZXingScanner();
      }
      
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to start camera. Please check permissions and try again.');
    }
  }, [selectedCamera, scanMethod]);
  
  // Stop scanning and release resources
  const stopScanning = useCallback(() => {
    // Stop animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop ZXing scanner
    if (zxingReaderRef.current) {
      zxingReaderRef.current.reset();
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
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
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
      processQrCode(code.data);
      return;
    }
    
    // Continue scanning
    animationRef.current = requestAnimationFrame(scanQRCode);
  }, []);
  
  // ZXing scanning
  const startZXingScanner = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (!zxingReaderRef.current) {
        zxingReaderRef.current = new BrowserQRCodeReader();
      }
      
      const result = await zxingReaderRef.current.decodeFromVideoElement(videoRef.current);
      if (result) {
        processQrCode(result.getText());
      }
    } catch (err) {
      console.error('ZXing error:', err);
      // Switch to jsQR if ZXing fails
      setScanMethod('jsqr');
      startScanning();
    }
  }, []);
  
  // Toggle between scanning methods
  const toggleScanMethod = useCallback(() => {
    setScanMethod(prev => prev === 'jsqr' ? 'zxing' : 'jsqr');
  }, []);
  
  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
  };
  
  // Simulate a successful QR scan for testing
  const simulateSuccessfulScan = () => {
    if (debugMode) {
      setIsProcessing(true);
      const testQRData = "TEST_QR_CODE_" + Date.now();
      console.log("Simulating successful scan with data:", testQRData);
      
      // Directly use processWithLocation instead of processQrCode to bypass geolocation
      processWithLocation(testQRData, {
        latitude: -33.8688, // Sydney coordinates as example
        longitude: 151.2093,
        accuracy: 10
      });
    }
  };
  
  // Check login status
  const checkLoginStatus = useCallback(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setLoginStatus('Not logged in (no token found)');
      return;
    }
    
    try {
      // Check if token is valid JSON
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        setLoginStatus('Invalid token format');
        return;
      }
      
      // Try to decode the payload
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiry = payload.exp ? new Date(payload.exp * 1000) : null;
        const isExpired = expiry ? expiry < new Date() : false;
        
        setLoginStatus(
          `Token found (${token.substring(0, 10)}...), ` + 
          (isExpired ? 'EXPIRED' : 'valid') +
          (expiry ? ` until ${expiry.toLocaleString()}` : '')
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setLoginStatus(`Token found but couldn't decode: ${errorMessage}`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setLoginStatus(`Error checking token: ${errorMessage}`);
    }
  }, []);
  
  // Check server status
  const checkServerStatus = useCallback(async () => {
    if (!API_URL) {
      setServerStatus('API URL not defined');
      return;
    }
    
    setServerStatus('Checking...');
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/time-entries/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // Short timeout to quickly detect if server is down
        signal: AbortSignal.timeout(3000)
      }).catch(error => {
        throw new Error(`Network error: ${error.message}`);
      });
      
      const elapsed = Date.now() - startTime;
      
      if (response.ok) {
        setServerStatus(`Online (${elapsed}ms)`);
      } else {
        setServerStatus(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setServerStatus(`Offline: ${errorMessage}`);
    }
  }, [API_URL]);
  
  // Check login status when debug mode is enabled
  useEffect(() => {
    if (debugMode) {
      checkLoginStatus();
    }
  }, [debugMode, checkLoginStatus]);
  
  // Check server status when debug mode is enabled
  useEffect(() => {
    if (debugMode) {
      checkServerStatus();
    }
  }, [debugMode, checkServerStatus]);
  
  // Initialize on mount - auto-trigger debug mode and check login
  useEffect(() => {
    getCameras();
    // Auto-check login status on mount
    checkLoginStatus();
    checkServerStatus();
    
    // Auto-select first camera after a short delay
    const timer = setTimeout(() => {
      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
    }, 1000);
    
    return () => {
      stopScanning();
      clearTimeout(timer);
    };
  }, [cameras]);
  
  // Auto-trigger test success in debug mode after a delay
  useEffect(() => {
    if (debugMode && !scanSuccess && !isProcessing) {
      const autoTestTimer = setTimeout(() => {
        console.log("Auto-triggering test success");
        simulateSuccessfulScan();
      }, 3000);
      
      return () => clearTimeout(autoTestTimer);
    }
  }, [debugMode, scanSuccess, isProcessing]);
  
  // Start scanning when camera is selected or scan method changes
  useEffect(() => {
    if (selectedCamera) {
      startScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [selectedCamera, scanMethod]);
  
  // Handle camera selection change
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(e.target.value);
  };
  
  // Retry scanning
  const handleRetry = () => {
    setError(null);
    setScanSuccess(null);
    startScanning();
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
        <h2 className="text-xl font-bold mb-4 text-center">Scan QR Code for {titles[type]}</h2>
        
        {/* Debug mode toggle - Moved to top for better visibility */}
        <div className="mb-4 p-3 bg-yellow-100 rounded border-2 border-yellow-400">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="debug-mode"
                checked={debugMode}
                onChange={toggleDebugMode}
                className="mr-2 h-6 w-6"
              />
              <label htmlFor="debug-mode" className="text-base font-bold text-gray-700">
                Debug Mode (ENABLED)
              </label>
            </div>
          </div>
          
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="skip-location"
              checked={skipLocationCheck}
              onChange={() => setSkipLocationCheck(prev => !prev)}
              className="mr-2 h-6 w-6"
            />
            <label htmlFor="skip-location" className="text-base text-gray-700 font-bold">
              Skip Location Check
            </label>
          </div>
          
          {/* Make Test Success button more prominent */}
          <button
            onClick={simulateSuccessfulScan}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-lg font-bold mb-2"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Test Success (Click Here)"}
          </button>
          
          <div className="text-sm bg-white p-2 rounded overflow-auto max-h-32 border border-gray-200">
            <p className="font-bold">Debug Info:</p>
            <p>API URL: {API_URL || 'Not defined'}</p>
            <p>Server Status: <span className={serverStatus.includes('Online') ? 'text-green-600' : 'text-red-600'}>{serverStatus}</span></p>
            <p>Login Status: {loginStatus}</p>
            <p>Camera Selected: {selectedCamera || 'None'}</p>
            <div className="flex space-x-2 mt-1">
              <button 
                onClick={checkLoginStatus}
                className="bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs"
              >
                Check Login
              </button>
              <button 
                onClick={checkServerStatus}
                className="bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs"
              >
                Check Server
              </button>
            </div>
          </div>
        </div>
        
        {/* Success message */}
        {scanSuccess ? (
          <div className="text-center">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-6 rounded mb-4">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="text-xl font-bold mb-2">{scanSuccess.message}</h3>
              <p className="mb-4">Your time has been recorded successfully.</p>
              <button 
                onClick={handleSuccessConfirm}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full w-full"
              >
                OK
              </button>
            </div>
          </div>
        ) : manualLocationMode ? (
          <div>
            <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p className="font-bold">Location services unavailable</p>
              <p className="text-sm">Please enter your current location manually to continue.</p>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleManualLocationSubmit} className="space-y-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  id="latitude"
                  name="latitude"
                  value={manualLocation.latitude}
                  onChange={handleLocationInputChange}
                  placeholder="e.g. -33.8688"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  id="longitude"
                  name="longitude"
                  value={manualLocation.longitude}
                  onChange={handleLocationInputChange}
                  placeholder="e.g. 151.2093"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleCancelManualLocation}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-full"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-full"
                  disabled={isProcessing}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Camera selection */}
            <div className="mb-4">
              <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Camera:
              </label>
              <select
                id="camera-select"
                value={selectedCamera}
                onChange={handleCameraChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isProcessing}
              >
                <option value="">Select a camera</option>
                {cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.substr(0, 5)}...`}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Scanning tips */}
            <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <p className="font-bold">Tips for scanning:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Ensure good lighting</li>
                <li>Hold your phone steady</li>
                <li>Position the QR code in the center of the frame</li>
                <li>Make sure the entire QR code is visible</li>
              </ul>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
                <button 
                  onClick={handleRetry}
                  className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-sm"
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* Processing message */}
            {isProcessing && (
              <div className="mb-4 text-center text-gray-600 bg-gray-100 p-3 rounded">
                Processing scan, please wait...
              </div>
            )}
            
            {/* Video preview */}
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '300px' }}>
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-2 border-white opacity-50"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-yellow-400">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-400"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-400"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-400"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-400"></div>
                </div>
              </div>
              
              {/* Hidden canvas for processing */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            {/* Action buttons */}
            <div className="mt-4 flex space-x-2">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-full"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={toggleScanMethod}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-full"
                disabled={isProcessing}
              >
                {scanMethod === 'jsqr' ? 'Try Alternative Method' : 'Switch to Default'}
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 bg-yellow-400 text-white py-2 px-4 rounded-full"
                disabled={isProcessing}
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}