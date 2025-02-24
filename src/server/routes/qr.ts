import { Router } from 'express';
// import { PrismaClient } from '@prisma/client'; // If needed for DB queries
// import { computeDistance } from 'somewhere/computeDistance'; // If you need to calculate actual distances

const router = Router();

// Example: POST /api/qr/verify
// Validate the incoming QR data, look up in DB, or do any custom logic you need
router.post('/verify', async (req, res) => {
  try {
    const { qrData, lat, lng } = req.body;

    // 1) Check that we have a QR code
    if (!qrData) {
      return res.status(400).json({ success: false, message: 'Missing qrData' });
    }

    // 2) Check location validity
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid location',
      });
    }

    // 3) (Optional) Retrieve location from DB using placeId or locationId
    // const prisma = new PrismaClient();
    // const location = await prisma.location.findUnique({ where: { placeId: qrData } });
    // if (!location) {
    //   return res.json({ success: false, message: 'Invalid or unknown QR code' });
    // }

    // // If you store lat/lng, you can check distance:
    // const distance = computeDistance(lat, lng, location.lat, location.lng);
    // if (distance > 100) {
    //   return res.json({ success: false, message: 'Out of range!' });
    // }

    // 4) If valid, optionally save a time record or log an event
    // const userId = ... get user from token or session ...
    // await prisma.timeRecord.create({
    //   data: {
    //     userId,
    //     locationId: location.id,
    //     timestamp: new Date(),
    //     // actionType: e.g. 'CLOCK_IN','BREAK_START','BREAK_END','CLOCK_OUT'
    //   }
    // });

    // 5) Return success
    return res.json({ success: true, message: 'QR code and location verified!' });
  } catch (error) {
    console.error('Error verifying QR code:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
});

export default router; 