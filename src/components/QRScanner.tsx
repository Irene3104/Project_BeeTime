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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('인증에 실패했습니다.');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const response = await fetch('http://localhost:3000/time-entries/verify-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  // Add 'Bearer ' prefix
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
        throw new Error(data.error || '인증에 실패했습니다.');
      }

      return true;
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : '인증에 실패했습니다.');
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

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        videoConstraints: {
          facingMode: "environment"
        },
        showTorchButtonIfSupported: true
      },
      false
    );

    scanner.render(onScanSuccess, (error) => {
      if (!error.includes("No QR code found")) {
        console.error('QR Scan error:', error);
      }
    });

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-center">Scan QR Code for {titles[type]}</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
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