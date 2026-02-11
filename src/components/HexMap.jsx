import React, { useRef, useEffect, useCallback, useState } from 'react';
import { hexToPixel, pixelToHex } from '../game/engine/MapGenerator.js';

const HEX_SIZE = 20;
const SQRT3 = Math.sqrt(3);

function drawHex(ctx, x, y, size, fillColor, strokeColor = '#1a1a2e', lineWidth = 1) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const hx = x + size * Math.cos(angle);
    const hy = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function getHexColor(tile, nations, playerId) {
  if (!tile.explored?.[playerId] && tile.fog) return '#0a0a15';

  let color = tile.terrain.color;

  // Tint by owner
  if (tile.owner) {
    const nation = nations.find(n => n.id === tile.owner);
    if (nation) {
      color = blendColors(color, nation.color, 0.3);
    }
  }

  return color;
}

function blendColors(color1, color2, ratio) {
  const hex = (c) => parseInt(c.slice(1), 16);
  const r1 = (hex(color1) >> 16) & 255;
  const g1 = (hex(color1) >> 8) & 255;
  const b1 = hex(color1) & 255;
  const r2 = (hex(color2) >> 16) & 255;
  const g2 = (hex(color2) >> 8) & 255;
  const b2 = hex(color2) & 255;
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function HexMap({ gameState, onTileClick, onUnitMove, selectedTile, selectedUnit }) {
  const canvasRef = useRef(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverTile, setHoverTile] = useState(null);

  const { map, nations } = gameState;
  const playerId = nations.find(n => n.isPlayer)?.id;

  // Center camera on player capital initially
  useEffect(() => {
    const player = nations.find(n => n.isPlayer);
    if (player) {
      const { x, y } = hexToPixel(player.capitalQ, player.capitalR, HEX_SIZE);
      const canvas = canvasRef.current;
      if (canvas) {
        setCamera({
          x: -x + canvas.width / 2,
          y: -y + canvas.height / 2,
          zoom: 1.5,
        });
      }
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    const tiles = map.tiles;

    // Draw tiles
    for (const tile of Object.values(tiles)) {
      const { x, y } = hexToPixel(tile.q, tile.r, HEX_SIZE);

      // Culling - skip tiles outside viewport
      const screenX = x * camera.zoom + camera.x;
      const screenY = y * camera.zoom + camera.y;
      if (screenX < -50 || screenX > width + 50 || screenY < -50 || screenY > height + 50) continue;

      const color = getHexColor(tile, nations, playerId);
      const isSelected = selectedTile && selectedTile.q === tile.q && selectedTile.r === tile.r;
      const isHover = hoverTile && hoverTile.q === tile.q && hoverTile.r === tile.r;

      drawHex(ctx, x, y, HEX_SIZE,
        color,
        isSelected ? '#ffdd44' : isHover ? '#88aacc' : '#1a1a2e',
        isSelected ? 2 : isHover ? 1.5 : 0.5
      );

      // Draw resource icon
      if (tile.resource && tile.explored?.[playerId]) {
        ctx.font = `${HEX_SIZE * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Just draw a small dot colored by resource type
        ctx.fillStyle = '#ffffff44';
        ctx.beginPath();
        ctx.arc(x, y + HEX_SIZE * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw buildings
      if (tile.buildings.length > 0 && tile.explored?.[playerId]) {
        ctx.font = `${HEX_SIZE * 0.45}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const bIcon = getBuildingIcon(tile.buildings[0].type);
        ctx.fillText(bIcon, x, y - HEX_SIZE * 0.15);
      }

      // Draw units
      if (tile.units.length > 0 && tile.explored?.[playerId]) {
        const topUnit = tile.units[0];
        ctx.font = `${HEX_SIZE * 0.55}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(topUnit.icon, x, y + HEX_SIZE * 0.15);

        // Unit count badge
        if (tile.units.length > 1) {
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(x + HEX_SIZE * 0.4, y - HEX_SIZE * 0.3, HEX_SIZE * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `${HEX_SIZE * 0.25}px Arial`;
          ctx.fillText(tile.units.length.toString(), x + HEX_SIZE * 0.4, y - HEX_SIZE * 0.28);
        }

        // Health bar for selected unit
        if (selectedUnit && tile.units.find(u => u.id === selectedUnit.id)) {
          const unit = tile.units.find(u => u.id === selectedUnit.id);
          const hpRatio = unit.hp / unit.maxHp;
          const barW = HEX_SIZE * 0.8;
          ctx.fillStyle = '#333';
          ctx.fillRect(x - barW / 2, y + HEX_SIZE * 0.5, barW, 3);
          ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
          ctx.fillRect(x - barW / 2, y + HEX_SIZE * 0.5, barW * hpRatio, 3);
        }
      }

      // Owner border highlight
      if (tile.owner && tile.explored?.[playerId]) {
        const nation = nations.find(n => n.id === tile.owner);
        if (nation) {
          ctx.strokeStyle = nation.color + '88';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const hx = x + HEX_SIZE * 0.85 * Math.cos(angle);
            const hy = y + HEX_SIZE * 0.85 * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // Capital marker
      const capitalNation = nations.find(n => n.capitalQ === tile.q && n.capitalR === tile.r);
      if (capitalNation && tile.explored?.[playerId]) {
        ctx.font = `bold ${HEX_SIZE * 0.4}px Arial`;
        ctx.fillStyle = capitalNation.color;
        ctx.textAlign = 'center';
        ctx.fillText('★', x, y - HEX_SIZE * 0.45);
      }
    }

    // Movement range indicator for selected unit
    if (selectedUnit) {
      const neighbors = getMovementRange(selectedUnit, map.tiles);
      for (const n of neighbors) {
        const { x, y } = hexToPixel(n.q, n.r, HEX_SIZE);
        ctx.strokeStyle = '#44ff44aa';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i - 30);
          const hx = x + HEX_SIZE * Math.cos(angle);
          const hy = y + HEX_SIZE * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }, [camera, map, nations, selectedTile, selectedUnit, hoverTile, playerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [render]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        render();
      }
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
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const hex = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const tile = map.tiles[`${hex.q},${hex.r}`];
    setHoverTile(tile || null);

    if (isDragging) {
      setCamera(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;

    const moved = Math.abs(e.clientX - dragStart.x - camera.x) + Math.abs(e.clientY - dragStart.y - camera.y);
    setIsDragging(false);

    if (moved < 5) {
      // Click - select tile
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

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(4, camera.zoom * zoomFactor));

    setCamera(prev => ({
      x: mouseX - (mouseX - prev.x) * (newZoom / prev.zoom),
      y: mouseY - (mouseY - prev.y) * (newZoom / prev.zoom),
      zoom: newZoom,
    }));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoverTile(null); }}
        onWheel={handleWheel}
      />
      {hoverTile && hoverTile.explored?.[playerId] && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: '#1a1a2eee',
          color: '#e0e0e0',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 12,
          border: '1px solid #333',
          pointerEvents: 'none',
        }}>
          <strong>{hoverTile.terrain.name}</strong>
          {hoverTile.resource && ` | ${hoverTile.resource}`}
          {hoverTile.owner && ` | ${nations.find(n => n.id === hoverTile.owner)?.name || 'Unknown'}`}
          {hoverTile.units.length > 0 && ` | ${hoverTile.units.length} unit(s)`}
        </div>
      )}
    </div>
  );
}

function getBuildingIcon(type) {
  const icons = {
    farm: '🌾', ranch: '🐄', lumber_camp: '🪓', mine: '⛏', gold_mine: '🥇',
    oil_well: '🛢', fishing_port: '🎣', plantation: '🌿', sawmill: '🏭',
    foundry: '🔥', textile_mill: '🧵', arms_factory: '⚔', road: '·',
    railroad: '=', port: '⚓', fort: '🏰', market: '🏪', university: '🎓',
    barracks: '🏛', embassy: '🏛',
  };
  return icons[type] || '🏗';
}

function getMovementRange(unit, tiles) {
  if (!unit || unit.movementLeft <= 0) return [];

  const neighbors = [
    { q: unit.q + 1, r: unit.r },
    { q: unit.q - 1, r: unit.r },
    { q: unit.q, r: unit.r + 1 },
    { q: unit.q, r: unit.r - 1 },
    { q: unit.q + 1, r: unit.r - 1 },
    { q: unit.q - 1, r: unit.r + 1 },
  ];

  return neighbors.filter(n => {
    const tile = tiles[`${n.q},${n.r}`];
    if (!tile) return false;
    if (unit.category === 'land' && (tile.terrain.id === 'deep_ocean' || tile.terrain.id === 'ocean')) return false;
    if (unit.category === 'naval' && !tile.terrain.naval) return false;
    return tile.terrain.moveCost <= unit.movementLeft;
  });
}
