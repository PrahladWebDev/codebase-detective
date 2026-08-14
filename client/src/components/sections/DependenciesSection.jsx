import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Handle, Position, ReactFlowProvider, useReactFlow, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { X } from 'lucide-react';
import { SectionHeader, SearchInput } from '../../layouts/DashboardLayout.jsx';
import { formatNumber } from '../../utils/format.js';

// Flags layered on top of the per-module color, not a replacement for it.
const FLAG_COLORS = {
  warning: '#F2C94C',
  critical: '#E5484D',
};

// --- Dynamic per-module color -------------------------------------------
// Every module gets its own stable color derived from a hash of its path,
// so two different nodes basically never look identical. Same input -> same
// color every render (no randomness), which keeps re-layouts stable.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

function colorForId(id) {
  const hash = hashString(id);
  const hue = hash % 360;
  // Fixed sat/lightness tuned to stay legible on the dark canvas.
  const border = `hsl(${hue}, 65%, 62%)`;
  const bg = `hsl(${hue}, 45%, 12%)`;
  const text = `hsl(${hue}, 70%, 82%)`;
  return { border, bg, text };
}

function GraphNode({ data }) {
  const colors = colorForId(data.id);
  const flag = data.flag; // 'warning' | 'critical' | null
  const ringColor = flag ? FLAG_COLORS[flag] : null;

  return (
    <div
      className="relative px-3 py-2 rounded-lg mono text-xs shadow"
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        color: colors.text,
        minWidth: 120,
        boxShadow: ringColor ? `0 0 0 2px ${ringColor}55, 0 0 10px ${ringColor}66` : undefined,
      }}
      title={data.fullPath}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {flag && (
        <span
          className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full border border-ink-900"
          style={{ background: ringColor }}
          title={flag === 'critical' ? 'Part of a circular dependency' : 'High fan-in (≥8)'}
        />
      )}
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { detective: GraphNode };

function layoutNodes(nodes) {
  const cols = Math.max(4, Math.ceil(Math.sqrt(nodes.length)));
  const spacingX = 220;
  const spacingY = 110;
  return nodes.map((n, i) => ({
    x: (i % cols) * spacingX,
    y: Math.floor(i / cols) * spacingY,
  }));
}

function GraphInner({ report, highlightPath }) {
  const { nodes: rawNodes, edges: rawEdges, mostConnected } = report.dependencies;
  const cycles = report.detectors.circularDependencies;
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const { fitView, setCenter } = useReactFlow();

  const cycleFiles = useMemo(() => {
    const set = new Set();
    cycles.forEach((c) => c.files.forEach((f) => set.add(f)));
    return set;
  }, [cycles]);

  const visibleNodes = useMemo(() => {
    const base = query
      ? rawNodes.filter((n) => n.path.toLowerCase().includes(query.toLowerCase()))
      : rawNodes.filter((n) => n.incoming > 0 || n.outgoing > 0).slice(0, 180);
    return base.length ? base : rawNodes.slice(0, 60);
  }, [rawNodes, query]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const positions = useMemo(() => layoutNodes(visibleNodes), [visibleNodes]);

  const flowNodes = visibleNodes.map((n, i) => {
    const flag = cycleFiles.has(n.id) ? 'critical' : n.incoming >= 8 ? 'warning' : null;
    return {
      id: n.id,
      type: 'detective',
      position: positions[i],
      data: { id: n.id, label: n.label, fullPath: n.path, flag },
    };
  });

  const flowEdges = rawEdges
    .filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))
    .map((e, i) => {
      const isCycle = cycleFiles.has(e.from) && cycleFiles.has(e.to);
      // Edge takes its color from the importing (source) module, so the
      // flow visually "belongs" to the node it originates from. Cycle
      // edges stay red so problem loops are still unmistakable.
      const color = isCycle ? FLAG_COLORS.critical : colorForId(e.from).border;
      return {
        id: `e-${i}`,
        source: e.from,
        target: e.to,
        animated: true,
        className: isCycle ? 'edge-glow edge-glow-critical' : 'edge-glow',
        style: { stroke: color, strokeWidth: isCycle ? 2 : 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 16,
          height: 16,
        },
      };
    });

  useEffect(() => {
    if (highlightPath) {
      setSelectedId(highlightPath);
      setTimeout(() => fitView({ nodes: [{ id: highlightPath }], duration: 500, maxZoom: 1.2 }), 50);
    }
  }, [highlightPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedNode = rawNodes.find((n) => n.id === selectedId);
  const importsOf = (path) => rawEdges.filter((e) => e.from === path).map((e) => e.to);
  const importedByOf = (path) => rawEdges.filter((e) => e.to === path).map((e) => e.from);

  return (
    <div>
      <SectionHeader
        title="Dependency Graph"
        description={`${formatNumber(rawEdges.length)} internal edges across ${formatNumber(rawNodes.length)} files`}
        right={<SearchInput value={query} onChange={setQuery} placeholder="Search modules..." />}
      />

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="card overflow-hidden h-[420px] sm:h-[560px]">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1F2530" gap={20} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              className="hidden sm:block"
              nodeColor={(n) => colorForId(n.id).border}
              style={{ background: '#0F131A' }}
            />
          </ReactFlow>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-display font-semibold text-sm mb-3">Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border" style={{ borderColor: '#7C8AA5' }} />
                Each module gets its own color; edges match the importing module
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: FLAG_COLORS.warning }} />
                Dot = high fan-in (≥8 dependents)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: FLAG_COLORS.critical }} />
                Dot / red edge = part of a circular dependency
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-ink-800 mt-1">
                <span className="w-4 h-0.5 rounded-full bg-spotlight shadow-glow" />
                Glowing, animated edges flow from importer → imported (arrowhead marks direction)
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display font-semibold text-sm mb-3">Most Connected Modules</h3>
            <ol className="space-y-2 text-xs">
              {mostConnected.slice(0, 8).map((m, i) => (
                <li key={m.path}>
                  <button onClick={() => setSelectedId(m.path)} className="w-full flex justify-between items-center gap-2 hover:text-spotlight text-left">
                    <span className="mono truncate text-paper-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorForId(m.path).border }} />
                      {i + 1}. {m.path.split('/').pop()}
                    </span>
                    <span className="text-paper-500 shrink-0">{m.dependents} dependents</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={() => setSelectedId(null)}>
          <div className="w-full max-w-md h-full bg-ink-900 border-l border-ink-700 p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-paper-500 mb-1">Module Details</p>
                <p className="mono text-sm text-spotlight break-all">{selectedNode.path}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-paper-500 hover:text-paper-100">
                <X size={18} />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-xs text-paper-500 mb-2">Imports ({importsOf(selectedNode.path).length})</p>
              <ul className="space-y-1 mono text-xs text-paper-300">
                {importsOf(selectedNode.path).slice(0, 20).map((p) => <li key={p} className="truncate">- {p}</li>)}
                {importsOf(selectedNode.path).length === 0 && <li className="text-paper-500">None</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs text-paper-500 mb-2">Imported by ({importedByOf(selectedNode.path).length})</p>
              <ul className="space-y-1 mono text-xs text-paper-300">
                {importedByOf(selectedNode.path).slice(0, 20).map((p) => <li key={p} className="truncate">- {p}</li>)}
                {importedByOf(selectedNode.path).length === 0 && <li className="text-paper-500">None</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DependenciesSection({ report, highlightPath }) {
  return (
    <ReactFlowProvider>
      <GraphInner report={report} highlightPath={highlightPath} />
    </ReactFlowProvider>
  );
}
