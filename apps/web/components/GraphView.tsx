"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(() => import("react-force-graph-2d"), { ssr: false });

interface GraphNode {
  id: string;
  name: string;
  tags: string[];
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: { id: string; name: string; tags: string[] }[];
  links: { source: string; target: string }[];
}

interface Props {
  data: GraphData;
}

const TAG_COLORS = [
  "#7c6af7", "#60a5fa", "#34d399", "#f59e0b",
  "#f87171", "#a78bfa", "#38bdf8", "#4ade80",
  "#fb923c", "#e879f9", "#2dd4bf", "#fbbf24",
];

function getNodeColor(node: GraphNode, tagColorMap: Map<string, string>): string {
  return node.tags.length > 0 ? (tagColorMap.get(node.tags[0]) ?? "#7c6af7") : "#4a4e6a";
}

export function GraphView({ data }: Props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const hoveredRef = useRef<GraphNode | null>(null);
  const forceConfigured = useRef(false);
  const zoomFitted = useRef(false);

  const allTags = useMemo(
    () => Array.from(new Set(data.nodes.flatMap((n) => n.tags))),
    [data.nodes]
  );
  const tagColorMap = useMemo(
    () => new Map(allTags.map((tag, i) => [tag, TAG_COLORS[i % TAG_COLORS.length]])),
    [allTags]
  );

  const connectionCount = useMemo(() => {
    const count = new Map<string, number>();
    data.links.forEach((link) => {
      const s = typeof link.source === "object" ? (link.source as GraphNode).id : (link.source as string);
      const t = typeof link.target === "object" ? (link.target as GraphNode).id : (link.target as string);
      count.set(s, (count.get(s) ?? 0) + 1);
      count.set(t, (count.get(t) ?? 0) + 1);
    });
    return count;
  }, [data.links]);

  const handleClick = useCallback(
    (node: GraphNode) => router.push(`/wiki/${node.id}`),
    [router]
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    hoveredRef.current = node;
    document.body.style.cursor = node ? "pointer" : "default";
  }, []);

  const handleEngineStop = useCallback(() => {
    const fg = graphRef.current;
    if (!fg) return;

    if (!forceConfigured.current) {
      fg.d3Force("charge")?.strength(-350);
      fg.d3Force("link")?.distance(90).strength(0.4);
      forceConfigured.current = true;
      fg.d3ReheatSimulation();
      return;
    }

    if (!zoomFitted.current) {
      fg.zoomToFit(500, 60);
      zoomFitted.current = true;
    }
  }, []);

  const zoomIn = useCallback(() => {
    const fg = graphRef.current;
    if (fg) fg.zoom(fg.zoom() * 1.5, 300);
  }, []);

  const zoomOut = useCallback(() => {
    const fg = graphRef.current;
    if (fg) fg.zoom(fg.zoom() / 1.5, 300);
  }, []);

  const zoomFit = useCallback(() => {
    graphRef.current?.zoomToFit(400, 60);
  }, []);

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHovered = hoveredRef.current?.id === node.id;
      const connections = connectionCount.get(node.id) ?? 0;
      const r = Math.max(4, Math.min(14, 5 + connections * 1.5));
      const color = getNodeColor(node, tagColorMap);
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;

      // Outer glow ring
      if (isHovered || connections >= 4) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + (isHovered ? 6 : 4), 0, 2 * Math.PI);
        ctx.fillStyle = color + (isHovered ? "45" : "22");
        ctx.fill();
      }

      // Node fill
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? color : color + "cc";
      ctx.fill();

      // Node border
      ctx.strokeStyle = isHovered ? "#ffffff90" : color + "70";
      ctx.lineWidth = isHovered ? 1.5 : 0.8;
      ctx.stroke();

      // Label
      const fontSize = Math.max(9, Math.min(13, 11 / Math.max(globalScale, 0.3)));
      const label = node.name.length > 28 ? node.name.slice(0, 26) + "…" : node.name;

      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      const tw = ctx.measureText(label).width;
      const tx = nx;
      const ty = ny + r + 3;

      // Dark pill background for readability
      ctx.fillStyle = "#0a0c12b0";
      ctx.beginPath();
      const pad = 2.5;
      ctx.roundRect(tx - tw / 2 - pad, ty - 1, tw + pad * 2, fontSize + 2, 2);
      ctx.fill();

      ctx.fillStyle = isHovered ? "#ffffff" : "#b8bbd4";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, tx, ty);
    },
    [tagColorMap, connectionCount]
  );

  return (
    <div className="relative rounded-2xl border border-[var(--color-wiki-border)] overflow-hidden bg-[#0a0c12] graph-container">
      {/* Zoom controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
        {[
          { icon: <ZoomIn size={14} />, action: zoomIn, title: "Zoom in" },
          { icon: <ZoomOut size={14} />, action: zoomOut, title: "Zoom out" },
          { icon: <Maximize2 size={13} />, action: zoomFit, title: "Fit to screen" },
        ].map(({ icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-wiki-surface)]/90 border border-[var(--color-wiki-border)] text-[var(--color-wiki-muted)] hover:text-white hover:border-[var(--color-wiki-accent)]/60 transition-colors backdrop-blur-sm"
          >
            {icon}
          </button>
        ))}
      </div>

      {data.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-96 text-[var(--color-wiki-muted)]">
          <div className="text-center">
            <p className="text-lg mb-2">No entries to visualize yet.</p>
            <p className="text-sm">Create some wiki entries with [[wikilinks]] to see the graph.</p>
          </div>
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          nodeLabel={() => ""}
          nodeCanvasObject={paintNode as (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
          nodeCanvasObjectMode={() => "replace"}
          linkColor={() => "#2e3250"}
          linkWidth={1}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={0}
          backgroundColor="#0a0c12"
          width={undefined}
          height={700}
          onNodeClick={handleClick as (node: object) => void}
          onNodeHover={handleNodeHover as (node: object | null) => void}
          onEngineStop={handleEngineStop}
          cooldownTicks={200}
          warmupTicks={80}
          d3AlphaDecay={0.012}
          d3VelocityDecay={0.2}
        />
      )}

      {/* Tag legend */}
      {allTags.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-[var(--color-wiki-bg)]/90 backdrop-blur-sm border border-[var(--color-wiki-border)] rounded-xl px-3 py-2.5 max-h-72 overflow-y-auto">
          <p className="text-[11px] font-semibold text-[var(--color-wiki-muted)] uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-col gap-1.5">
            {allTags.slice(0, 14).map((tag) => (
              <div key={tag} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tagColorMap.get(tag) }}
                />
                <span className="text-[11px] text-[var(--color-wiki-muted)]">{tag}</span>
              </div>
            ))}
            {allTags.length > 14 && (
              <p className="text-[10px] text-[var(--color-wiki-muted)]/50 mt-0.5">+{allTags.length - 14} more</p>
            )}
          </div>
        </div>
      )}

      {/* Hint bar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="text-[10px] text-[var(--color-wiki-muted)]/50 bg-[var(--color-wiki-bg)]/60 backdrop-blur-sm px-3 py-1 rounded-full">
          Click node to open · Scroll to zoom · Drag to pan
        </p>
      </div>
    </div>
  );
}
