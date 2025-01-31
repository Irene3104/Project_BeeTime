import { Html5QrcodeScanner } from 'html5-qrcode';
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
      // First check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Request permission explicitly first
      const permissionResult = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permissionResult.state === 'denied') {
        throw new Error('Location access denied. Please enable location in your device settings.');
      }

      // Then get position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
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
    const initializeScanner = async () => {
      try {
        // Test camera access first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } }
        }).catch(async () => {
          // If environment camera fails, try any camera
          return await navigator.mediaDevices.getUserMedia({ video: true });
        });
        
        // If we got here, we have camera access
        stream.getTracks().forEach(track => track.stop());

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: 250,
            videoConstraints: {
              facingMode: "environment"
            }
          },
          /* verbose= */ true
        );

        scanner.render(
          async (decodedText) => {
            console.log("QR Code detected:", decodedText);
            const success = await verifyLocationAndRecord(decodedText);
            if (success) {
              scanner.clear();
              onScan();
            }
          },
          (error) => {
            console.log("QR Scan error:", error);
          }
        );

      } catch (err) {
        console.error('Camera error:', err);
        setError(err instanceof Error ? err.message : 'Failed to access camera');
      }
    };

    initializeScanner();
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