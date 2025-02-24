import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function generateQRForLocation() {
  try {
    // Get all locations from database
    const locations = await prisma.location.findMany();
    
    if (locations.length === 0) {
      console.log('No locations found in database');
      return;
    }

    // Create qr-codes directory if it doesn't exist
    const qrDir = path.join(process.cwd(), 'public', 'qr-codes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    console.log('\nAvailable locations:');
    locations.forEach((loc, index) => {
      console.log(`${index + 1}. ${loc.name} (${loc.address})`);
    });

    // Generate QR code for each location
    for (const location of locations) {
      const fileName = `${location.name.replace(/\s+/g, '_')}_${location.placeId.substring(0, 8)}.png`;
      const filePath = path.join(qrDir, fileName);
      
      // Generate QR code
      await QRCode.toFile(filePath, location.placeId, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      console.log(`\nGenerated QR code for ${location.name}:`);
      console.log(`- File: ${fileName}`);
      console.log(`- Place ID: ${location.placeId}`);
      console.log(`- Path: ${filePath}`);
    }

    console.log('\nQR codes have been generated in:', qrDir);

  } catch (error) {
    console.error('Error generating QR codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateQRForLocation();