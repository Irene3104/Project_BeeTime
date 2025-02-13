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
        throw new Error('No authentication token found');
      }

      console.log('Getting current position...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.error('Geolocation error:', error);
            reject(new Error(
              error.code === 1 ? 'Please enable location access to clock in' :
              error.code === 2 ? 'Unable to determine your location' :
              error.code === 3 ? 'Location request timed out' :
              'Failed to get your location'
            ));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      console.log('Got position:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });

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
          type,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to verify location';
        let errorDetails = [];
        
        if (data.details) {
          errorDetails.push(data.details);
        }

        if (data.googleMapsStatus) {
          errorDetails.push(`Google Maps Status: ${data.googleMapsStatus}`);
        }

        if (data.placeId) {
          errorDetails.push(`Place ID: ${data.placeId}`);
        }
        
        if (data.coordinates) {
          const workplace = data.coordinates.workplace;
          const user = data.coordinates.user;
          
          errorDetails.push(
            `Workplace: ${workplace.name}`,
            `Address: ${workplace.address}`,
            `Place ID: ${workplace.placeId}`,
            `Workplace coordinates: (${workplace.lat}, ${workplace.lng})`,
            `Your coordinates: (${user.lat}, ${user.lng})`,
            `GPS Accuracy: ${user.accuracy}m`
          );
        }

        if (data.distance) {
          errorDetails.push(`Distance: ${data.distance}m`);
        }

        const fullError = [errorMessage, ...errorDetails].join('\n');
        console.error('Location verification failed:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(fullError);
      }

      if (data.success) {
        console.log('Time entry recorded successfully:', data.data);
        return true;
      } else {
        throw new Error('Failed to record time entry');
      }
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return false;
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      console.log('Scanned QR code:', decodedText);
      setError(null); // Clear any previous errors
      const success = await verifyLocationAndRecord(decodedText);
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
        fps: 30,
        qrbox: { width: 300, height: 300 },
        videoConstraints: {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        },
        showTorchButtonIfSupported: true,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        aspectRatio: 1.0
      },
      false
    );

    let lastErrorTime = 0;
    const ERROR_COOLDOWN = 2000;

    scanner.render(onScanSuccess, (error) => {
      const now = Date.now();
      if (!error.includes("No QR code found") && 
          !error.includes("No MultiFormat Readers") && 
          !error.includes("No barcode") &&
          now - lastErrorTime > ERROR_COOLDOWN) {
        console.error('QR Scan error:', error);
        lastErrorTime = now;
      }
    });

    return () => {
      scanner.clear().catch(console.error);
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