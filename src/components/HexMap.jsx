import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { hexToPixel, pixelToHex } from '../game/engine/MapGenerator.js';
import { RESOURCES } from '../game/constants/resourceTypes.js';

const HEX_SIZE = 34;

// Precomputed hex corners for a given size
function hexCorners(x, y, size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: x + size * Math.cos(angle), y: y + size * Math.sin(angle) });
  }
  return corners;
}

function hexPath(ctx, x, y, size) {
  const corners = hexCorners(x, y, size);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
}

// Rich terrain colors with light/dark for gradients
const TERRAIN_PALETTE = {
  deep_ocean:  { base: '#152840', light: '#1c3352', dark: '#0e1e30', pattern: 'water' },
  ocean:       { base: '#1e3d65', light: '#265080', dark: '#162d4a', pattern: 'water' },
  coast:       { base: '#3a7ab0', light: '#4a90cc', dark: '#2a6090', pattern: 'water' },
  plains:      { base: '#b8a848', light: '#d0c060', dark: '#98883a', pattern: 'grain' },
  grassland:   { base: '#5ea040', light: '#72b850', dark: '#4a8830', pattern: 'grass' },
  forest:      { base: '#2d6e2d', light: '#3a8a3a', dark: '#1e5a1e', pattern: 'trees' },
  jungle:      { base: '#1a5c2a', light: '#228838', dark: '#0e4018', pattern: 'dense_trees' },
  hills:       { base: '#8a7a4a', light: '#a09060', dark: '#706038', pattern: 'hills' },
  mountains:   { base: '#787878', light: '#9a9a9a', dark: '#555555', pattern: 'mountain' },
  desert:      { base: '#d4b870', light: '#e8d090', dark: '#b89848', pattern: 'sand' },
  tundra:      { base: '#a0b8c0', light: '#bcd0d8', dark: '#88a0a8', pattern: 'snow' },
  swamp:       { base: '#4a6638', light: '#5a7a48', dark: '#3a5228', pattern: 'swamp' },
  savanna:     { base: '#c0a038', light: '#d8b848', dark: '#a08828', pattern: 'grain' },
  river:       { base: '#4890b8', light: '#58a8d0', dark: '#3878a0', pattern: 'river' },
};

function blendColors(c1, c2, ratio) {
  const parse = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
  const [r1,g1,b1] = parse(c1);
  const [r2,g2,b2] = parse(c2);
  const r = Math.round(r1*(1-ratio)+r2*ratio);
  const g = Math.round(g1*(1-ratio)+g2*ratio);
  const b = Math.round(b1*(1-ratio)+b2*ratio);
  return `rgb(${r},${g},${b})`;
}

function drawTerrainHex(ctx, x, y, size, tile, palette) {
  hexPath(ctx, x, y, size);
  const grad = ctx.createRadialGradient(x - size*0.2, y - size*0.3, 0, x, y, size);
  grad.addColorStop(0, palette.light);
  grad.addColorStop(0.7, palette.base);
  grad.addColorStop(1, palette.dark);
  ctx.fillStyle = grad;
  ctx.fill();

  // Terrain detail decorations
  ctx.save();
  hexPath(ctx, x, y, size);
  ctx.clip();
  drawTerrainDecoration(ctx, x, y, size, palette.pattern, tile);
  ctx.restore();
}

