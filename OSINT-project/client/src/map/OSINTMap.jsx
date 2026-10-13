import React, { useState } from 'react';

/**
 * Simple SVG-based network map. Real geo map chahiye to
 * react-leaflet use karo, lekin yeh offline-friendly hai.
 */
export default function OSINTMap({ nodes = [] }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(new Set());

  const reveal = (id) => {
    setRevealed((prev) => new Set(prev).add(id));
  };

  return (
    <div className="relative">
      <svg viewBox="0 0 400 300" className="w-full h-72 bg-slate-900 rounded">
        {/* Edges */}
        {nodes.map((n) =>
          (n.connections || []).map((targetId) => {
            const target = nodes.find((x) => x.id === targetId);
            if (!target) return null;
            return (
              <line
                key={`${n.id}-${targetId}`}
                x1={n.x} y1={n.y} x2={target.x} y2={target.y}
                stroke="#334155" strokeWidth="1"
              />
            );
          })
        )}
        {/* Nodes */}
        {nodes.map((n) => (
          <g key={n.id} onClick={() => { setSelected(n); reveal(n.id); }} style={{ cursor: 'pointer' }}>
            <circle
              cx={n.x} cy={n.y} r="8"
              fill={revealed.has(n.id) ? '#3b82f6' : '#475569'}
              stroke="#1e293b" strokeWidth="2"
            />
            {revealed.has(n.id) && (
              <text x={n.x + 12} y={n.y + 4} fill="#94a3b8" fontSize="10">
                {n.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {selected && revealed.has(selected.id) && (
        <div className="absolute top-2 right-2 bg-slate-800 p-3 rounded text-sm max-w-xs">
          <div className="font-bold">{selected.label}</div>
          <div className="text-slate-400">{selected.ip || selected.hash}</div>
          {selected.hint && <div className="mt-1 text-xs">{selected.hint}</div>}
        </div>
      )}
    </div>
  );
}