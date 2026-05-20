import type { TxhsaRegionName } from '../types/maps';

/**
 * Maps each Texas county to its TDEM (Texas Division of Emergency Management)
 * region number (1-8).
 *
 * Source: https://tdem.texas.gov/regions (Region 1-8 pages, fetched 2026-05-19).
 *
 * County names use the same spelling as the Census TIGER source file (see
 * scripts/source/tx-counties.geojson — e.g., "La Salle" with a space,
 * "DeWitt" without). The script at scripts/build-txhsa-regions.ts reads this
 * lookup, normalizes the geojson's `COUNTY` field by stripping " County", and
 * fails loudly if any county is missing from this table.
 */

export type TdemRegionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const tdemCountyRegions: Record<string, TdemRegionNumber> = {
  // Region 1 (Panhandle / South Plains / Big Country)
  Armstrong: 1, Bailey: 1, Briscoe: 1, Brown: 1, Callahan: 1, Carson: 1,
  Castro: 1, Childress: 1, Cochran: 1, Coleman: 1, Collingsworth: 1,
  Comanche: 1, Crosby: 1, Dallam: 1, 'Deaf Smith': 1, Dickens: 1, Donley: 1,
  Eastland: 1, Fisher: 1, Floyd: 1, Garza: 1, Gray: 1, Hale: 1, Hall: 1,
  Hansford: 1, Hartley: 1, Haskell: 1, Hemphill: 1, Hockley: 1, Hutchinson: 1,
  Jones: 1, Kent: 1, King: 1, Knox: 1, Lamb: 1, Lipscomb: 1, Lubbock: 1,
  Lynn: 1, Mitchell: 1, Moore: 1, Motley: 1, Nolan: 1, Ochiltree: 1,
  Oldham: 1, Parmer: 1, Potter: 1, Randall: 1, Roberts: 1, Runnels: 1,
  Scurry: 1, Shackelford: 1, Sherman: 1, Stephens: 1, Stonewall: 1,
  Swisher: 1, Taylor: 1, Terry: 1, Throckmorton: 1, Wheeler: 1, Yoakum: 1,

  // Region 2 (North Texas)
  Archer: 2, Baylor: 2, Clay: 2, Cottle: 2, Collin: 2, Cooke: 2, Dallas: 2,
  Denton: 2, Ellis: 2, Erath: 2, Fannin: 2, Foard: 2, Grayson: 2,
  Hardeman: 2, Hood: 2, Hunt: 2, Jack: 2, Johnson: 2, Kaufman: 2,
  Montague: 2, Navarro: 2, 'Palo Pinto': 2, Parker: 2, Rockwall: 2,
  Somervell: 2, Tarrant: 2, Wichita: 2, Wilbarger: 2, Wise: 2, Young: 2,

  // Region 3 (East Texas / Deep East Texas / Southeast Texas)
  Anderson: 3, Angelina: 3, Bowie: 3, Camp: 3, Cass: 3, Cherokee: 3,
  Delta: 3, Franklin: 3, Gregg: 3, Hardin: 3, Harrison: 3, Henderson: 3,
  Hopkins: 3, Houston: 3, Jasper: 3, Jefferson: 3, Lamar: 3, Marion: 3,
  Morris: 3, Nacogdoches: 3, Newton: 3, Orange: 3, Panola: 3, Polk: 3,
  Rains: 3, 'Red River': 3, Rusk: 3, Sabine: 3, 'San Augustine': 3,
  'San Jacinto': 3, Shelby: 3, Smith: 3, Titus: 3, Trinity: 3, Tyler: 3,
  Upshur: 3, 'Van Zandt': 3, Wood: 3,

  // Region 4 (Houston / Gulf Coast)
  Austin: 4, Brazoria: 4, Chambers: 4, Colorado: 4, 'Fort Bend': 4,
  Galveston: 4, Harris: 4, Liberty: 4, Matagorda: 4, Montgomery: 4,
  Walker: 4, Waller: 4, Wharton: 4,

  // Region 5 (Rio Grande Valley / Coastal Bend)
  Aransas: 5, Bee: 5, Brooks: 5, Cameron: 5, Duval: 5, Hidalgo: 5,
  'Jim Hogg': 5, 'Jim Wells': 5, Kenedy: 5, Kleberg: 5, 'Live Oak': 5,
  Nueces: 5, Refugio: 5, 'San Patricio': 5, Starr: 5, Webb: 5, Willacy: 5,
  Zapata: 5,

  // Region 6 (Alamo / South Central Texas)
  Atascosa: 6, Bandera: 6, Bexar: 6, Calhoun: 6, Comal: 6, DeWitt: 6,
  Dimmit: 6, Frio: 6, Gillespie: 6, Goliad: 6, Gonzales: 6, Guadalupe: 6,
  Jackson: 6, Karnes: 6, Kendall: 6, Kerr: 6, Kinney: 6, 'La Salle': 6,
  Lavaca: 6, Maverick: 6, McMullen: 6, Medina: 6, Real: 6, Uvalde: 6,
  'Val Verde': 6, Victoria: 6, Wilson: 6, Zavala: 6,

  // Region 7 (West Texas / Permian Basin / Big Bend / El Paso)
  Andrews: 7, Borden: 7, Brewster: 7, Coke: 7, Concho: 7, Crane: 7,
  Crockett: 7, Culberson: 7, Dawson: 7, Ector: 7, Edwards: 7, 'El Paso': 7,
  Gaines: 7, Glasscock: 7, Howard: 7, Hudspeth: 7, Irion: 7, 'Jeff Davis': 7,
  Kimble: 7, Loving: 7, Martin: 7, Mason: 7, McCulloch: 7, Menard: 7,
  Midland: 7, Pecos: 7, Presidio: 7, Reagan: 7, Reeves: 7, Schleicher: 7,
  Sterling: 7, Sutton: 7, Terrell: 7, 'Tom Green': 7, Upton: 7, Ward: 7,
  Winkler: 7,

  // Region 8 (Capital / Central Texas / Brazos Valley)
  Bastrop: 8, Bell: 8, Blanco: 8, Bosque: 8, Brazos: 8, Burleson: 8,
  Burnet: 8, Caldwell: 8, Coryell: 8, Falls: 8, Fayette: 8, Freestone: 8,
  Grimes: 8, Hamilton: 8, Hays: 8, Hill: 8, Lampasas: 8, Lee: 8, Leon: 8,
  Limestone: 8, Llano: 8, Madison: 8, McLennan: 8, Milam: 8, Mills: 8,
  Robertson: 8, 'San Saba': 8, Travis: 8, Washington: 8, Williamson: 8,
};

/**
 * Merge mapping from the 8 TDEM regions to the 4 TXHSA regions used by the
 * map overlay. Fixed per plan R3.
 */
export const tdemToTxhsaRegion: Record<TdemRegionNumber, TxhsaRegionName> = {
  1: 'West', 7: 'West',
  2: 'North', 3: 'North',
  8: 'East', 4: 'East',
  6: 'South', 5: 'South',
};