function drawTerrainDecoration(ctx, x, y, size, pattern, tile) {
  const s = size;
  ctx.globalAlpha = 0.3;

  switch (pattern) {
    case 'water': {
      // Wave lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        const wy = y + i * s * 0.35;
        ctx.moveTo(x - s*0.6, wy);
        ctx.quadraticCurveTo(x - s*0.2, wy - 3, x, wy);
        ctx.quadraticCurveTo(x + s*0.2, wy + 3, x + s*0.6, wy);
        ctx.stroke();
      }
      break;
    }
    case 'grass': {
      ctx.fillStyle = '#90d060';
      const seed = (tile.q * 7 + tile.r * 13) % 17;
      for (let i = 0; i < 6; i++) {
        const gx = x + ((seed + i*5) % 11 - 5) * s * 0.08;
        const gy = y + ((seed + i*3) % 9 - 4) * s * 0.08;
        ctx.fillRect(gx, gy, 1.5, 4);
        ctx.fillRect(gx-1, gy+1, 1.5, 3);
      }
      break;
    }
    case 'grain': {
      ctx.strokeStyle = '#d8c060';
      ctx.lineWidth = 1;
      const seed = (tile.q * 11 + tile.r * 7) % 13;
      for (let i = 0; i < 5; i++) {
        const gx = x + ((seed + i*4) % 9 - 4) * s * 0.1;
        const gy = y + ((seed + i*6) % 11 - 5) * s * 0.08;
        ctx.beginPath();
        ctx.moveTo(gx, gy + 4);
        ctx.lineTo(gx, gy - 4);
        ctx.moveTo(gx-2, gy-2);
        ctx.lineTo(gx, gy-4);
        ctx.lineTo(gx+2, gy-2);
        ctx.stroke();
      }
      break;
    }
    case 'trees': {
      ctx.fillStyle = '#1a5a1a';
      const seed = (tile.q * 3 + tile.r * 17) % 19;
      for (let i = 0; i < 4; i++) {
        const tx = x + ((seed + i*7) % 13 - 6) * s * 0.07;
        const ty = y + ((seed + i*5) % 11 - 5) * s * 0.07;
        // Simple triangle tree
        ctx.beginPath();
        ctx.moveTo(tx, ty - 5);
        ctx.lineTo(tx - 3, ty + 2);
        ctx.lineTo(tx + 3, ty + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(tx - 0.5, ty + 2, 1, 3);
      }
      break;
    }
    case 'dense_trees': {
      ctx.fillStyle = '#0e4018';
      const seed = (tile.q * 13 + tile.r * 3) % 23;
      for (let i = 0; i < 7; i++) {
        const tx = x + ((seed + i*5) % 15 - 7) * s * 0.06;
        const ty = y + ((seed + i*3) % 13 - 6) * s * 0.06;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 6);
        ctx.lineTo(tx - 4, ty + 3);
        ctx.lineTo(tx + 4, ty + 3);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'hills': {
      ctx.strokeStyle = '#a09060';
      ctx.fillStyle = '#a09060';
      ctx.lineWidth = 1.2;
      const offsets = [[-6, 2], [0, -2], [6, 3]];
      for (const [ox, oy] of offsets) {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, s * 0.18, Math.PI, 0);
        ctx.stroke();
      }
      break;
    }
    case 'mountain': {
      ctx.fillStyle = '#aaaaaa';
      ctx.globalAlpha = 0.35;
      // Mountain peak
      ctx.beginPath();
      ctx.moveTo(x, y - s*0.4);
      ctx.lineTo(x - s*0.3, y + s*0.15);
      ctx.lineTo(x + s*0.3, y + s*0.15);
      ctx.closePath();
      ctx.fill();
      // Snow cap
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y - s*0.4);
      ctx.lineTo(x - s*0.1, y - s*0.2);
      ctx.lineTo(x + s*0.1, y - s*0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'sand': {
      ctx.fillStyle = '#e8d090';
      const seed = (tile.q * 5 + tile.r * 11) % 17;
      for (let i = 0; i < 4; i++) {
        const dx = x + ((seed + i*7) % 11 - 5) * s * 0.09;
        const dy = y + ((seed + i*3) % 9 - 4) * s * 0.09;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    }
    case 'snow': {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x - s*0.5, y - s*0.5, s, s);
      break;
    }
    case 'swamp': {
      ctx.fillStyle = '#3a5228';
      ctx.strokeStyle = '#5a7a48';
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        const wx = x + (i - 1) * s * 0.25;
        ctx.beginPath();
        ctx.moveTo(wx - 3, y + 2);
        ctx.quadraticCurveTo(wx, y - 2, wx + 3, y + 2);
        ctx.stroke();
      }
      break;
    }
    case 'river': {
      ctx.strokeStyle = '#90d0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - s*0.5, y);
      ctx.quadraticCurveTo(x, y - 4, x + s*0.5, y);
      ctx.stroke();
      break;
    }
  }
  ctx.globalAlpha = 1;
}

