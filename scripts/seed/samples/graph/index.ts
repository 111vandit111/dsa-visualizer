import type { QuestionInput } from "@/lib/types/question";
import { buildAdjacencyList } from "./adjacency-list";
import { buildAdjacencyMatrix } from "./adjacency-matrix";
import { buildBfs } from "./bfs";
import { buildDfs } from "./dfs";
import { buildDijkstra } from "./dijkstra";
import { buildKruskalMst } from "./kruskal-mst";
import { buildPrimMst } from "./prim-mst";
import { buildTopologicalSort } from "./topological-sort";

export const GRAPH_SAMPLES: (() => QuestionInput)[] = [
  buildAdjacencyMatrix,
  buildAdjacencyList,
  buildBfs,
  buildDfs,
  buildDijkstra,
  buildPrimMst,
  buildKruskalMst,
  buildTopologicalSort,
];
