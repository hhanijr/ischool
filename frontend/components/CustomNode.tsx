'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';

export default function CustomNode({
  data,
  isConnectable,
}: NodeProps & { data: any }) {
  const { label, isExpanded, hasChildren, onToggle } = data;

  return (
    <div className="relative group rounded-xl border border-border-dim bg-panel/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,163,255,0.1)] text-text-main text-sm font-sans px-5 py-3 transition-all cursor-pointer hover:border-cyber-blue hover:shadow-[0_0_20px_rgba(0,163,255,0.4)] hover:scale-[1.02]">
      
      {/* Target handle connecting from Parent */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-cyber-blue !border-none !w-2 !h-2 !-top-1 shadow-[0_0_10px_#00A3FF]"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="font-bold">{label as string}</span>
        
        {/* Expand/Collapse Toggle Button */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggle) onToggle();
            }}
            className="w-5 h-5 rounded-full flex items-center justify-center bg-cyber-blue/20 border border-cyber-blue text-cyber-blue font-bold text-xs hover:bg-cyber-blue hover:text-white transition-colors shadow-[0_0_10px_rgba(0,163,255,0.3)]"
            title={isExpanded ? "Collapse branch" : "Expand branch"}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
      </div>

      {/* Source handle connecting to Children */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bg-electric-green !border-none !w-2 !h-2 !-bottom-1 shadow-[0_0_10px_#32FF00]"
      />
      
      {/* Decorative styling */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-xl" />
    </div>
  );
}
