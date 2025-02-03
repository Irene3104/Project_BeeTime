import { PrismaClient } from '@prisma/client'
import { Client } from '@googlemaps/google-maps-services-js'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const googleMapsClient = new Client({})

async function updateLocations() {
  try {
    const locations = await prisma.location.findMany();
    
    for (const location of locations) {
      const response = await googleMapsClient.findPlaceFromText({
        params: {
          input: `${location.name} ${location.address}`,
          inputtype: 'textquery',
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      });

      const placeId = response.data.candidates[0]?.place_id;
      if (!placeId) {
        console.error(`No place ID found for ${location.name}`);
        continue;
      }

      await prisma.location.update({
        where: { id: location.id },
        data: { 
          placeId: placeId,
          updatedAt: new Date()
        }
      });

      console.log(`Updated ${location.name} with place ID: ${placeId}`);
    }
  } catch (error) {
    console.error('Error updating locations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLocations();