import { TERRAIN } from '../constants/terrainTypes.js';

// Simplex-style noise implementation for terrain generation
class SimplexNoise {
  constructor(seed = Math.random() * 65536) {
    this.seed = seed;
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x, y) {
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t, a, b) => a + t * (b - a);
    const grad = (hash, x, y) => {
      const h = hash & 3;
      const u = h < 2 ? x : y;
      const v = h < 2 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    };

    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    return lerp(v,
      lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf)),
      lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1))
    );
  }

  octaveNoise(x, y, octaves = 4, persistence = 0.5, lacunarity = 2) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

// Hex grid utilities
export function hexToPixel(q, r, size) {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}

export function pixelToHex(x, y, size) {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return hexRound(q, r);
}

function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function getHexNeighbors(q, r) {
  return [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

export function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

export function generateMap(width, height, seed = Date.now()) {
  const noise = new SimplexNoise(seed);
  const moistureNoise = new SimplexNoise(seed + 1000);
  const temperatureNoise = new SimplexNoise(seed + 2000);
  const resourceNoise = new SimplexNoise(seed + 3000);
  const tiles = {};

  const centerQ = Math.floor(width / 2);
  const centerR = Math.floor(height / 2);

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const nq = q / width;
      const nr = r / height;

      // Generate elevation with multiple octaves
      let elevation = noise.octaveNoise(nq * 4, nr * 4, 6, 0.5, 2.0);

      // Create island-like shape: lower elevation near edges
      const edgeDistQ = Math.min(q, width - q) / (width / 2);
      const edgeDistR = Math.min(r, height - r) / (height / 2);
      const edgeFactor = Math.min(edgeDistQ, edgeDistR);
      elevation = elevation * 0.7 + edgeFactor * 0.3;

      // Add continental shapes
      const continentNoise = noise.octaveNoise(nq * 2, nr * 2, 3, 0.6, 2.0);
      elevation = elevation * 0.6 + continentNoise * 0.4;

      // Moisture and temperature
      const moisture = (moistureNoise.octaveNoise(nq * 3, nr * 3, 4, 0.5) + 1) / 2;
      const baseTemp = 1 - Math.abs(r / height - 0.5) * 2; // warmer at center rows
      const temperature = baseTemp * 0.7 + (temperatureNoise.octaveNoise(nq * 2, nr * 2, 3, 0.5) + 1) / 2 * 0.3;

      // Determine terrain type
      const terrain = classifyTerrain(elevation, moisture, temperature);

      // Determine resource
      const resource = assignResource(terrain, resourceNoise.octaveNoise(nq * 5, nr * 5, 2, 0.5), q, r);

      const key = `${q},${r}`;
      tiles[key] = {
        q,
        r,
        key,
        terrain,
        elevation,
        moisture,
        temperature,
        resource,
        owner: null,
        buildings: [],
        units: [],
        explored: {},
        fog: true,
        population: 0,
      };
    }
  }

  // Add rivers
  addRivers(tiles, width, height, noise, 8);

  return { tiles, width, height, seed };
}

function classifyTerrain(elevation, moisture, temperature) {
  // Deep water
  if (elevation < -0.3) return TERRAIN.DEEP_OCEAN;
  if (elevation < -0.1) return TERRAIN.OCEAN;
  if (elevation < 0.0) return TERRAIN.COAST;

  // Land
  if (elevation > 0.6) return TERRAIN.MOUNTAINS;
  if (elevation > 0.4) return TERRAIN.HILLS;

  // Climate-based terrain
  if (temperature < 0.2) {
    return TERRAIN.TUNDRA;
  }

  if (temperature < 0.35) {
    if (moisture > 0.5) return TERRAIN.FOREST;
    return TERRAIN.PLAINS;
  }

  if (temperature > 0.75) {
    if (moisture < 0.25) return TERRAIN.DESERT;
    if (moisture < 0.45) return TERRAIN.SAVANNA;
    if (moisture > 0.7) return TERRAIN.JUNGLE;
    return TERRAIN.GRASSLAND;
  }

  // Temperate
  if (moisture > 0.6) return TERRAIN.FOREST;
  if (moisture > 0.45) return TERRAIN.GRASSLAND;
  if (moisture < 0.2) return TERRAIN.PLAINS;
  if (moisture > 0.7 && elevation < 0.15) return TERRAIN.SWAMP;

  return TERRAIN.PLAINS;
}

function assignResource(terrain, noiseVal, q, r) {
  const possibleResources = terrain.resources;
  if (!possibleResources || possibleResources.length === 0) return null;

  // Only ~30% of tiles get a resource
  const resourceChance = (noiseVal + 1) / 2;
  if (resourceChance < 0.7) return null;

  // Pick a resource weighted by noise
  const seededRandom = Math.abs(Math.sin(q * 12.9898 + r * 78.233) * 43758.5453) % 1;
  const idx = Math.floor(seededRandom * possibleResources.length);
  return possibleResources[idx];
}

function addRivers(tiles, width, height, noise, count) {
  for (let i = 0; i < count; i++) {
    // Start rivers from high elevations
    let bestTile = null;
    let bestElevation = -1;

    const startQ = Math.floor(width * 0.2 + Math.abs(noise.noise2D(i * 7.3, i * 3.7) + 1) / 2 * width * 0.6);
    const startR = Math.floor(height * 0.2 + Math.abs(noise.noise2D(i * 5.1, i * 9.2) + 1) / 2 * height * 0.6);

    const key = `${startQ},${startR}`;
    const tile = tiles[key];
    if (tile && tile.terrain.id !== 'deep_ocean' && tile.terrain.id !== 'ocean' && tile.elevation > 0.3) {
      bestTile = tile;
      bestElevation = tile.elevation;
    }

    if (!bestTile) continue;

    // Flow downhill
    let current = bestTile;
    let steps = 0;
    while (current && steps < 30) {
      const neighbors = getHexNeighbors(current.q, current.r);
      let lowest = null;
      let lowestElev = current.elevation;

      for (const n of neighbors) {
        const nKey = `${n.q},${n.r}`;
        const nTile = tiles[nKey];
        if (nTile && nTile.elevation < lowestElev) {
          lowestElev = nTile.elevation;
          lowest = nTile;
        }
      }

      if (!lowest || lowest.terrain.id === 'ocean' || lowest.terrain.id === 'deep_ocean') break;

      if (lowest.terrain.buildable && lowest.terrain.id !== 'river') {
        lowest.terrain = TERRAIN.RIVER;
        lowest.resource = lowest.resource || 'fish';
      }
      current = lowest;
      steps++;
    }
  }
}

export function findStartingPositions(mapData, numPlayers) {
  const { tiles, width, height } = mapData;
  const landTiles = Object.values(tiles).filter(
    t => t.terrain.buildable && t.terrain.id !== 'swamp' && t.terrain.id !== 'desert'
  );

  if (landTiles.length < numPlayers) return [];

  const positions = [];
  const minDistance = Math.floor(Math.min(width, height) / (numPlayers * 0.6));

  // Sort by desirability (resource-rich, good terrain)
  const scored = landTiles.map(t => {
    let score = 0;
    if (t.resource) score += 3;
    if (t.terrain.id === 'grassland' || t.terrain.id === 'plains') score += 2;
    if (t.terrain.id === 'river') score += 3;
    // Bonus for having diverse neighbors
    const neighbors = getHexNeighbors(t.q, t.r);
    const terrainTypes = new Set();
    for (const n of neighbors) {
      const nTile = tiles[`${n.q},${n.r}`];
      if (nTile) {
        terrainTypes.add(nTile.terrain.id);
        if (nTile.resource) score += 1;
        if (nTile.terrain.id === 'coast') score += 2; // coastal access is good
      }
    }
    score += terrainTypes.size;
    return { tile: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  for (const { tile } of scored) {
    if (positions.length >= numPlayers) break;

    const tooClose = positions.some(p => hexDistance(p.q, p.r, tile.q, tile.r) < minDistance);
    if (!tooClose) {
      positions.push(tile);
    }
  }

  return positions;
}
