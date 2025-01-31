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
  const scannerRef = useRef<Html5Qrcode | null>(null);

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
    // Check if the browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access');
      return;
    }

    // Request camera permission with specific constraints for mobile
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Prefer back camera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
      .then(stream => {
        // Permission granted, initialize scanner
        stream.getTracks().forEach(track => track.stop());
        initializeScanner();
      })
      .catch(err => {
        console.error('Camera permission error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Please allow camera access to scan QR codes');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on your device');
        } else {
          setError('Failed to access camera. Please try again.');
        }
      });
  }, []);

  const initializeScanner = () => {
    try {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: 250,
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true // Add flashlight button for Android
        },
        false
      );
      
      html5QrcodeScanner.render(onScanSuccess, onScanError);
    } catch (err) {
      console.error('Scanner initialization error:', err);
      setError('Failed to start QR scanner');
    }
  };

  const titles = {
    clockIn: 'Clock In',
    breakStart: 'Break Start',
    breakEnd: 'Break End',
    clockOut: 'Clock Out'
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white">
        <X className="w-6 h-6" />
      </button>
      
      <h2 className="text-white mb-8">Scan QR Code for {titles[type]}</h2>
      
      {error && (
        <div className="bg-red-500 text-white p-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="border-2 border-white w-64 h-64 mb-8">
        <div id="qr-reader" className="w-full h-full" />
      </div>

      <Button onClick={onClose}>Cancel</Button>
    </div>
  );
}