"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

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

// Tag-based color palette
const TAG_COLORS = [
  "#7c6af7", "#60a5fa", "#34d399", "#f59e0b",
  "#f87171", "#a78bfa", "#38bdf8", "#4ade80",
];

function getNodeColor(node: GraphNode, tagColorMap: Map<string, string>): string {
  if (node.tags.length > 0) {
    return tagColorMap.get(node.tags[0]) ?? "#7c6af7";
  }
  return "#4a4e6a";
}

export function GraphView({ data }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<GraphNode | null>(null);

  // Build tag-color mapping
  const allTags = Array.from(new Set(data.nodes.flatMap((n) => n.tags)));
  const tagColorMap = new Map(allTags.map((tag, i) => [tag, TAG_COLORS[i % TAG_COLORS.length]]));

  const handleClick = useCallback(
    (node: GraphNode) => {
      router.push(`/wiki/${node.id}`);
    },
    [router]
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHovered(node);
    document.body.style.cursor = node ? "pointer" : "default";
  }, []);

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name;
      const fontSize = Math.max(10, 14 / globalScale);
      const isHovered = hovered?.id === node.id;
      const r = isHovered ? 8 : 6;
      const color = getNodeColor(node, tagColorMap);

      // Glow effect for hovered node
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
        ctx.fillStyle = color + "40";
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = isHovered ? "#ffffff" : color + "80";
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Label
      if (globalScale > 0.6) {
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = isHovered ? "#ffffff" : "#c4c6d8";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + r + 3);
      }
    },
    [hovered, tagColorMap]
  );

  return (
    <div className="relative rounded-2xl border border-[var(--color-wiki-border)] overflow-hidden bg-[var(--color-wiki-surface)] graph-container">
      {data.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-96 text-[var(--color-wiki-muted)]">
          <div className="text-center">
            <p className="text-lg mb-2">No entries to visualize yet.</p>
            <p className="text-sm">Create some wiki entries with [[wikilinks]] to see the graph.</p>
          </div>
        </div>
      ) : (
        <ForceGraph2D
          graphData={data}
          nodeLabel={() => ""}
          nodeCanvasObject={paintNode as (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
          nodeCanvasObjectMode={() => "replace"}
          linkColor={() => "#2a2d3a"}
          linkWidth={1.5}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          backgroundColor="#1a1d27"
          width={undefined}
          height={600}
          onNodeClick={handleClick as (node: object) => void}
          onNodeHover={handleNodeHover as (node: object | null) => void}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      )}

      {hovered && (
        <div className="absolute bottom-4 left-4 bg-[var(--color-wiki-bg)]/90 backdrop-blur-sm border border-[var(--color-wiki-border)] rounded-lg px-4 py-3 text-sm pointer-events-none">
          <p className="font-semibold text-white">{hovered.name}</p>
          {hovered.tags.length > 0 && (
            <p className="text-[var(--color-wiki-muted)] text-xs mt-1">
              {hovered.tags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
          <p className="text-[var(--color-wiki-muted)] text-xs mt-0.5">Click to open</p>
        </div>
      )}

      {/* Legend */}
      {allTags.length > 0 && (
        <div className="absolute top-4 right-4 bg-[var(--color-wiki-bg)]/90 backdrop-blur-sm border border-[var(--color-wiki-border)] rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-[var(--color-wiki-muted)] mb-1.5">Tags</p>
          <div className="flex flex-col gap-1">
            {allTags.slice(0, 8).map((tag) => (
              <div key={tag} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: tagColorMap.get(tag) }}
                />
                <span className="text-xs text-[var(--color-wiki-muted)]">{tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
