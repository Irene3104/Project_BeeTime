import { PrismaClient } from '@prisma/client';
import { Client, PlaceInputType } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const prisma = new PrismaClient();
const googleMapsClient = new Client({});

// Check for API key
if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.error('Error: GOOGLE_MAPS_API_KEY not found in environment variables');
  console.log('Please add your Google Maps API key to .env file:');
  console.log('GOOGLE_MAPS_API_KEY=your_api_key_here');
  process.exit(1);
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify the question method
const question = (query: string) => new Promise<string>((resolve) => rl.question(query, resolve));

async function addLocation() {
  try {
    // Gather location information interactively
    const name = await question('Enter location name: ');
    const branch = await question('Enter branch name (optional, press enter to skip): ');
    const company = await question('Enter company name: ');
    const address = await question('Enter full address: ');

    const newLocation = {
      name,
      branch: branch || null,
      company,
      address
    };

    console.log('\nAdding location with details:');
    console.log(newLocation);
    
    const confirm = await question('\nConfirm adding this location? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Operation cancelled');
      return;
    }

    console.log('\nFetching Place ID from Google Maps...');
    console.log('Using API Key:', process.env.GOOGLE_MAPS_API_KEY?.substring(0, 10) + '...');
    
    try {
      const response = await googleMapsClient.findPlaceFromText({
        params: {
          input: `${newLocation.name} ${newLocation.address}`,
          inputtype: PlaceInputType.textQuery,
          fields: ['place_id', 'formatted_address', 'name'],
          key: process.env.GOOGLE_MAPS_API_KEY || ''
        }
      });

      console.log('Google Maps API Response:', response.data);

      if (response.data.status === 'REQUEST_DENIED') {
        throw new Error(`Google Maps API request denied: ${response.data.error_message}`);
      }

      if (!response.data.candidates || response.data.candidates.length === 0) {
        throw new Error('No locations found. Please check the address and try again.');
      }

      const placeId = response.data.candidates[0].place_id;
      console.log('Found Place ID:', placeId);

      // Create location in database
      const location = await prisma.location.create({
        data: {
          name: newLocation.name,
          branch: newLocation.branch,
          company: newLocation.company,
          address: newLocation.address,
          placeId: placeId
        }
      });

      console.log('\nSuccessfully created new location:', location);

    } catch (apiError: any) {
      console.error('\nGoogle Maps API Error:');
      console.error('Status:', apiError.response?.status);
      console.error('Data:', apiError.response?.data);
      console.error('Message:', apiError.message);
      throw new Error('Failed to get Place ID from Google Maps');
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('\nError adding location:', error.message);
      if (error.message.includes('API key')) {
        console.log('\nPlease check your Google Maps API key in .env file');
      }
    } else {
      console.error('\nUnknown error occurred');
    }
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

addLocation();