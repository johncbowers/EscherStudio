export type Point = [number, number];
export interface Child { type: string; vertices: string[]; }
export interface Rule { name: string; vertices: string[]; splits: Record<string, string[]>; interior: string[]; children: Child[]; line: number; }
export interface Program { rules: Record<string, Rule>; start: string; depth: number; }
export interface Tile { id: string; type: string; vertices: number[]; parent: string | null; path: number[]; }
export interface Mesh { vertexCount: number; tiles: Tile[]; boundary: number[]; edges: [number, number][]; }
export interface Tiling { levels: Mesh[]; }
export interface Drawing { points: Point[]; radii?: number[]; triangles?: number[][]; iterations: number; residual: number; tangency?: number; converged: boolean; method: string; }
export class EscherError extends Error { constructor(message: string, public line = 1) { super(message); this.name = 'EscherError'; } }
