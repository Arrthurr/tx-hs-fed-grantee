import { Location } from '../types/maps';

/**
 * Major cities and points of interest in Texas
 * This data includes the most populous cities and important landmarks
 * with accurate coordinates and metadata
 */
export const texasCities: Location[] = [
  {
    id: 'houston',
    name: 'Houston',
    lat: 29.7604,
    lng: -95.3698,
    type: 'city',
    population: 2304580,
    description: 'Largest city in Texas, known for NASA Johnson Space Center and energy industry'
  },
  {
    id: 'san-antonio',
    name: 'San Antonio',
    lat: 29.4241,
    lng: -98.4936,
    type: 'city',
    population: 1547253,
    description: 'Historic city famous for the Alamo and River Walk'
  },
  {
    id: 'dallas',
    name: 'Dallas',
    lat: 32.7767,
    lng: -96.7970,
    type: 'city',
    population: 1304379,
    description: 'Major metropolitan area and business hub in North Texas'
  },
  {
    id: 'austin',
    name: 'Austin',
    lat: 30.2672,
    lng: -97.7431,
    type: 'city',
    population: 965872,
    description: 'State capital and tech hub, known for music and culture'
  },
  {
    id: 'fort-worth',
    name: 'Fort Worth',
    lat: 32.7555,
    lng: -97.3308,
    type: 'city',
    population: 918915,
    description: 'Historic cattle town and cultural center of the Metroplex'
  },
  {
    id: 'el-paso',
    name: 'El Paso',
    lat: 31.7619,
    lng: -106.4850,
    type: 'city',
    population: 695044,
    description: 'Border city with rich Hispanic culture and desert landscapes'
  },
  {
    id: 'arlington',
    name: 'Arlington',
    lat: 32.7357,
    lng: -97.1081,
    type: 'city',
    population: 394266,
    description: 'Home to major sports venues and entertainment districts'
  },
  {
    id: 'corpus-christi',
    name: 'Corpus Christi',
    lat: 27.8006,
    lng: -97.3964,
    type: 'city',
    population: 317863,
    description: 'Coastal city known for beaches and the Texas State Aquarium'
  },
  {
    id: 'plano',
    name: 'Plano',
    lat: 33.0198,
    lng: -96.6989,
    type: 'city',
    population: 285494,
    description: 'Affluent suburb of Dallas with excellent schools and corporate headquarters'
  },
  {
    id: 'lubbock',
    name: 'Lubbock',
    lat: 33.5779,
    lng: -101.8552,
    type: 'city',
    population: 258862,
    description: 'Hub of the South Plains region and home to Texas Tech University'
  },
  {
    id: 'laredo',
    name: 'Laredo',
    lat: 27.5064,
    lng: -99.5075,
    type: 'city',
    population: 255205,
    description: 'Major border crossing and international trade center'
  },
  {
    id: 'irving',
    name: 'Irving',
    lat: 32.8140,
    lng: -96.9489,
    type: 'city',
    population: 256684,
    description: 'Corporate hub home to many Fortune 500 companies'
  }
];

/**
 * Configuration for the Texas map center and bounds
 */
export const texasMapCenter = {
  lat: 31.9686,
  lng: -99.9018
};

/**
 * Approximate boundaries of Texas for map fitting
 */
export const texasBounds = {
  north: 36.5007,
  south: 25.8371,
  east: -93.5080,
  west: -106.6456
};