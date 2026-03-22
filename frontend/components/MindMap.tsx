'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

interface MindMapProps {
  initialNodes: Node[];
  initialEdges: Edge[];
}

export default function MindMap({ initialNodes, initialEdges }: MindMapProps) {
  // We keep the raw data in state, and only render the "visible" parts
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper to find all descendants of a node to hide them when collapsed
  const getDescendants = useCallback((nodeId: string, edges: Edge[]): string[] => {
    const children = edges.filter(e => e.source === nodeId).map(e => e.target);
    return children.reduce((acc, childId) => {
      return [...acc, childId, ...getDescendants(childId, edges)];
    }, [] as string[]);
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        // Collapse: Remove this node and all its descendants from expanded set
        next.delete(nodeId);
        const descendants = getDescendants(nodeId, initialEdges);
        descendants.forEach(d => next.delete(d));
      } else {
        // Expand
        next.add(nodeId);
      }
      return next;
    });
  }, [initialEdges, getDescendants]);

  // Compute visible nodes and edges based on expansion state
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const vNodes: Node[] = [];
    const vEdges: Edge[] = [];

    // A node is visible if it is 'root' OR its parent is expanded
    const isVisible = (nodeId: string): boolean => {
      if (nodeId === 'root') return true;
      const parentEdge = initialEdges.find(e => e.target === nodeId);
      if (!parentEdge) return true; // Orphan nodes are visible by default
      return expandedNodes.has(parentEdge.source) && isVisible(parentEdge.source);
    };

    initialNodes.forEach((node) => {
      if (isVisible(node.id)) {
        // Check if node has children
        const hasChildren = initialEdges.some(e => e.source === node.id);
        const isExpanded = expandedNodes.has(node.id);

        vNodes.push({
          ...node,
          type: 'custom',
          data: {
            ...node.data,
            hasChildren,
            isExpanded,
            onToggle: () => toggleNode(node.id),
          }
        });
      }
    });

    initialEdges.forEach((edge) => {
      if (isVisible(edge.source) && isVisible(edge.target) && expandedNodes.has(edge.source)) {
        vEdges.push({ ...edge, animated: true });
      }
    });

    return { visibleNodes: vNodes, visibleEdges: vEdges };
  }, [initialNodes, initialEdges, expandedNodes, toggleNode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(visibleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

  // Sync state when visible elements change
  useEffect(() => {
    setNodes(visibleNodes);
    setEdges(visibleEdges);
  }, [visibleNodes, visibleEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className={`relative w-full border border-cyber-blue/40 bg-void rounded-2xl shadow-[inset_0_0_50px_rgba(0,163,255,0.05)] overflow-hidden transition-all duration-500 z-50 ${isFullscreen ? 'fixed inset-4 h-[calc(100vh-2rem)]' : 'h-[600px] mb-8'}`}>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
         {/* Fullscreen toggle button */}
         <button 
           onClick={() => setIsFullscreen(!isFullscreen)}
           className="p-2 rounded-lg bg-panel border border-border-dim text-cyber-blue hover:text-white hover:border-cyber-blue transition-colors shadow-[0_0_15px_rgba(0,163,255,0.1)]"
           title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
         >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
              )}
            </svg>
         </button>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="cyberpunk-flow"
        minZoom={0.5}
        maxZoom={4}
      >
        <Controls 
          className="bg-panel border border-border-dim !rounded-lg overflow-hidden [&>button]:!border-border-dim [&>button:hover]:!bg-cyber-blue/20 [&_svg]:fill-black dark:[&_svg]:fill-cyan-400 [&_path]:fill-black dark:[&_path]:fill-cyan-400"
        />
        <MiniMap 
          className="!bg-panel !border !border-border-dim !rounded-lg overflow-hidden" 
          nodeColor={(n) => n.id === 'root' ? '#FF4D00' : '#00A3FF'}
          maskColor="rgba(5,5,5,0.7)"
        />
        <Background gap={16} size={1} color="#334155" />
      </ReactFlow>

      {/* Global CSS overrides for the nodes and edges to make them cyberpunk */}
      <style jsx global>{`
        .cyberpunk-flow .react-flow__node {
          @apply rounded-xl border border-border-dim bg-panel/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,163,255,0.1)] text-text-main text-sm font-sans px-4 py-2 transition-all cursor-pointer;
        }
        .cyberpunk-flow .react-flow__node:hover {
          @apply border-cyber-blue shadow-[0_0_20px_rgba(0,163,255,0.4)] scale-105 z-10;
        }
        .cyberpunk-flow .react-flow__node-input {
          @apply border-neon-orange/80 bg-neon-orange/10 shadow-[0_0_25px_rgba(255,77,0,0.3)] text-white font-bold text-base;
        }
        
        .cyberpunk-flow .react-flow__edge-path {
          @apply stroke-cyber-blue/60 stroke-[2] drop-shadow-[0_0_8px_rgba(0,163,255,0.8)];
        }
        .cyberpunk-flow .react-flow__edge.animated .react-flow__edge-path {
          stroke-dasharray: 5;
          animation: flowdash 30s linear infinite;
        }
        
        .cyberpunk-flow .react-flow__handle {
          @apply bg-text-main border-none w-2 h-2 rounded-full;
        }
        .cyberpunk-flow .react-flow__node-input .react-flow__handle {
          @apply bg-neon-orange shadow-glow-orange w-3 h-3;
        }

        @keyframes flowdash {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
