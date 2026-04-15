"use client";

import { useMemo } from "react";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow } from "@xyflow/react";
import type { Edge, Node, NodeProps, NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TableSchema, Theme } from "@/lib/types";
import { cn } from "@/lib/utils";

type DatabaseSchemaDiagramProps = {
  theme: Theme;
  schemas: Record<string, TableSchema>;
  emptyLabel: string;
};

const NODE_WIDTH = 260;
const NODE_X_GAP = 64;
const NODE_Y_GAP = 40;
const MAX_TABLES_PER_COLUMN = 3;

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const stripPkPrefixSuffix = (value: string) => {
  let next = normalizeName(value);
  next = next.replace(/^(cd|id|fk|cod|codigo)/, "");
  next = next.replace(/(id|codigo|cod)$/, "");
  return next;
};
const ignoredColumnNames = new Set(["id", "codigo", "cod", "cd", "uuid", "createdat", "updatedat"]);
const getNodeHeight = (columnsCount: number) => 46 + columnsCount * 30;

const handleId = (columnName: string, side: "left" | "right") => `${side}:${normalizeName(columnName)}`;

type SchemaNodeData = {
  theme: Theme;
  tableName: string;
  columns: TableSchema["columns"];
};

function SchemaNode({ data }: NodeProps<Node<SchemaNodeData>>) {
  return (
    <div className={cn("w-[270px] rounded-xl border shadow-sm", data.theme === "dark" ? "border-white/10 bg-[#1d1d1d]" : "border-slate-200 bg-white")}>
      <div className={cn("border-b px-3 py-2 text-sm font-semibold", data.theme === "dark" ? "border-white/10 text-zinc-100" : "border-slate-200 text-slate-900")}>
        {data.tableName}
      </div>
      <div>
        {data.columns.map((column) => (
          <div key={`${data.tableName}-${column.name}`} className={cn("relative flex items-center justify-between border-b px-3 py-1.5 text-[11px] last:border-b-0", data.theme === "dark" ? "border-white/10" : "border-slate-100")}>
            <Handle
              type="target"
              position={Position.Left}
              id={handleId(column.name, "left")}
              style={{ width: 2, height: 2, left: -1, opacity: 0 }}
              className="pointer-events-none"
            />
            <span className={cn("truncate pr-2", data.theme === "dark" ? "text-zinc-200" : "text-slate-700")}>
              {column.name}
              {column.primary_key ? " (PK)" : ""}
            </span>
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px]", data.theme === "dark" ? "bg-white/10 text-zinc-400" : "bg-slate-100 text-slate-500")}>
              {column.col_type}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={handleId(column.name, "right")}
              style={{ width: 2, height: 2, right: -1, opacity: 0 }}
              className="pointer-events-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const buildSchemaNodes = (schemas: Record<string, TableSchema>, theme: Theme): Node<SchemaNodeData>[] => {
  const tableNames = Object.keys(schemas);
  const accumulatedYByColumn = new Map<number, number>();

  return tableNames.map((tableName, index) => {
    const col = Math.floor(index / MAX_TABLES_PER_COLUMN);
    const nodeHeight = getNodeHeight(schemas[tableName].columns.length);
    const currentY = accumulatedYByColumn.get(col) ?? 0;
    accumulatedYByColumn.set(col, currentY + nodeHeight + NODE_Y_GAP);

    return {
      id: tableName,
      type: "schemaNode",
      position: {
        x: col * (NODE_WIDTH + NODE_X_GAP),
        y: currentY,
      },
      data: {
        theme,
        tableName,
        columns: schemas[tableName].columns,
      },
      draggable: true,
      selectable: true,
    };
  });
};

const buildSchemaEdges = (schemas: Record<string, TableSchema>): Edge[] => {
  const tableNames = Object.keys(schemas);
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const pkByTable = new Map<string, string[]>();

  for (const [tableName, schema] of Object.entries(schemas)) {
    const pks = schema.columns.filter((column) => column.primary_key).map((column) => column.name);
    pkByTable.set(tableName, pks);
  }

  for (const [sourceTable, schema] of Object.entries(schemas)) {
    for (const column of schema.columns) {
      if (column.primary_key) continue;
      const sourceNorm = normalizeName(column.name);
      const sourceCanonical = stripPkPrefixSuffix(column.name);
      if (ignoredColumnNames.has(sourceNorm) || sourceCanonical.length < 2) continue;
      let best: { table: string; pk: string; score: number } | null = null;

      for (const targetTable of tableNames) {
        if (targetTable === sourceTable) continue;
        const targetPks = pkByTable.get(targetTable) ?? [];
        const targetTableNorm = normalizeName(targetTable);
        const targetTableCanonical = stripPkPrefixSuffix(targetTable);

        for (const targetPk of targetPks) {
          const pkNorm = normalizeName(targetPk);
          const pkCanonical = stripPkPrefixSuffix(targetPk);
          if (!pkCanonical || pkCanonical.length < 2) continue;
          let score = 0;

          if (sourceNorm === pkNorm) score += 120;
          if (sourceCanonical === pkCanonical) score += 95;
          if (sourceNorm === `${targetTableNorm}id`) score += 70;
          if (sourceCanonical === targetTableCanonical) score += 55;
          if (sourceNorm.endsWith(pkNorm) || pkNorm.endsWith(sourceNorm)) score += 28;
          if (sourceNorm.endsWith("id")) score += 8;
          if (sourceNorm.includes("data") || sourceNorm.includes("status")) score -= 40;
          if (targetTableCanonical.length < 3) score -= 20;

          if (!best || score > best.score) {
            best = { table: targetTable, pk: targetPk, score };
          }
        }
      }

      if (!best || best.score < 88) continue;

      const edgeId = `${sourceTable}:${column.name}->${best.table}:${best.pk}`;
      if (seen.has(edgeId)) continue;
      seen.add(edgeId);

      edges.push({
        id: edgeId,
        source: sourceTable,
        target: best.table,
        sourceHandle: handleId(column.name, "right"),
        targetHandle: handleId(best.pk, "left"),
        animated: false,
        label: column.name,
        style: { strokeWidth: 1.5 },
      });
    }
  }

  return edges;
};

export function DatabaseSchemaDiagram({ theme, schemas, emptyLabel }: DatabaseSchemaDiagramProps) {
  const tableCount = Object.keys(schemas).length;

  const nodes = useMemo(() => buildSchemaNodes(schemas, theme), [schemas, theme]);
  const edges = useMemo(() => buildSchemaEdges(schemas), [schemas]);
  const nodeTypes = useMemo<NodeTypes>(() => ({ schemaNode: SchemaNode }), []);

  if (tableCount === 0) {
    return (
      <div className={cn("grid h-full min-h-[380px] place-items-center rounded-xl border", theme === "dark" ? "border-white/10 bg-[#1a1a1a] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500")}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn("h-[72vh] w-full overflow-hidden rounded-xl border", theme === "dark" ? "border-white/10 bg-[#141414]" : "border-slate-200 bg-white")}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.24, maxZoom: 1.05 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={18} size={1} />
        <MiniMap pannable zoomable />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
