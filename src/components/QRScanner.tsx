import { Html5Qrcode } from 'html5-qrcode';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { API_URL } from '../config/constants';

interface QRScannerProps {
  type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut';
  onClose: () => void;
  onScan: () => void;
}

export function QRScanner({ type, onClose, onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  
  const verifyLocationAndRecord = async (placeId: string) => {
    try {
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const response = await fetch(`${API_URL}/time-entries/verify-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          placeId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          type,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record time');
      }

      return true;
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Please enable location access to use this feature');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information is unavailable');
            break;
          case error.TIMEOUT:
            setError('Location request timed out');
            break;
          default:
            setError('Failed to get location');
        }
      } else {
        setError(error instanceof Error ? error.message : 'Failed to verify location');
      }
      return false;
    }
  };

  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner;

    const initializeScanner = async () => {
      try {
        setScanning(true);
        // First check for camera permissions
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: 'environment'  // Prefer back camera
          }
        });
        // Stop the stream immediately as Html5QrcodeScanner will request it again
        stream.getTracks().forEach(track => track.stop());

        // Initialize scanner with more options
        html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            rememberLastUsedCamera: true,
            videoConstraints: {
              facingMode: { exact: "environment" }
            }
          },
          false
        );

        await html5QrcodeScanner.render(
          async (decodedText) => {
            console.log("QR Code detected:", decodedText);
            const success = await verifyLocationAndRecord(decodedText);
            if (success) {
              html5QrcodeScanner.clear();
              onScan();
            }
          },
          (errorMessage) => {
            console.log("QR Scan error:", errorMessage);
          }
        );

        setScanning(true);
      } catch (err) {
        console.error('Scanner initialization error:', err);
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access and try again.');
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
          setError('No camera found. Please ensure your device has a camera.');
        } else {
          setError(`Failed to start scanner: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        setScanning(false);
      }
    };

    initializeScanner();

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(console.error);
      }
    };
  }, []);

  const titles = {
    clockIn: 'Clock In',
    breakStart: 'Break Start',
    breakEnd: 'Break End',
    clockOut: 'Clock Out'
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white"
      >
        <X size={24} />
      </button>
      
      <h2 className="text-white text-xl mb-8">
        Scan QR Code for {titles[type]}
      </h2>

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 rounded mb-4 max-w-sm text-center">
          {error}
        </div>
      )}

      <div id="qr-reader" className="w-full max-w-sm" />

      <button
        onClick={onClose}
        className="mt-8 px-6 py-2 bg-[#FDCF17] text-white rounded-full"
      >
        Cancel
      </button>
    </div>
  );
}