function drawOwnerBorder(ctx, x, y, size, tile, tiles, nation) {
  const neighbors = [
    { q: tile.q+1, r: tile.r }, { q: tile.q-1, r: tile.r },
    { q: tile.q, r: tile.r+1 }, { q: tile.q, r: tile.r-1 },
    { q: tile.q+1, r: tile.r-1 }, { q: tile.q-1, r: tile.r+1 },
  ];

  const corners = hexCorners(x, y, size);
  // Edge indices: each edge goes from corner[i] to corner[(i+1)%6]
  // Neighbor direction mapping to edges
  const edgeNeighbors = [
    { q: tile.q+1, r: tile.r-1 }, // edge 0: top-right
    { q: tile.q+1, r: tile.r },   // edge 1: right
    { q: tile.q, r: tile.r+1 },   // edge 2: bottom-right
    { q: tile.q-1, r: tile.r+1 }, // edge 3: bottom-left
    { q: tile.q-1, r: tile.r },   // edge 4: left
    { q: tile.q, r: tile.r-1 },   // edge 5: top-left
  ];

  ctx.strokeStyle = nation.color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  for (let i = 0; i < 6; i++) {
    const nb = edgeNeighbors[i];
    const nbTile = tiles[`${nb.q},${nb.r}`];
    if (!nbTile || nbTile.owner !== tile.owner) {
      const c1 = corners[i];
      const c2 = corners[(i+1) % 6];
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.stroke();
    }
  }
}

const BUILDING_ICONS = {
  farm: '\u{1F33E}', ranch: '\u{1F404}', lumber_camp: '\u{1FA93}', mine: '\u{26CF}',
  gold_mine: '\u{1F947}', oil_well: '\u{1F6E2}', fishing_port: '\u{1F3A3}',
  plantation: '\u{1F33F}', sawmill: '\u{1F3ED}', foundry: '\u{1F525}',
  textile_mill: '\u{1F9F5}', arms_factory: '\u{2694}', port: '\u{2693}',
  fort: '\u{1F3F0}', market: '\u{1F3EA}', university: '\u{1F393}',
  barracks: '\u{1F3DB}', embassy: '\u{1F3DB}',
};

