"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Maximize2, Search, X, ZoomIn, ZoomOut } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(() => import("react-force-graph-2d"), { ssr: false });

interface GraphNode {
  id: string;
  name: string;
  tags: string[];
  missing?: boolean;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  missing?: boolean;
}

interface GraphData {
  nodes: GraphNode[];
  links: { source: string; target: string; missing?: boolean }[];
}

interface Props {
  data: GraphData;
}

const TAG_COLORS = [
  "#7c6af7", "#60a5fa", "#34d399", "#f59e0b",
  "#f87171", "#a78bfa", "#38bdf8", "#4ade80",
  "#fb923c", "#e879f9", "#2dd4bf", "#fbbf24",
];

function nodeId(node: string | GraphNode): string {
  return typeof node === "object" ? node.id : node;
}

function getNodeColor(node: GraphNode, tagColorMap: Map<string, string>): string {
  if (node.missing) return "#8b8fa8";
  return node.tags.length > 0 ? (tagColorMap.get(node.tags[0]) ?? "#7c6af7") : "#4a4e6a";
}

export function GraphView({ data }: Props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const hoveredRef = useRef<GraphNode | null>(null);
  const forceConfigured = useRef(false);
  const zoomFitted = useRef(false);
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  const allTags = useMemo(
    () => Array.from(new Set(data.nodes.flatMap((node) => node.tags))).sort(),
    [data.nodes]
  );
  const tagColorMap = useMemo(
    () => new Map(allTags.map((tag, i) => [tag, TAG_COLORS[i % TAG_COLORS.length]])),
    [allTags]
  );

  const visibleData = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nodes = data.nodes.filter((node) => {
      const matchesTag = selectedTag === "all" || node.tags.includes(selectedTag);
      const matchesQuery = !q || node.name.toLowerCase().includes(q) || node.id.toLowerCase().includes(q);
      return matchesTag && matchesQuery;
    });
    const visibleIds = new Set(nodes.map((node) => node.id));
    return {
      nodes,
      links: data.links.filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target)),
    };
  }, [data, query, selectedTag]);

  const connectionCount = useMemo(() => {
    const count = new Map<string, number>();
    visibleData.links.forEach((link) => {
      const source = nodeId(link.source);
      const target = nodeId(link.target);
      count.set(source, (count.get(source) ?? 0) + 1);
      count.set(target, (count.get(target) ?? 0) + 1);
    });
    return count;
  }, [visibleData.links]);

  const handleClick = useCallback(
    (node: GraphNode) => {
      if (!node.missing) router.push(`/wiki/${node.id}`);
    },
    [router]
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    hoveredRef.current = node;
    document.body.style.cursor = node && !node.missing ? "pointer" : "default";
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

      if (isHovered || connections >= 4) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + (isHovered ? 6 : 4), 0, 2 * Math.PI);
        ctx.fillStyle = color + (isHovered ? "45" : "22");
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? color : color + "cc";
      ctx.fill();

      if (node.missing) ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isHovered ? "#ffffff90" : color + "70";
      ctx.lineWidth = isHovered ? 1.5 : 0.8;
      ctx.stroke();
      ctx.setLineDash([]);

      const fontSize = Math.max(9, Math.min(13, 11 / Math.max(globalScale, 0.3)));
      const labelText = node.missing ? `${node.name} ?` : node.name;
      const label = labelText.length > 28 ? labelText.slice(0, 26) + "..." : labelText;

      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      const tw = ctx.measureText(label).width;
      const tx = nx;
      const ty = ny + r + 3;

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
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--color-wiki-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-8 w-44 rounded-lg bg-[var(--color-wiki-surface)]/90 border border-[var(--color-wiki-border)] pl-7 pr-7 text-xs text-white outline-none focus:border-[var(--color-wiki-accent)] backdrop-blur-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              title="Clear"
              className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-[var(--color-wiki-muted)] hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
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
      </div>

      {data.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-96 text-[var(--color-wiki-muted)]">
          <p className="text-lg">No entries yet.</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          graphData={visibleData}
          nodeLabel={() => ""}
          nodeCanvasObject={paintNode as (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
          nodeCanvasObjectMode={() => "replace"}
          linkColor={(link: object) => ((link as GraphLink).missing ? "#8b8fa855" : "#2e3250")}
          linkWidth={(link: object) => ((link as GraphLink).missing ? 0.8 : 1)}
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

      {(allTags.length > 0 || data.nodes.some((node) => node.missing)) && (
        <div className="absolute top-4 right-4 z-10 bg-[var(--color-wiki-bg)]/90 backdrop-blur-sm border border-[var(--color-wiki-border)] rounded-xl px-3 py-2.5 max-h-72 overflow-y-auto">
          <p className="text-[11px] font-semibold text-[var(--color-wiki-muted)] uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setSelectedTag("all")}
              className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs ${selectedTag === "all" ? "bg-[var(--color-wiki-surface)] text-white" : "text-[var(--color-wiki-muted)] hover:text-white"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#4a4e6a]" />
              All
            </button>
            {allTags.slice(0, 14).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs ${selectedTag === tag ? "bg-[var(--color-wiki-surface)] text-white" : "text-[var(--color-wiki-muted)] hover:text-white"}`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tagColorMap.get(tag) }} />
                <span className="truncate max-w-32">{tag}</span>
              </button>
            ))}
            {data.nodes.some((node) => node.missing) && (
              <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-[var(--color-wiki-muted)]">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[var(--color-wiki-muted)]" />
                Missing
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
