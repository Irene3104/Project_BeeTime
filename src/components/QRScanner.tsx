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

// Add a type for valid time entry types
type TimeEntryType = 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';

export function QRScanner({ type, onClose, onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

  const handleScan = async (decodedText: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setError(null);

      const position = await getCurrentPosition();
      const now = new Date();
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(`${API_URL}/time-entries/verify-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          placeId: decodedText,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          type: type,
          timestamp: now.toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to verify location');
      }

      const data = await response.json();
      onScan?.(data);

    } catch (error) {
      console.error('Scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process scan');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let readerElement = document.getElementById('reader');
    if (!readerElement) {
      readerElement = document.createElement('div');
      readerElement.id = 'reader';
      document.querySelector('.scanner-wrapper')?.appendChild(readerElement);
    }

    // Optimized scanner configuration
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      {
        fps: 5, // Reduced for better performance
        qrbox: {
          width: 300,
          height: 300
        },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        disableFlip: true,
        videoConstraints: {
          facingMode: { exact: "environment" }, // Force rear camera
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      },
      /* verbose= */ false
    );

    scannerRef.current.render(handleScan, handleError);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
      readerElement?.remove();
    };
  }, []);

  const handleError = (err: any) => {
    console.error("QR Scanner Error:", err);
    setError("Camera error: Please check camera permissions and try again");
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
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {isProcessing && (
          <div className="mb-4 text-center text-gray-600">
            Processing scan, please wait...
          </div>
        )}
        <div className="scanner-wrapper" />
        <button
          onClick={onClose}
          className="mt-4 w-full bg-yellow-400 text-white py-2 px-4 rounded-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}