export default function HexMap({ gameState, onTileClick, onUnitMove, selectedTile, selectedUnit }) {
  const canvasRef = useRef(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartCamera, setDragStartCamera] = useState({ x: 0, y: 0 });
  const [hoverTile, setHoverTile] = useState(null);

  const { map, nations } = gameState;
  const playerId = nations.find(n => n.isPlayer)?.id;

  // Build a lookup for nation by id
  const nationMap = useMemo(() => {
    const m = {};
    for (const n of nations) m[n.id] = n;
    return m;
  }, [nations]);

  // Center camera on player capital initially
  useEffect(() => {
    const player = nations.find(n => n.isPlayer);
    if (player) {
      const { x, y } = hexToPixel(player.capitalQ, player.capitalR, HEX_SIZE);
      const canvas = canvasRef.current;
      if (canvas) {
        setCamera({
          x: -x * 1.8 + canvas.width / 2,
          y: -y * 1.8 + canvas.height / 2,
          zoom: 1.8,
        });
      }
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Background - dark ocean
    ctx.fillStyle = '#0c1824';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    const tiles = map.tiles;
    const margin = HEX_SIZE * 3;

    // Sort tiles for proper rendering order
    const tileArray = Object.values(tiles);

    // Pass 1: Draw terrain
    for (const tile of tileArray) {
      const { x, y } = hexToPixel(tile.q, tile.r, HEX_SIZE);
      const screenX = x * camera.zoom + camera.x;
      const screenY = y * camera.zoom + camera.y;
      if (screenX < -margin || screenX > width + margin || screenY < -margin || screenY > height + margin) continue;

      const explored = tile.explored?.[playerId];
      if (!explored) {
        // Fog of war - dark with slight texture
        hexPath(ctx, x, y, HEX_SIZE);
        ctx.fillStyle = '#0a0e14';
        ctx.fill();
        ctx.strokeStyle = '#111820';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        continue;
      }

      const paletteKey = tile.terrain.id;
      const palette = TERRAIN_PALETTE[paletteKey] || TERRAIN_PALETTE.plains;

      drawTerrainHex(ctx, x, y, HEX_SIZE, tile, palette);

      // Owner tint overlay
      if (tile.owner) {
        const nation = nationMap[tile.owner];
        if (nation) {
          hexPath(ctx, x, y, HEX_SIZE);
          ctx.fillStyle = nation.color + '22';
          ctx.fill();
        }
      }

      // Subtle hex border
      hexPath(ctx, x, y, HEX_SIZE);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Pass 2: Owner territory borders (thick colored borders on edges)
    for (const tile of tileArray) {
      if (!tile.owner || !tile.explored?.[playerId]) continue;
      const { x, y } = hexToPixel(tile.q, tile.r, HEX_SIZE);
      const screenX = x * camera.zoom + camera.x;
      const screenY = y * camera.zoom + camera.y;
      if (screenX < -margin || screenX > width + margin || screenY < -margin || screenY > height + margin) continue;

      const nation = nationMap[tile.owner];
      if (nation) drawOwnerBorder(ctx, x, y, HEX_SIZE, tile, tiles, nation);
    }

    // Pass 3: Selection / hover highlights
    if (selectedTile) {
      const { x, y } = hexToPixel(selectedTile.q, selectedTile.r, HEX_SIZE);
      hexPath(ctx, x, y, HEX_SIZE + 1);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (hoverTile && hoverTile.explored?.[playerId] && (!selectedTile || hoverTile.key !== selectedTile.key)) {
      const { x, y } = hexToPixel(hoverTile.q, hoverTile.r, HEX_SIZE);
      hexPath(ctx, x, y, HEX_SIZE);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Movement range for selected unit
    if (selectedUnit) {
      const moveRange = getMovementRange(selectedUnit, map.tiles);
      for (const n of moveRange) {
        const { x, y } = hexToPixel(n.q, n.r, HEX_SIZE);
        hexPath(ctx, x, y, HEX_SIZE - 1);
        ctx.fillStyle = 'rgba(100,255,100,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,255,100,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Pass 4: Resources, buildings, units (drawn on top)
    for (const tile of tileArray) {
      if (!tile.explored?.[playerId]) continue;
      const { x, y } = hexToPixel(tile.q, tile.r, HEX_SIZE);
      const screenX = x * camera.zoom + camera.x;
      const screenY = y * camera.zoom + camera.y;
      if (screenX < -margin || screenX > width + margin || screenY < -margin || screenY > height + margin) continue;

      const S = HEX_SIZE;

      // Resource indicator
      if (tile.resource && camera.zoom > 0.8) {
        const res = RESOURCES[tile.resource];
        if (res) {
          ctx.font = `${S * 0.38}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Background circle
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.arc(x + S*0.32, y + S*0.32, S*0.22, 0, Math.PI*2);
          ctx.fill();
          ctx.fillText(res.icon, x + S*0.32, y + S*0.34);
        }
      }

      // Buildings
      if (tile.buildings.length > 0 && camera.zoom > 0.6) {
        const mainBuilding = tile.buildings.find(b => b.type !== 'road' && b.type !== 'railroad') || tile.buildings[0];
        const icon = BUILDING_ICONS[mainBuilding.type] || '\u{1F3D7}';
        const underConstruction = mainBuilding.constructionLeft > 0;

        ctx.font = `${S * 0.5}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow behind building
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(x, y - S*0.08, S*0.26, 0, Math.PI*2);
        ctx.fill();

        if (underConstruction) {
          ctx.globalAlpha = 0.5;
        }
        ctx.fillText(icon, x, y - S*0.05);
        ctx.globalAlpha = 1;

        // Construction progress bar
        if (underConstruction && camera.zoom > 1) {
          const bw = S * 0.7;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x - bw/2, y + S*0.3, bw, 4);
          ctx.fillStyle = '#ffa500';
          const bType = mainBuilding.type;
          const totalTime = tile.buildings.find(b => b.type === bType)?.constructionLeft || 1;
          ctx.fillRect(x - bw/2, y + S*0.3, bw * (1 - mainBuilding.constructionLeft / (mainBuilding.constructionLeft + 1)), 4);
        }

        // Infrastructure indicator (road/railroad)
        if (tile.buildings.some(b => b.type === 'railroad')) {
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - S*0.4, y + S*0.45);
          ctx.lineTo(x + S*0.4, y + S*0.45);
          ctx.stroke();
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * S*0.12, y + S*0.4);
            ctx.lineTo(x + i * S*0.12, y + S*0.5);
            ctx.stroke();
          }
        } else if (tile.buildings.some(b => b.type === 'road')) {
          ctx.strokeStyle = '#88776644';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x - S*0.4, y + S*0.45);
          ctx.lineTo(x + S*0.4, y + S*0.45);
          ctx.stroke();
        }
      }

      // Capital star
      const capitalNation = nations.find(n => n.capitalQ === tile.q && n.capitalR === tile.r);
      if (capitalNation) {
        ctx.save();
        ctx.font = `bold ${S * 0.55}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffd700';
        ctx.fillText('\u2605', x, y - S*0.42);
        ctx.shadowBlur = 0;
        // Nation name label (if zoomed enough)
        if (camera.zoom > 1.2) {
          ctx.font = `bold ${S*0.28}px sans-serif`;
          ctx.fillStyle = capitalNation.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2.5;
          ctx.strokeText(capitalNation.name, x, y + S*0.55);
          ctx.fillText(capitalNation.name, x, y + S*0.55);
        }
        ctx.restore();
      }

      // Units
      if (tile.units.length > 0) {
        const topUnit = tile.units[0];
        const isOwnUnit = topUnit.owner === playerId;
        const unitNation = nationMap[topUnit.owner];

        // Unit badge background
        ctx.save();
        const ux = x, uy = y + S*0.05;
        ctx.fillStyle = isOwnUnit ? 'rgba(30,60,30,0.85)' : 'rgba(60,30,30,0.85)';
        ctx.strokeStyle = unitNation?.color || '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(ux - S*0.35, uy - S*0.25, S*0.7, S*0.45, 4);
        ctx.fill();
        ctx.stroke();

        // Unit icon
        ctx.font = `${S * 0.4}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(topUnit.icon, ux, uy - S*0.02);

        // Unit count
        if (tile.units.length > 1) {
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.arc(ux + S*0.3, uy - S*0.2, S*0.15, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${S*0.18}px sans-serif`;
          ctx.fillText(tile.units.length.toString(), ux + S*0.3, uy - S*0.18);
        }

        // HP bar
        if (camera.zoom > 1) {
          const hpRatio = topUnit.hp / topUnit.maxHp;
          const bw = S * 0.55;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(ux - bw/2, uy + S*0.15, bw, 3);
          ctx.fillStyle = hpRatio > 0.6 ? '#2ecc71' : hpRatio > 0.3 ? '#f39c12' : '#e74c3c';
          ctx.fillRect(ux - bw/2, uy + S*0.15, bw * hpRatio, 3);
        }

        // Selected unit glow
        if (selectedUnit && tile.units.find(u => u.id === selectedUnit.id)) {
          ctx.strokeStyle = '#2ecc71';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#2ecc71';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(ux - S*0.38, uy - S*0.28, S*0.76, S*0.51, 5);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }, [camera, map, nations, selectedTile, selectedUnit, hoverTile, playerId, nationMap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.getContext('2d').scale(dpr, dpr);
    // Adjust camera for DPR
    const animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  const screenToWorld = useCallback((screenX, screenY) => {
    const worldX = (screenX - camera.x) / camera.zoom;
    const worldY = (screenY - camera.y) / camera.zoom;
    return pixelToHex(worldX, worldY, HEX_SIZE);
  }, [camera]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartCamera({ x: camera.x, y: camera.y });
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const hex = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const tile = map.tiles[`${hex.q},${hex.r}`];
    setHoverTile(tile || null);

    if (isDragging) {
      setCamera(prev => ({
        ...prev,
        x: dragStartCamera.x + (e.clientX - dragStart.x),
        y: dragStartCamera.y + (e.clientY - dragStart.y),
      }));
    }
  };

  const handleMouseUp = (e) => {
    const wasDragging = isDragging;
    setIsDragging(false);
    if (!wasDragging) return;

    const moved = Math.abs(e.clientX - dragStart.x) + Math.abs(e.clientY - dragStart.y);
    if (moved < 6) {
      const rect = canvasRef.current.getBoundingClientRect();
      const hex = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const tile = map.tiles[`${hex.q},${hex.r}`];
      if (tile) {
        if (selectedUnit && onUnitMove) {
          onUnitMove(selectedUnit.id, tile.q, tile.r);
        } else if (onTileClick) {
          onTileClick(tile);
        }
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.max(0.4, Math.min(5, camera.zoom * zoomFactor));
    setCamera(prev => ({
      x: mouseX - (mouseX - prev.x) * (newZoom / prev.zoom),
      y: mouseY - (mouseY - prev.y) * (newZoom / prev.zoom),
      zoom: newZoom,
    }));
  };

  // Tooltip
  const tooltipContent = useMemo(() => {
    if (!hoverTile || !hoverTile.explored?.[playerId]) return null;
    const t = hoverTile;
    const owner = t.owner ? nationMap[t.owner] : null;
    const res = t.resource ? RESOURCES[t.resource] : null;
    return { terrain: t.terrain, owner, resource: res, units: t.units.length, buildings: t.buildings.length, q: t.q, r: t.r };
  }, [hoverTile, playerId, nationMap]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0c1824' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : 'grab', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoverTile(null); }}
        onWheel={handleWheel}
      />

      {/* Rich tooltip */}
      {tooltipContent && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          background: 'linear-gradient(135deg, rgba(20,15,10,0.95), rgba(30,25,18,0.95))',
          color: '#e8dcc8',
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid #5a4a30',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          minWidth: 200,
          fontFamily: "'Georgia', serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              display: 'inline-block', width: 12, height: 12, borderRadius: 2,
              background: tooltipContent.terrain.color, border: '1px solid rgba(255,255,255,0.2)',
            }} />
            <strong style={{ fontSize: 14, color: '#f0e6d0' }}>{tooltipContent.terrain.name}</strong>
            <span style={{ fontSize: 11, color: '#8a7a60', marginLeft: 'auto' }}>
              ({tooltipContent.q}, {tooltipContent.r})
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#a09070', marginBottom: 4, fontStyle: 'italic' }}>
            {tooltipContent.terrain.description}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            {tooltipContent.resource && (
              <span>{tooltipContent.resource.icon} {tooltipContent.resource.name}</span>
            )}
            {tooltipContent.owner && (
              <span style={{ color: tooltipContent.owner.color }}>
                {tooltipContent.owner.flag} {tooltipContent.owner.name}
              </span>
            )}
            {tooltipContent.units > 0 && <span>Units: {tooltipContent.units}</span>}
            {tooltipContent.buildings > 0 && <span>Buildings: {tooltipContent.buildings}</span>}
          </div>
          <div style={{ fontSize: 10, color: '#6a5a40', marginTop: 4 }}>
            Defense: +{tooltipContent.terrain.defense} | Move cost: {tooltipContent.terrain.moveCost}
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        background: 'rgba(20,15,10,0.8)',
        padding: '6px 12px', borderRadius: 6,
        border: '1px solid #3a3020',
        fontSize: 11, color: '#8a7a60',
        fontFamily: "'Georgia', serif",
      }}>
        {selectedUnit ? (
          <span style={{ color: '#6adb6a' }}>
            {selectedUnit.icon} {selectedUnit.name} - Click tile to move
          </span>
        ) : (
          <span>Scroll to zoom \u00b7 Drag to pan \u00b7 Click to select</span>
        )}
      </div>
    </div>
  );
}

function getMovementRange(unit, tiles) {
  if (!unit || unit.movementLeft <= 0) return [];
  const neighbors = [
    { q: unit.q+1, r: unit.r }, { q: unit.q-1, r: unit.r },
    { q: unit.q, r: unit.r+1 }, { q: unit.q, r: unit.r-1 },
    { q: unit.q+1, r: unit.r-1 }, { q: unit.q-1, r: unit.r+1 },
  ];
  return neighbors.filter(n => {
    const tile = tiles[`${n.q},${n.r}`];
    if (!tile) return false;
    if (unit.category === 'land' && (tile.terrain.id === 'deep_ocean' || tile.terrain.id === 'ocean')) return false;
    if (unit.category === 'naval' && !tile.terrain.naval) return false;
    return tile.terrain.moveCost <= unit.movementLeft;
  });
}
