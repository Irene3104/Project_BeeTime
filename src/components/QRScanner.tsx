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

  const verifyLocationAndRecord = async (placeId: string) => {
    if (isProcessing) return; // Prevent multiple simultaneous requests
    
    try {
      setIsProcessing(true);
      setError(null);

      const position = await getCurrentPosition();
      const now = new Date();
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const makeRequest = async (attempt: number) => {
        try {
          const response = await fetch(`${API_URL}/time-entries/verify-location`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              placeId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              type: type as TimeEntryType,
              timestamp: now.toISOString()
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
              throw new Error('Session expired. Please log in again.');
            }
            throw new Error(errorData.error || errorData.details || 'Server error');
          }

          const data = await response.json();
          onScan?.(data);
          return data;

        } catch (error) {
          if (attempt < maxRetries && 
              (error instanceof Error && error.message.includes('ERR_INSUFFICIENT_RESOURCES') ||
               error instanceof Error && error.message.includes('Failed to fetch'))) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            return makeRequest(attempt + 1);
          }
          throw error;
        }
      };

      await makeRequest(0);

    } catch (error) {
      console.error('Scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process scan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScan = async (decodedText: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await verifyLocationAndRecord(decodedText);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Configure scanner with optimized settings
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10, // Reduce from default 30 fps to save resources
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        // Reduce scanning frequency
        disableFlip: true,
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false // Don't start scanning immediately
    );

    scannerRef.current.render(handleScan, handleError);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const handleError = (error: string) => {
    console.error('QR Scan error:', error);
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
        <div id="qr-reader" className="w-full"></div>
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