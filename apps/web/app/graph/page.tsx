import { getGraphData } from "@/lib/wiki";
import { GraphView } from "@/components/GraphView";

export const dynamic = "force-dynamic";

export default function GraphPage() {
  const graphData = getGraphData();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[var(--color-wiki-text)] mb-2">Knowledge Graph</h1>
        <p className="text-sm text-[var(--color-wiki-muted)]">
          {graphData.nodes.length} nodes · {graphData.links.length} connections
          · Click a node to open the entry · Scroll to zoom
        </p>
      </div>
      <GraphView data={graphData} />
    </div>
  );
}
