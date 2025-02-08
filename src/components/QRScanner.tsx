import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
      // Validate QR code format
      const locationId = parseInt(placeId, 10);
      if (isNaN(locationId)) {
        throw new Error('Invalid QR code format');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.error('Geolocation error:', error);
            if (error.code === 1) {
              reject(new Error('Please enable location access in your browser settings'));
            } else {
              reject(new Error('Failed to get location. Please try again.'));
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
          }
        );
      });

      const response = await fetch(`${API_URL}/time-entries/verify-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          placeId: locationId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          type,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify location');
      }

      return true;
    } catch (error) {
      console.error('Verification error:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify location');
      return false;
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      // Log the scanned value
      console.log('Scanned QR code:', decodedText);

      // First try to get location by placeId
      const response = await fetch(`${API_URL}/locations/by-place-id/${decodedText}`);
      if (!response.ok) {
        throw new Error('Invalid location QR code');
      }
      
      const location = await response.json();
      const success = await verifyLocationAndRecord(location.id.toString());
      
      if (success) {
        onScan?.();
      }
    } catch (error) {
      console.error('Scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process QR code');
    }
  };

  const scanner = new Html5QrcodeScanner(
    "qr-reader",
    { 
      fps: 10,
      qrbox: { width: 250, height: 250 },
      videoConstraints: {
        facingMode: "environment"  // Removed 'exact' constraint
      },
      showTorchButtonIfSupported: true
    },
    false
  );

  useEffect(() => {
    // Simple render without trying to access camera first
    scanner.render(
      async (decodedText) => {
        console.log('Successfully scanned QR code:', decodedText);
        try {
          const success = await verifyLocationAndRecord(decodedText);
          if (success) {
            onScan?.();
          }
        } catch (error) {
          console.error('Verification error:', error);
          setError(error instanceof Error ? error.message : 'Failed to verify location');
        }
      },
      (error) => {
        if (!error.includes("No QR code found")) {
          console.error('QR Scan error:', error);
        }
      }
    );

    return () => {
      scanner.clear();
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

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}