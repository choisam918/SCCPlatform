/* Mindmap editor (Canvas + SVG hits + HTML nodes) — 流程圖模式 */

const SCHEMA_VERSION = 2;

function cubicBezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: u * uu * p0.x + 3 * t * uu * p1.x + 3 * tt * u * p2.x + t * tt * p3.x,
    y: u * uu * p0.y + 3 * t * uu * p1.y + 3 * tt * u * p2.y + t * tt * p3.y,
  };
}

function cubicBezierTangent(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

function edgeControls(p0, p3) {
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const dist = Math.hypot(dx, dy) || 1;
  const bend = Math.max(28, Math.min(140, dist * 0.35));

  // Prefer bending along the dominant axis; fixes zero-tangent when dx==0
  if (Math.abs(dx) >= Math.abs(dy)) {
    const sx = Math.sign(dx) || 1;
    return {
      p1: { x: p0.x + sx * bend, y: p0.y },
      p2: { x: p3.x - sx * bend, y: p3.y },
    };
  }

  const sy = Math.sign(dy) || 1;
  return {
    p1: { x: p0.x, y: p0.y + sy * bend },
    p2: { x: p3.x, y: p3.y - sy * bend },
  };
}

function edgePolylinePoints(p0, p3, mode = "ortho") {
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const dist = Math.hypot(dx, dy);
  if (!isFinite(dist) || dist < 1) return [p0, p3];

  if (mode === "straight") return [p0, p3];

  // For flowcharts, orthogonal connectors read better.
  if (Math.abs(dx) >= Math.abs(dy)) {
    const mx = (p0.x + p3.x) / 2;
    return [p0, { x: mx, y: p0.y }, { x: mx, y: p3.y }, p3];
  }
  const my = (p0.y + p3.y) / 2;
  return [p0, { x: p0.x, y: my }, { x: p3.x, y: my }, p3];
}

function dist2PointToSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-9) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return dx * dx + dy * dy;
  }
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return dx * dx + dy * dy;
}

function defaultSizeForShape(shape) {
  switch (shape) {
    case "pill":
      return { w: 100, h: 44 };
    case "diamond":
      return { w: 112, h: 112 };
    case "parallelogram":
      return { w: 168, h: 52 };
    case "circle":
      return { w: 110, h: 110 };
    case "database":
      return { w: 170, h: 72 };
    case "document":
      return { w: 170, h: 72 };
    case "manual-input":
      return { w: 176, h: 56 };
    case "preparation":
      return { w: 176, h: 56 };
    case "text":
      return { w: 220, h: 44 };
    case "frame":
      return { w: 520, h: 320 };
    default:
      return { w: 152, h: 52 };
  }
}

function defaultTextForTone(tone) {
  switch (tone) {
    case "terminal":
      return "開始";
    case "decision":
      return "判斷";
    case "io":
      return "輸入／輸出";
    case "subprocess":
      return "子流程";
    default:
      return "處理";
  }
}

function normalizeNodeExtras(raw, shape) {
  const allowedStatus = new Set(["none", "todo", "doing", "done"]);
  const status = allowedStatus.has(raw.status) ? raw.status : "none";

  if (shape === "text") {
    const kind = raw.textKind === "title" ? "title" : "body";
    const fontSize = Number(raw.fontSize);
    const fs = Number.isFinite(fontSize) ? Math.max(10, Math.min(32, fontSize)) : kind === "title" ? 18 : 14;
    const textColor = typeof raw.textColor === "string" && raw.textColor ? raw.textColor : "#0f172a";
    const bg = raw.bg === "yellow" ? "yellow" : "none";
    return { status, textKind: kind, fontSize: fs, textColor, bg };
  }

  return { status };
}

function hasFlowchartDragData(dt) {
  if (!dt?.types) return false;
  const types = Array.from(dt.types);
  return types.includes("application/x-flowchart") || types.includes("text/plain");
}

function readFlowDropPayload(dt) {
  let s = "";
  try {
    s = dt.getData("application/x-flowchart") || dt.getData("text/plain") || "";
  } catch {
    return null;
  }
  if (!s) return null;
  try {
    const o = JSON.parse(s);
    if (o && typeof o.shape === "string" && typeof o.tone === "string") return o;
  } catch {
    return null;
  }
  return null;
}

function rectBoundaryPoint(from, to, node, extend = 0) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!dx && !dy) return { x: cx, y: cy };

  // Intersect ray from center with node's bounding box (good enough for all shapes here)
  const halfW = node.w / 2 + extend;
  const halfH = node.h / 2 + extend;
  const tx = dx !== 0 ? Math.abs(halfW / dx) : Infinity;
  const ty = dy !== 0 ? Math.abs(halfH / dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

function migrateNodeRecord(raw) {
  const allowedShapes = [
    "pill",
    "rect",
    "diamond",
    "parallelogram",
    "circle",
    "database",
    "document",
    "manual-input",
    "preparation",
    "text",
    "frame",
  ];
  const allowedTones = ["terminal", "process", "decision", "io", "subprocess"];
  const shape = allowedShapes.includes(raw.shape) ? raw.shape : "rect";
  let tone = raw.tone;
  if (!allowedTones.includes(tone)) tone = "process";
  const ds = defaultSizeForShape(shape);
  const extras = normalizeNodeExtras(raw || {}, shape);
  return {
    id: raw.id,
    text: String(raw.text ?? ""),
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    w: Number(raw.w) || ds.w,
    h: Number(raw.h) || ds.h,
    shape,
    tone,
    ...extras,
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function snapToGrid(v, grid) {
  if (!grid) return v;
  return Math.round(v / grid) * grid;
}

function nowIso() {
  return new Date().toISOString();
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function uuid() {
  // short-ish id; good enough for local editor
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function isMac() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function isTypingTarget(el) {
  if (!el || !(el instanceof Element)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest("[contenteditable='true']"));
}

function selectAllInElement(el) {
  const sel = window.getSelection();
  if (!sel || !el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
}

function main() {
  const viewport = document.getElementById("viewport");
  if (!viewport) return; // home page

  const edgeCanvas = document.getElementById("edgeCanvas");
  const hitSvg = document.getElementById("hitSvg");
  const nodesLayer = document.getElementById("nodesLayer");
  const statusText = document.getElementById("statusText");
  const overlay = document.getElementById("overlay");

  const toolSelect = document.getElementById("toolSelect");
  const toolNode = document.getElementById("toolNode");
  const toolLine = document.getElementById("toolLine");
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const zoomReset = document.getElementById("zoomReset");
  const zoomFit = document.getElementById("zoomFit");
  const exportJson = document.getElementById("exportJson");
  const importJsonBtn = document.getElementById("importJsonBtn");
  const importJsonFile = document.getElementById("importJsonFile");
  const exportPng = document.getElementById("exportPng");
  const exportSvg = document.getElementById("exportSvg");
  const pngBg = document.getElementById("pngBg");
  const pngScale = document.getElementById("pngScale");
  const flowPresets = document.getElementById("flowPresets");
  const paletteToggle = document.getElementById("paletteToggle");
  const clearAll = document.getElementById("clearAll");
  const applyFlowToSelection = document.getElementById("applyFlowToSelection");
  const edgeMode = document.getElementById("edgeMode");
  const autoLayoutBtn = document.getElementById("autoLayout");
  const minimap = document.getElementById("minimap");
  const minimapCanvas = document.getElementById("minimapCanvas");
  const minimapToggle = document.getElementById("minimapToggle");
  const searchNode = document.getElementById("searchNode");

  const ctx = edgeCanvas.getContext("2d", { alpha: true, desynchronized: true });

  const state = {
    tool: "select", // select | node | line
    viewport: { panX: 120, panY: 80, zoom: 1 },
    nodes: new Map(), // id -> {id, text, x,y, w,h, shape, tone}
    edges: new Map(), // id -> {id, from, to, label}
    selection: { kind: "none", id: null }, // none | node | edge
    lineDraft: { fromNodeId: null },
    drag: null, // {kind, ...}
    history: [],
    future: [],
    editingNodeId: null,
    editingEdgeId: null,
    placementShape: "rect",
    placementTone: "process",
    edgeRouting: "ortho", // ortho | straight
  };

  const edgeLabelEditor = document.createElement("input");
  edgeLabelEditor.type = "text";
  edgeLabelEditor.className = "edge-label-editor";
  edgeLabelEditor.placeholder = "輸入線文字…";
  edgeLabelEditor.autocomplete = "off";
  edgeLabelEditor.spellcheck = false;
  edgeLabelEditor.style.display = "none";
  (overlay || viewport).appendChild(edgeLabelEditor);

  // seed：流程圖起點
  const firstId = uuid();
  const s0 = defaultSizeForShape("pill");
  state.nodes.set(firstId, {
    id: firstId,
    text: "開始",
    x: 48,
    y: 48,
    w: s0.w,
    h: s0.h,
    shape: "pill",
    tone: "terminal",
  });
  state.selection = { kind: "node", id: firstId };

  function resetToInitial() {
    state.nodes.clear();
    state.edges.clear();
    state.selection = { kind: "none", id: null };
    state.lineDraft.fromNodeId = null;
    state.editingNodeId = null;
    state.editingEdgeId = null;
    edgeLabelEditor.style.display = "none";

    const id = uuid();
    const s = defaultSizeForShape("pill");
    state.nodes.set(id, {
      id,
      text: "開始",
      x: 48,
      y: 48,
      w: s.w,
      h: s.h,
      shape: "pill",
      tone: "terminal",
    });
    state.selection = { kind: "node", id };
    state.viewport.panX = 120;
    state.viewport.panY = 80;
    state.viewport.zoom = 1;
    state.placementShape = "rect";
    state.placementTone = "process";
    syncFlowPresetButtons();
    render();
  }

  function computeLevels() {
    const indeg = new Map();
    const out = new Map();
    for (const n of state.nodes.values()) {
      indeg.set(n.id, 0);
      out.set(n.id, []);
    }
    for (const e of state.edges.values()) {
      if (!out.has(e.from) || !indeg.has(e.to)) continue;
      out.get(e.from).push(e.to);
      indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    }

    const q = [];
    for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);
    if (q.length === 0) q.push(...state.nodes.keys());

    const level = new Map();
    for (const id of q) level.set(id, 0);

    while (q.length) {
      const id = q.shift();
      const l = level.get(id) || 0;
      for (const to of out.get(id) || []) {
        level.set(to, Math.max(level.get(to) || 0, l + 1));
        indeg.set(to, (indeg.get(to) || 0) - 1);
        if ((indeg.get(to) || 0) === 0) q.push(to);
      }
    }
    return level;
  }

  function autoLayoutNow() {
    if (state.nodes.size === 0) return;
    pushHistory();
    const level = computeLevels();
    const groups = new Map(); // level -> nodeIds
    for (const n of state.nodes.values()) {
      const l = level.get(n.id) ?? 0;
      if (!groups.has(l)) groups.set(l, []);
      groups.get(l).push(n.id);
    }
    const levels = Array.from(groups.keys()).sort((a, b) => a - b);

    const colGap = 220;
    const rowGap = 120;
    const startX = 60;
    const startY = 60;

    for (const l of levels) {
      const ids = groups.get(l);
      ids.sort((a, b) => a.localeCompare(b));
      let y = startY;
      for (const id of ids) {
        const n = state.nodes.get(id);
        if (!n) continue;
        n.x = startX + l * colGap;
        n.y = y;
        y += Math.max(rowGap, n.h + 40);
      }
    }
    render();
  }

  function setStatus(msg) {
    if (!statusText) return;
    statusText.textContent = msg || "";
  }

  function setTool(tool) {
    state.tool = tool;
    for (const btn of [toolSelect, toolNode, toolLine]) btn.classList.remove("is-active");
    if (tool === "select") toolSelect.classList.add("is-active");
    if (tool === "node") toolNode.classList.add("is-active");
    if (tool === "line") toolLine.classList.add("is-active");

    state.lineDraft.fromNodeId = null;
    if (tool !== "line" && state.drag?.kind === "line-preview") {
      state.drag = null;
    }
    setStatus(
      tool === "select"
        ? "選取：點區塊/線；拖曳移動；空白拖曳平移"
        : tool === "node"
          ? "步驟：依左側「流程圖形狀」在空白處新增；點既有節點可選取並拖曳"
          : "線：先點起點節點，再點終點節點；雙擊連線可編輯標籤"
    );

    viewport.classList.toggle("cursor-crosshair", tool === "node" || tool === "line");
    viewport.classList.toggle("cursor-grab", tool === "select");
  }

  function worldToScreen(pt) {
    const { panX, panY, zoom } = state.viewport;
    return { x: pt.x * zoom + panX, y: pt.y * zoom + panY };
  }

  function screenToWorld(pt) {
    const { panX, panY, zoom } = state.viewport;
    return { x: (pt.x - panX) / zoom, y: (pt.y - panY) / zoom };
  }

  function getViewportRect() {
    const r = viewport.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function pushHistory() {
    const snapshot = serialize();
    state.history.push(snapshot);
    if (state.history.length > 100) state.history.shift();
    state.future = [];
  }

  function canUndo() {
    return state.history.length > 0;
  }
  function canRedo() {
    return state.future.length > 0;
  }

  function undo() {
    if (!canUndo()) return;
    const curr = serialize();
    const prev = state.history.pop();
    state.future.push(curr);
    load(prev, { pushHistory: false });
    setStatus("已復原");
  }

  function redo() {
    if (!canRedo()) return;
    const curr = serialize();
    const next = state.future.pop();
    state.history.push(curr);
    load(next, { pushHistory: false });
    setStatus("已重做");
  }

  function serialize() {
    const nodes = Array.from(state.nodes.values()).map((n) => ({
      id: n.id,
      text: n.text,
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      shape: n.shape,
      tone: n.tone,
      status: n.status || "none",
      textKind: n.textKind,
      fontSize: n.fontSize,
      textColor: n.textColor,
      bg: n.bg,
    }));
    const edges = Array.from(state.edges.values()).map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      label: e.label || "",
      color: e.color || "default",
      routing: e.routing || "ortho",
    }));
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      viewport: { ...state.viewport },
      nodes,
      edges,
    };
  }

  function load(data, opts = { pushHistory: true }) {
    if (opts.pushHistory) pushHistory();

    state.nodes.clear();
    state.edges.clear();
    state.selection = { kind: "none", id: null };
    state.lineDraft.fromNodeId = null;
    state.editingNodeId = null;

    const viewportData = data.viewport || { panX: 0, panY: 0, zoom: 1 };
    state.viewport.panX = Number(viewportData.panX || 0);
    state.viewport.panY = Number(viewportData.panY || 0);
    state.viewport.zoom = clamp(Number(viewportData.zoom || 1), 0.1, 5);

    for (const n of data.nodes || []) {
      if (!n?.id) continue;
      state.nodes.set(n.id, migrateNodeRecord(n));
    }
    for (const e of data.edges || []) {
      if (!e?.id || !e?.from || !e?.to) continue;
      if (!state.nodes.has(e.from) || !state.nodes.has(e.to)) continue;
      const allowed = new Set(["default", "blue", "green", "orange", "red", "purple", "gray"]);
      const c = allowed.has(e.color) ? e.color : "default";
      const routing = e.routing === "straight" ? "straight" : "ortho";
      state.edges.set(e.id, { id: e.id, from: e.from, to: e.to, label: String(e.label ?? ""), color: c, routing });
    }

    // pick a reasonable selection
    const firstNode = state.nodes.values().next().value;
    if (firstNode) state.selection = { kind: "node", id: firstNode.id };

    render();
  }

  function setSelection(kind, id) {
    state.selection = { kind, id };
    render(); // selection style needs DOM update
  }

  function selectedNode() {
    if (state.selection.kind !== "node") return null;
    return state.nodes.get(state.selection.id) || null;
  }

  function selectedEdge() {
    if (state.selection.kind !== "edge") return null;
    return state.edges.get(state.selection.id) || null;
  }

  function edgeScreenGeometry(edge) {
    const a = state.nodes.get(edge.from);
    const b = state.nodes.get(edge.to);
    if (!a || !b) return null;
    const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const aw = rectBoundaryPoint(ca, cb, a, 8);
    const bw = rectBoundaryPoint(cb, ca, b, 8);
    const p0 = worldToScreen(aw);
    const p3 = worldToScreen(bw);
    const pts = edgePolylinePoints(p0, p3, edge.routing || "ortho");
    return { p0, p3, pts };
  }

  function findEdgeNearScreen(screen, radiusPx = 14) {
    const r2 = radiusPx * radiusPx;
    let best = null;
    let bestD2 = Infinity;
    for (const e of state.edges.values()) {
      const g = edgeScreenGeometry(e);
      if (!g) continue;
      // sample curve into small segments for hit testing
      const steps = 18;
      const pts = g.pts || [g.p0, g.p3];
      let prev = pts[0];
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        // piecewise-linear interpolation along polyline
        const idx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
        const localT = (t * (pts.length - 1)) - idx;
        const a = pts[idx];
        const b = pts[idx + 1];
        const pt = { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT };
        const d2 = dist2PointToSegment(screen, prev, pt);
        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
        prev = pt;
      }
    }
    if (best && bestD2 <= r2) return best;
    return null;
  }

  function hideEdgeLabelEditor({ commit }) {
    const edgeId = state.editingEdgeId;
    if (!edgeId) return;
    const edge = state.edges.get(edgeId);
    const next = edgeLabelEditor.value ?? "";
    state.editingEdgeId = null;
    edgeLabelEditor.style.display = "none";

    if (commit && edge && next.trim() !== (edge.label || "")) {
      pushHistory();
      edge.label = next.trim();
    }
    render();
    setStatus("");
  }

  function showEdgeLabelEditor(edgeId) {
    const edge = state.edges.get(edgeId);
    if (!edge) return;
    const geom = edgeScreenGeometry(edge);
    if (!geom) return;

    const pts = geom.pts || [geom.p0, geom.p3];
    const mid = pts[Math.floor(pts.length / 2)] || pts[0];
    state.editingEdgeId = edgeId;
    edgeLabelEditor.value = edge.label || "";
    edgeLabelEditor.style.display = "block";
    edgeLabelEditor.style.left = `${Math.round(mid.x)}px`;
    edgeLabelEditor.style.top = `${Math.round(mid.y)}px`;
    edgeLabelEditor.style.transform = "translate(-50%, -50%)";
    edgeLabelEditor.focus();
    edgeLabelEditor.select();
    setStatus("線文字：Enter 送出、Esc 取消");
  }

  function computeContentBounds() {
    const nodes = Array.from(state.nodes.values());
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    return { minX, minY, maxX, maxY };
  }

  function fitToContent() {
    const b = computeContentBounds();
    const pad = 80;
    const w = b.maxX - b.minX + pad * 2;
    const h = b.maxY - b.minY + pad * 2;
    const vr = getViewportRect();
    if (w <= 0 || h <= 0 || vr.width <= 0 || vr.height <= 0) return;
    const z = clamp(Math.min(vr.width / w, vr.height / h), 0.1, 2.5);
    state.viewport.zoom = z;
    state.viewport.panX = vr.width / 2 - (b.minX + (b.maxX - b.minX) / 2) * z;
    state.viewport.panY = vr.height / 2 - (b.minY + (b.maxY - b.minY) / 2) * z;
    render();
  }

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const r = viewport.getBoundingClientRect();
    edgeCanvas.style.width = `${r.width}px`;
    edgeCanvas.style.height = `${r.height}px`;
    edgeCanvas.width = Math.max(1, Math.floor(r.width * dpr));
    edgeCanvas.height = Math.max(1, Math.floor(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    hitSvg.setAttribute("width", String(r.width));
    hitSvg.setAttribute("height", String(r.height));
    hitSvg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);

    render();
  }

  function drawDirectedEdge(c, p0, p1, p2, p3, strokeStyle, lineWidth, label) {
    const endPt = cubicBezierPoint(0.992, p0, p1, p2, p3);
    c.strokeStyle = strokeStyle;
    c.lineWidth = lineWidth;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(p0.x, p0.y);
    c.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, endPt.x, endPt.y);
    c.stroke();

    const tan = cubicBezierTangent(0.992, p0, p1, p2, p3);
    const ang = Math.atan2(tan.y, tan.x);
    const tip = endPt;
    const s = 10;
    c.save();
    c.fillStyle = strokeStyle;
    c.translate(tip.x, tip.y);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-s, -s * 0.55);
    c.lineTo(-s, s * 0.55);
    c.closePath();
    c.fill();
    c.restore();

    if (label && label.trim()) {
      const mid = cubicBezierPoint(0.46, p0, p1, p2, p3);
      c.save();
      c.font = "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineJoin = "round";
      c.lineWidth = 5;
      c.strokeStyle = "rgba(255,255,255,0.92)";
      c.strokeText(label.trim(), mid.x, mid.y);
      c.fillStyle = "#0f172a";
      c.fillText(label.trim(), mid.x, mid.y);
      c.restore();
    }
  }

  function drawDirectedEdgeOrtho(c, pts, strokeStyle, lineWidth, label) {
    const points = (pts || []).filter(Boolean);
    if (points.length < 2) return;

    c.strokeStyle = strokeStyle;
    c.lineWidth = lineWidth;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.stroke();

    const tip = points[points.length - 1];
    const prev = points[points.length - 2] || points[0];
    const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    const s = 10;
    c.save();
    c.fillStyle = strokeStyle;
    c.translate(tip.x, tip.y);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-s, -s * 0.55);
    c.lineTo(-s, s * 0.55);
    c.closePath();
    c.fill();
    c.restore();

    if (label && label.trim()) {
      // place label at half of total length
      let total = 0;
      const seg = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        seg.push({ a, b, len });
        total += len;
      }
      let at = total * 0.5;
      let mid = points[0];
      for (const s0 of seg) {
        if (at <= s0.len) {
          const t = s0.len ? at / s0.len : 0;
          mid = { x: s0.a.x + (s0.b.x - s0.a.x) * t, y: s0.a.y + (s0.b.y - s0.a.y) * t };
          break;
        }
        at -= s0.len;
      }

      c.save();
      c.font = "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineJoin = "round";
      c.lineWidth = 5;
      c.strokeStyle = "rgba(255,255,255,0.92)";
      c.strokeText(label.trim(), mid.x, mid.y);
      c.fillStyle = "#0f172a";
      c.fillText(label.trim(), mid.x, mid.y);
      c.restore();
    }
  }

  function drawEdgesCanvas() {
    const r = viewport.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);

    const light = viewport.classList.contains("viewport--flow-light");
    const { panX, panY, zoom } = state.viewport;
    const grid = 24 * zoom;

    if (light) {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, r.width, r.height);
      ctx.save();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const startX = ((panX % grid) + grid) % grid;
      const startY = ((panY % grid) + grid) % grid;
      for (let x = startX; x < r.width; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, r.height);
      }
      for (let y = startY; y < r.height; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(r.width, y);
      }
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const g2 = 60 * zoom;
      const startX = ((panX % g2) + g2) % g2;
      const startY = ((panY % g2) + g2) % g2;
      for (let x = startX; x < r.width; x += g2) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, r.height);
      }
      for (let y = startY; y < r.height; y += g2) {
        ctx.moveTo(0, y);
        ctx.lineTo(r.width, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    for (const e of state.edges.values()) {
      const a = state.nodes.get(e.from);
      const b = state.nodes.get(e.to);
      if (!a || !b) continue;

      const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const aw = rectBoundaryPoint(ca, cb, a, 8);
      const bw = rectBoundaryPoint(cb, ca, b, 8);

      const p0 = worldToScreen(aw);
      const p3 = worldToScreen(bw);
      const pts = edgePolylinePoints(p0, p3, e.routing || "ortho");

      const isSel = state.selection.kind === "edge" && state.selection.id === e.id;
      const css = getComputedStyle(document.body);
      const map = {
        default: css.getPropertyValue("--edge-default").trim() || "rgba(15,23,42,0.55)",
        gray: css.getPropertyValue("--edge-gray").trim() || "rgba(100,116,139,0.7)",
        blue: css.getPropertyValue("--edge-blue").trim() || "#2563eb",
        green: css.getPropertyValue("--edge-green").trim() || "#16a34a",
        orange: css.getPropertyValue("--edge-orange").trim() || "#ea580c",
        red: css.getPropertyValue("--edge-red").trim() || "#dc2626",
        purple: css.getPropertyValue("--edge-purple").trim() || "#7c3aed",
      };
      const baseStroke = map[e.color || "default"] || map.default;
      const stroke = isSel ? "#4f46e5" : light ? baseStroke : "rgba(233,236,241,0.55)";
      const lw = isSel ? 2.5 : 1.8;
      drawDirectedEdgeOrtho(ctx, pts, stroke, lw, e.label);
    }

    if (state.tool === "line" && state.lineDraft.fromNodeId) {
      const from = state.nodes.get(state.lineDraft.fromNodeId);
      if (from && state.drag?.kind === "line-preview") {
        const ax = from.x + from.w / 2;
        const ay = from.y + from.h / 2;
        const p0 = worldToScreen({ x: ax, y: ay });
        const p3 = state.drag.screen;
        const pts = edgePolylinePoints(p0, p3, state.drag.shiftKey ? "straight" : state.edgeRouting);
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = light ? "#059669" : "rgba(16,185,129,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function nodeInnerHtml(n) {
    const badge = `
          <div class="node__badge">
            <span class="chip">雙擊編輯</span>
            <span class="chip">拖曳</span>
          </div>`;
    const statusLabel =
      n.status === "todo" ? "待辦" : n.status === "doing" ? "進行中" : n.status === "done" ? "完成" : "";
    const statusHtml = statusLabel ? `<div class="node__status">${statusLabel}</div>` : "";
    if (n.shape === "diamond") {
      return `
          <div class="node__body node__body--diamond node__body--tone-${n.tone}">
            <div class="node__diamond">
              <div class="node__text" spellcheck="false"></div>
            </div>
            ${statusHtml}
            ${badge}
          </div>`;
    }
    const shapeClass =
      n.shape === "pill"
        ? "pill"
        : n.shape === "parallelogram"
          ? "parallelogram"
          : n.shape === "circle"
            ? "circle"
            : n.shape === "database"
              ? "database"
              : n.shape === "document"
                ? "document"
                : n.shape === "manual-input"
                  ? "manual-input"
                  : n.shape === "preparation"
                    ? "preparation"
                    : n.shape === "text"
                      ? "text"
                      : n.shape === "frame"
                        ? "frame"
                    : "rect";
    return `
          <div class="node__body node__body--${shapeClass} node__body--tone-${n.tone}">
            <div class="node__text" spellcheck="false"></div>
            ${statusHtml}
            ${badge}
          </div>`;
  }

  function renderNodesDom() {
    const existing = new Map();
    for (const el of nodesLayer.querySelectorAll(".node")) {
      existing.set(el.dataset.id, el);
    }

    for (const n of state.nodes.values()) {
      let el = existing.get(n.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "node";
        el.dataset.id = n.id;
        el.innerHTML = nodeInnerHtml(n);
        el.dataset.shape = n.shape;
        el.dataset.tone = n.tone;
        nodesLayer.appendChild(el);
      } else {
        const needRebuild =
          !el.querySelector(".node__body") || el.dataset.shape !== n.shape || el.dataset.tone !== n.tone;
        if (needRebuild) {
          el.innerHTML = nodeInnerHtml(n);
          el.dataset.shape = n.shape;
          el.dataset.tone = n.tone;
        }
      }

      const topLeft = worldToScreen({ x: n.x, y: n.y });
      el.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px) scale(${state.viewport.zoom})`;
      el.style.transformOrigin = "top left";
      el.style.width = `${n.w}px`;
      el.style.height = `${n.h}px`;
      el.style.zIndex = n.shape === "frame" ? "0" : "2";
      el.classList.toggle("is-selected", state.selection.kind === "node" && state.selection.id === n.id);

      const textEl = el.querySelector(".node__text");
      if (!textEl) continue;
      if (state.editingNodeId !== n.id) {
        textEl.textContent = n.text;
      }
      textEl.setAttribute("contenteditable", state.editingNodeId === n.id ? "true" : "false");
      el.dataset.status = n.status || "none";
      el.dataset.shape = n.shape;
      if (n.shape === "text") {
        el.dataset.bg = n.bg || "none";
        textEl.style.fontSize = `${n.fontSize || 14}px`;
        textEl.style.fontWeight = n.textKind === "title" ? "900" : "800";
        textEl.style.color = n.textColor || "#0f172a";
      } else {
        textEl.style.fontSize = "";
        textEl.style.fontWeight = "";
        textEl.style.color = "";
        delete el.dataset.bg;
      }
    }

    for (const [id, el] of existing.entries()) {
      if (!state.nodes.has(id)) el.remove();
    }
  }

  function renderEdgeHitsSvg() {
    while (hitSvg.firstChild) hitSvg.removeChild(hitSvg.firstChild);

    for (const e of state.edges.values()) {
      const a = state.nodes.get(e.from);
      const b = state.nodes.get(e.to);
      if (!a || !b) continue;

      const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const aw = rectBoundaryPoint(ca, cb, a, 8);
      const bw = rectBoundaryPoint(cb, ca, b, 8);

      const p0 = worldToScreen(aw);
      const p3 = worldToScreen(bw);
      const pts = edgePolylinePoints(p0, p3, e.routing || "ortho");
      const d = `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`;

      const hit = svgEl("path", {
        d,
        fill: "none",
        stroke: "rgba(0,0,0,0)",
        "stroke-width": 24,
        "stroke-linecap": "round",
        "pointer-events": "stroke",
      });
      hit.dataset.id = e.id;
      hit.dataset.kind = "edge";

      hitSvg.appendChild(hit);
    }
  }

  function render() {
    drawEdgesCanvas();
    renderEdgeHitsSvg();
    renderNodesDom();

    if (state.editingEdgeId) {
      const edge = state.edges.get(state.editingEdgeId);
      if (!edge) {
        state.editingEdgeId = null;
        edgeLabelEditor.style.display = "none";
      } else {
        const geom = edgeScreenGeometry(edge);
        if (geom?.pts?.length) {
          const pts = geom.pts;
          const mid = pts[Math.floor(pts.length / 2)];
          edgeLabelEditor.style.left = `${Math.round(mid.x)}px`;
          edgeLabelEditor.style.top = `${Math.round(mid.y)}px`;
        }
      }
    }

    renderMinimap();
  }

  const minimapState = {
    enabled: true,
    dragging: false,
    map: { scale: 1, ox: 0, oy: 0, w: 1, h: 1 },
  };

  function renderMinimap() {
    if (!minimapCanvas || !minimapState.enabled) return;
    const c = minimapCanvas;
    const dpr = window.devicePixelRatio || 1;
    const w = minimap.clientWidth || 180;
    const h = minimap.clientHeight || 120;
    c.width = Math.max(1, Math.floor(w * dpr));
    c.height = Math.max(1, Math.floor(h * dpr));
    const ctxm = c.getContext("2d");
    ctxm.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxm.clearRect(0, 0, w, h);

    const bounds = computeContentBounds();
    const pad = 40;
    const bw = bounds.maxX - bounds.minX + pad * 2;
    const bh = bounds.maxY - bounds.minY + pad * 2;
    const scale = Math.min(w / Math.max(1, bw), h / Math.max(1, bh));
    const ox = bounds.minX - pad;
    const oy = bounds.minY - pad;

    minimapState.map = { scale, ox, oy, w, h };

    // background
    ctxm.fillStyle = "rgba(255,255,255,0.85)";
    ctxm.fillRect(0, 0, w, h);

    // edges
    ctxm.strokeStyle = "rgba(15,23,42,0.22)";
    ctxm.lineWidth = 1;
    for (const e of state.edges.values()) {
      const a = state.nodes.get(e.from);
      const b = state.nodes.get(e.to);
      if (!a || !b) continue;
      const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const aw = rectBoundaryPoint(ca, cb, a, 8);
      const bw2 = rectBoundaryPoint(cb, ca, b, 8);
      const p0 = { x: (aw.x - ox) * scale, y: (aw.y - oy) * scale };
      const p3 = { x: (bw2.x - ox) * scale, y: (bw2.y - oy) * scale };
      const pts = edgePolylinePoints(p0, p3, e.routing || "ortho");
      ctxm.beginPath();
      ctxm.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctxm.lineTo(pts[i].x, pts[i].y);
      ctxm.stroke();
    }

    // nodes
    for (const n of state.nodes.values()) {
      const x = (n.x - ox) * scale;
      const y = (n.y - oy) * scale;
      const ww = n.w * scale;
      const hh = n.h * scale;
      ctxm.fillStyle = "rgba(99,102,241,0.22)";
      ctxm.strokeStyle = "rgba(15,23,42,0.35)";
      ctxm.lineWidth = 1;
      ctxm.beginPath();
      if (typeof ctxm.roundRect === "function") {
        ctxm.roundRect(x, y, ww, hh, 3);
      } else {
        // fallback for browsers without CanvasRenderingContext2D.roundRect
        const r = 3;
        ctxm.moveTo(x + r, y);
        ctxm.arcTo(x + ww, y, x + ww, y + hh, r);
        ctxm.arcTo(x + ww, y + hh, x, y + hh, r);
        ctxm.arcTo(x, y + hh, x, y, r);
        ctxm.arcTo(x, y, x + ww, y, r);
        ctxm.closePath();
      }
      ctxm.fill();
      ctxm.stroke();
    }

    // viewport rect
    const vr = getViewportRect();
    const zoom = state.viewport.zoom;
    const leftWorld = (-state.viewport.panX) / zoom;
    const topWorld = (-state.viewport.panY) / zoom;
    const vwWorld = vr.width / zoom;
    const vhWorld = vr.height / zoom;
    ctxm.strokeStyle = "rgba(59,130,246,0.9)";
    ctxm.lineWidth = 2;
    ctxm.strokeRect((leftWorld - ox) * scale, (topWorld - oy) * scale, vwWorld * scale, vhWorld * scale);
  }

  function minimapScreenToWorld(clientX, clientY) {
    const r = minimapCanvas.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    const { scale, ox, oy } = minimapState.map;
    return { x: x / scale + ox, y: y / scale + oy };
  }

  function panToWorldCenter(worldPt) {
    const vr = getViewportRect();
    const z = state.viewport.zoom;
    state.viewport.panX = vr.width / 2 - worldPt.x * z;
    state.viewport.panY = vr.height / 2 - worldPt.y * z;
    render();
  }

  function focusNodeById(id) {
    const n = state.nodes.get(id);
    if (!n) return;
    setSelection("node", id);
    const center = { x: n.x + n.w / 2, y: n.y + n.h / 2 };
    panToWorldCenter(center);
  }

  function beginEditNode(nodeId) {
    const n = state.nodes.get(nodeId);
    if (!n) return;
    state.editingNodeId = nodeId;
    renderNodesDom();
    const el = nodesLayer.querySelector(`.node[data-id="${nodeId}"] .node__text`);
    if (el) {
      el.focus();
      selectAllInElement(el);
    }
    setStatus("編輯中：Enter 送出、Esc 取消");
  }

  function endEditNode({ commit }) {
    const nodeId = state.editingNodeId;
    if (!nodeId) return;
    const n = state.nodes.get(nodeId);
    if (!n) {
      state.editingNodeId = null;
      return;
    }
    const textEl = nodesLayer.querySelector(`.node[data-id="${nodeId}"] .node__text`);
    const before = n.text;
    const after = textEl ? textEl.textContent ?? "" : before;
    state.editingNodeId = null;

    if (commit && after !== before) {
      pushHistory();
      n.text = after;
    } else if (!commit && textEl) {
      textEl.textContent = before;
    }
    render();
  }

  function deleteSelection() {
    if (state.editingNodeId) return;
    const sel = state.selection;
    if (sel.kind === "node") {
      const id = sel.id;
      if (!state.nodes.has(id)) return;
      pushHistory();
      // remove edges attached
      for (const e of Array.from(state.edges.values())) {
        if (e.from === id || e.to === id) state.edges.delete(e.id);
      }
      state.nodes.delete(id);
      state.selection = { kind: "none", id: null };
      render();
      return;
    }
    if (sel.kind === "edge") {
      if (!state.edges.has(sel.id)) return;
      pushHistory();
      state.edges.delete(sel.id);
      state.selection = { kind: "none", id: null };
      render();
    }
  }

  function addNodeAt(worldPt) {
    pushHistory();
    const id = uuid();
    const shape = state.placementShape;
    const tone = state.placementTone;
    const s = defaultSizeForShape(shape);
    const grid = 24;
    const snap = !worldPt?.noSnap;
    const extras = normalizeNodeExtras({ tone }, shape);
    const n = {
      id,
      text: defaultTextForTone(tone),
      x: snap ? snapToGrid(worldPt.x, grid) : worldPt.x,
      y: snap ? snapToGrid(worldPt.y, grid) : worldPt.y,
      w: s.w,
      h: s.h,
      shape,
      tone,
      ...extras,
    };
    state.nodes.set(id, n);
    setSelection("node", id);
    beginEditNode(id);
  }

  function addNodeFromDrop(worldPt, shape, tone) {
    pushHistory();
    const id = uuid();
    const s = defaultSizeForShape(shape);
    const grid = 24;
    const snap = !worldPt?.noSnap;
    const extras = normalizeNodeExtras({ tone }, shape);
    const n = {
      id,
      text: defaultTextForTone(tone),
      x: snap ? snapToGrid(worldPt.x - s.w / 2, grid) : worldPt.x - s.w / 2,
      y: snap ? snapToGrid(worldPt.y - s.h / 2, grid) : worldPt.y - s.h / 2,
      w: s.w,
      h: s.h,
      shape,
      tone,
      ...extras,
    };
    state.nodes.set(id, n);
    state.placementShape = shape;
    state.placementTone = tone;
    syncFlowPresetButtons();
    setSelection("node", id);
    render();
    setStatus("已拖入節點：雙擊可編輯文字");
  }

  function addEdge(fromId, toId, opts = {}) {
    if (fromId === toId) return;
    for (const e of state.edges.values()) {
      if (e.from === fromId && e.to === toId) return;
    }
    pushHistory();
    const id = uuid();
    const routing = opts.routing === "straight" ? "straight" : "ortho";
    state.edges.set(id, { id, from: fromId, to: toId, label: "", color: "default", routing });
    setSelection("edge", id);
  }

  function syncFlowPresetButtons() {
    if (!flowPresets) return;
    for (const btn of flowPresets.querySelectorAll(".flowbtn")) {
      const on = btn.dataset.shape === state.placementShape && btn.dataset.tone === state.placementTone;
      btn.classList.toggle("is-active", on);
    }
  }

  function bindPresetContainer(container) {
    if (!container) return;
    container.addEventListener("dragstart", (e) => {
      const t = e.target.closest(".flowbtn");
      if (!t || !e.dataTransfer) return;
      const payload = JSON.stringify({ shape: t.dataset.shape, tone: t.dataset.tone });
      e.dataTransfer.setData("application/x-flowchart", payload);
      e.dataTransfer.setData("text/plain", payload);
      e.dataTransfer.effectAllowed = "copy";
    });
    container.addEventListener("keydown", (e) => {
      const t = e.target.closest(".flowbtn");
      if (!t) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        t.click();
      }
    });
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".flowbtn");
      if (!btn) return;
      state.placementShape = btn.dataset.shape;
      state.placementTone = btn.dataset.tone;
      syncFlowPresetButtons();
    });
  }

  function pointerPos(e) {
    const r = getViewportRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onViewportPointerDown(e) {
    if (e.button !== 0) return;
    viewport.focus();

    if (state.editingNodeId) {
      // click outside commits by default
      const inEditing = e.target.closest?.(`.node[data-id="${state.editingNodeId}"]`);
      if (!inEditing) endEditNode({ commit: true });
    }

    const targetNode = e.target.closest?.(".node");
    const targetEdge = e.target.dataset?.kind === "edge" ? e.target : null;

    const screen = pointerPos(e);
    const world = screenToWorld(screen);

    // node always wins
    if (targetNode) {
      const id = targetNode.dataset.id;
      if (state.tool === "line") {
        const n = state.nodes.get(id);
        if (n && (n.shape === "text" || n.shape === "frame")) return;
        // line tool: first click picks from, second click completes
        if (!state.lineDraft.fromNodeId) {
          state.lineDraft.fromNodeId = id;
          state.drag = { kind: "line-preview", screen, shiftKey: e.shiftKey };
          setStatus("線：選擇終點區塊");
          render();
        } else {
          addEdge(state.lineDraft.fromNodeId, id, { routing: e.shiftKey ? "straight" : state.edgeRouting });
          state.lineDraft.fromNodeId = null;
          state.drag = null;
          setStatus("線：完成");
          render();
        }
        return;
      }

      setSelection("node", id);

      // 選取與「區塊」工具：先 pending，超過拖曳門檻才真的拖曳，避免吃掉雙擊（無法進入編輯）
      // Alt+拖曳：複製節點
      if (state.tool === "select" || state.tool === "node") {
        const n = state.nodes.get(id);
        if (!n) return;
        state.drag = {
          kind: "pending-drag-node",
          id,
          startScreen: { ...screen },
          startWorld: world,
          startNode: { x: n.x, y: n.y },
          altKey: e.altKey,
          pointerId: e.pointerId,
        };
        return;
      }

      return;
    }

    // edge selection (only if no node)
    if (targetEdge && state.tool === "select") {
      setSelection("edge", targetEdge.dataset.id);
      return;
    }

    // empty space
    if (state.tool === "node") {
      // Shift: disable snap
      addNodeAt({ ...world, noSnap: e.shiftKey });
      return;
    }

    if (state.tool === "line") {
      // reset line draft if click empty
      state.lineDraft.fromNodeId = null;
      state.drag = null;
      setStatus("線：先點起點區塊，再點終點區塊");
      render();
      return;
    }

    // select tool: start panning
    setSelection("none", null);
    state.drag = {
      kind: "pan",
      startScreen: screen,
      startPan: { ...state.viewport },
      moved: false,
      pointerId: e.pointerId,
    };
    viewport.classList.add("cursor-grabbing");
    e.preventDefault();
    try {
      if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  function onViewportPointerMove(e) {
    const screen = pointerPos(e);
    if (state.tool === "line" && state.lineDraft.fromNodeId && state.drag?.kind === "line-preview") {
      state.drag.screen = screen;
      state.drag.shiftKey = e.shiftKey;
      drawEdgesCanvas();
      return;
    }

    if (!state.drag) return;
    const world = screenToWorld(screen);

    if (state.drag.kind === "pending-drag-node") {
      const dx = screen.x - state.drag.startScreen.x;
      const dy = screen.y - state.drag.startScreen.y;
      if (dx * dx + dy * dy <= 25) return;
      const pending = state.drag;
      const n = state.nodes.get(pending.id);
      if (!n) {
        state.drag = null;
        return;
      }

      // Alt+drag duplicates the node at drag start
      if (pending.altKey) {
        pushHistory();
        const id = uuid();
        const copy = { ...n, id };
        state.nodes.set(id, copy);
        setSelection("node", id);
        pending.id = id;
      }

      state.drag = {
        kind: "drag-node",
        id: pending.id,
        startWorld: pending.startWorld,
        startNode: { x: state.nodes.get(pending.id).x, y: state.nodes.get(pending.id).y },
        moved: false,
        pointerId: pending.pointerId,
      };
      viewport.classList.add("cursor-grabbing");
      try {
        if (viewport.setPointerCapture && pending.pointerId != null) {
          viewport.setPointerCapture(pending.pointerId);
        }
      } catch (_) {
        /* ignore */
      }
      n.x = state.drag.startNode.x + (world.x - state.drag.startWorld.x);
      n.y = state.drag.startNode.y + (world.y - state.drag.startWorld.y);
      const mx = n.x - state.drag.startNode.x;
      const my = n.y - state.drag.startNode.y;
      if (mx * mx + my * my > 0.25) state.drag.moved = true;
      render();
      return;
    }

    if (state.drag.kind === "drag-node") {
      const n = state.nodes.get(state.drag.id);
      if (!n) return;
      const nx = state.drag.startNode.x + (world.x - state.drag.startWorld.x);
      const ny = state.drag.startNode.y + (world.y - state.drag.startWorld.y);
      const grid = 24;
      const snap = !e.shiftKey;
      n.x = snap ? snapToGrid(nx, grid) : nx;
      n.y = snap ? snapToGrid(ny, grid) : ny;
      const dx = n.x - state.drag.startNode.x;
      const dy = n.y - state.drag.startNode.y;
      if (dx * dx + dy * dy > 0.25) state.drag.moved = true;
      render();
      return;
    }

    if (state.drag.kind === "pan") {
      const dx = screen.x - state.drag.startScreen.x;
      const dy = screen.y - state.drag.startScreen.y;
      state.viewport.panX = state.drag.startPan.panX + dx;
      state.viewport.panY = state.drag.startPan.panY + dy;
      if (dx * dx + dy * dy > 0.25) state.drag.moved = true;
      render();
    }
  }

  function onViewportPointerUp(e) {
    const pid = e?.pointerId;
    if (pid != null && viewport.hasPointerCapture?.(pid)) {
      try {
        viewport.releasePointerCapture(pid);
      } catch (_) {
        /* ignore */
      }
    }
    if ((state.drag?.kind === "drag-node" || state.drag?.kind === "pan") && state.drag.moved) {
      pushHistory();
    }
    if (state.drag?.kind === "line-preview") {
      return;
    }
    state.drag = null;
    viewport.classList.remove("cursor-grabbing");
    setTool(state.tool);
  }

  function onWheel(e) {
    // zoom about cursor
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 0.92;
    const before = state.viewport.zoom;
    const after = clamp(before * factor, 0.15, 4);
    if (after === before) return;

    const screen = pointerPos(e);
    const worldBefore = screenToWorld(screen); // computed with current zoom/pan
    state.viewport.zoom = after;
    // Keep the same world point under the cursor after zoom:
    // screen = worldBefore * after + panAfter  => panAfter = screen - worldBefore * after
    state.viewport.panX = screen.x - worldBefore.x * after;
    state.viewport.panY = screen.y - worldBefore.y * after;

    render();
  }

  function onDblClick(e) {
    const edgePath = e.target.closest?.('path[data-kind="edge"]');
    if (edgePath) {
      e.preventDefault();
      e.stopPropagation();
      setSelection("edge", edgePath.dataset.id);
      // double click: cycle edge color; Enter edits label
      const edge = state.edges.get(edgePath.dataset.id);
      if (edge) {
        pushHistory();
        const order = ["default", "blue", "green", "orange", "red", "purple", "gray"];
        const idx = Math.max(0, order.indexOf(edge.color || "default"));
        edge.color = order[(idx + 1) % order.length];
        render();
      }
      return;
    }

    // Fallback: double click on canvas near a line (more forgiving than hit paths)
    const screen = pointerPos(e);
    const near = findEdgeNearScreen(screen, 16);
    if (near) {
      e.preventDefault();
      setSelection("edge", near.id);
      const edge = state.edges.get(near.id);
      if (edge) {
      pushHistory();
        const order = ["default", "blue", "green", "orange", "red", "purple", "gray"];
        const idx = Math.max(0, order.indexOf(edge.color || "default"));
        edge.color = order[(idx + 1) % order.length];
      render();
      }
      return;
    }

    const nodeEl = e.target.closest?.(".node");
    if (!nodeEl) return;
    const id = nodeEl.dataset.id;
    setSelection("node", id);
    // double click: cycle node tone; Enter edits text
    const n = state.nodes.get(id);
    if (n) {
      pushHistory();
      const order = ["process", "decision", "io", "subprocess", "terminal"];
      const idx = Math.max(0, order.indexOf(n.tone || "process"));
      n.tone = order[(idx + 1) % order.length];
      render();
    }
    e.preventDefault();
  }

  function bindNodeTextEditing() {
    nodesLayer.addEventListener("keydown", (e) => {
      const textEl = e.target.closest?.(".node__text");
      if (!textEl) return;
      if (!state.editingNodeId) return;

      if (e.key === "Enter") {
        e.preventDefault();
        endEditNode({ commit: true });
      } else if (e.key === "Escape") {
        e.preventDefault();
        endEditNode({ commit: false });
      }
      e.stopPropagation();
    });

    nodesLayer.addEventListener("blur", (e) => {
      const textEl = e.target.closest?.(".node__text");
      if (!textEl) return;
      if (!state.editingNodeId) return;
      // commit on blur
      endEditNode({ commit: true });
    }, true);
  }

  function exportJsonNow() {
    const data = serialize();
    // one-line JSON (方便貼到一行/上傳/比較)
    downloadText(`mindmap-${Date.now()}.json`, JSON.stringify(data));
    setStatus("已導出 JSON");
  }

  function exportSvgNow() {
    const data = serialize();
    const bounds = computeContentBounds();
    const pad = 120;
    const w = Math.max(1, Math.ceil(bounds.maxX - bounds.minX + pad * 2));
    const h = Math.max(1, Math.ceil(bounds.maxY - bounds.minY + pad * 2));
    const ox = bounds.minX - pad;
    const oy = bounds.minY - pad;

    const css = getComputedStyle(document.body);
    const edgeColors = {
      default: css.getPropertyValue("--edge-default").trim() || "rgba(15,23,42,0.55)",
      gray: css.getPropertyValue("--edge-gray").trim() || "rgba(100,116,139,0.7)",
      blue: css.getPropertyValue("--edge-blue").trim() || "#2563eb",
      green: css.getPropertyValue("--edge-green").trim() || "#16a34a",
      orange: css.getPropertyValue("--edge-orange").trim() || "#ea580c",
      red: css.getPropertyValue("--edge-red").trim() || "#dc2626",
      purple: css.getPropertyValue("--edge-purple").trim() || "#7c3aed",
    };

    const tones = {
      terminal: {
        bg: css.getPropertyValue("--tone-terminal-bg").trim() || "#111827",
        border: css.getPropertyValue("--tone-terminal-border").trim() || "#020617",
        text: css.getPropertyValue("--tone-terminal-text").trim() || "#f8fafc",
      },
      process: {
        bg: css.getPropertyValue("--tone-process-bg").trim() || "#22c55e",
        border: css.getPropertyValue("--tone-process-border").trim() || "#15803d",
        text: css.getPropertyValue("--tone-process-text").trim() || "#f0fdf4",
      },
      decision: {
        bg: css.getPropertyValue("--tone-decision-bg").trim() || "#3b82f6",
        border: css.getPropertyValue("--tone-decision-border").trim() || "#1d4ed8",
        text: css.getPropertyValue("--tone-decision-text").trim() || "#eff6ff",
      },
      io: {
        bg: css.getPropertyValue("--tone-io-bg").trim() || "#fb923c",
        border: css.getPropertyValue("--tone-io-border").trim() || "#c2410c",
        text: css.getPropertyValue("--tone-io-text").trim() || "#fff7ed",
      },
      subprocess: {
        bg: css.getPropertyValue("--tone-subprocess-bg").trim() || "#ffffff",
        border: css.getPropertyValue("--tone-subprocess-border").trim() || "#64748b",
        text: css.getPropertyValue("--tone-subprocess-text").trim() || "#0f172a",
      },
    };

    function esc(s) {
      return String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    const parts = [];
    parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    );
    parts.push(`<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path>
  </marker>
</defs>`);
    parts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`);

    // edges
    for (const e of data.edges || []) {
      const a = (data.nodes || []).find((n) => n.id === e.from);
      const b = (data.nodes || []).find((n) => n.id === e.to);
      if (!a || !b) continue;
      const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const aw = rectBoundaryPoint(ca, cb, a, 8);
      const bw2 = rectBoundaryPoint(cb, ca, b, 8);
      const p0 = { x: aw.x - ox, y: aw.y - oy };
      const p3 = { x: bw2.x - ox, y: bw2.y - oy };
      const pts = edgePolylinePoints(p0, p3, e.routing || "ortho");
      const d = `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
      const stroke = edgeColors[e.color || "default"] || edgeColors.default;
      parts.push(
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)" />`
      );
      if (e.label && String(e.label).trim()) {
        const mid = pts[Math.floor(pts.length / 2)] || pts[0];
        parts.push(
          `<text x="${mid.x}" y="${mid.y - 6}" text-anchor="middle" font-family="ui-sans-serif, system-ui, Segoe UI, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${esc(e.label)}</text>`
        );
      }
    }

    // nodes
    for (const n of data.nodes || []) {
      const t = tones[n.tone] || tones.process;
      const x = n.x - ox;
      const y = n.y - oy;
      const w0 = n.w;
      const h0 = n.h;
      const stroke = t.border;
      const fill = t.bg;

      if (n.shape === "pill") {
        parts.push(
          `<rect x="${x}" y="${y}" width="${w0}" height="${h0}" rx="${h0 / 2}" ry="${h0 / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
        );
      } else if (n.shape === "text") {
        // no shape
      } else if (n.shape === "diamond") {
        const cx = x + w0 / 2;
        const cy = y + h0 / 2;
        const pts = [
          `${cx} ${y}`,
          `${x + w0} ${cy}`,
          `${cx} ${y + h0}`,
          `${x} ${cy}`,
        ].join(" ");
        parts.push(`<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);
      } else if (n.shape === "parallelogram") {
        const k = Math.min(24, w0 * 0.18);
        const pts = [
          `${x + k} ${y}`,
          `${x + w0} ${y}`,
          `${x + w0 - k} ${y + h0}`,
          `${x} ${y + h0}`,
        ].join(" ");
        parts.push(`<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);
      } else if (n.shape === "circle") {
        parts.push(
          `<ellipse cx="${x + w0 / 2}" cy="${y + h0 / 2}" rx="${w0 / 2}" ry="${h0 / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
        );
      } else {
        parts.push(
          `<rect x="${x}" y="${y}" width="${w0}" height="${h0}" rx="8" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
        );
      }

      const tx = x + w0 / 2;
      const ty = y + h0 / 2 + 5;
      parts.push(
        `<text x="${tx}" y="${ty}" text-anchor="middle" font-family="ui-sans-serif, system-ui, Segoe UI, sans-serif" font-size="14" font-weight="800" fill="${t.text}">${esc(n.text)}</text>`
      );
    }

    parts.push(`</svg>`);
    const svg = parts.join("\n");
    downloadText(`scc-${Date.now()}.svg`, svg);
  }

  function importJsonNow(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        load(data, { pushHistory: true });
        syncFlowPresetButtons();
        setStatus("已導入 JSON");
      } catch {
        setStatus("導入失敗：不是有效的 JSON");
      }
    };
    reader.readAsText(file);
  }

  async function exportPngNow() {
    const scale = Number(pngScale.value || "2");
    const bg = pngBg.value || "white";

    const bounds = computeContentBounds();
    const pad = 120;
    const wWorld = bounds.maxX - bounds.minX + pad * 2;
    const hWorld = bounds.maxY - bounds.minY + pad * 2;
    if (wWorld <= 0 || hWorld <= 0) return;

    // choose output size in pixels at 1 zoom
    const z = 1; // render in world space
    const outW = Math.ceil(wWorld * z * scale);
    const outH = Math.ceil(hWorld * z * scale);

    // offscreen canvas for edges + background
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const octx = out.getContext("2d", { alpha: bg === "transparent" });
    octx.setTransform(scale, 0, 0, scale, 0, 0);
    octx.clearRect(0, 0, outW / scale, outH / scale);

    if (bg !== "transparent") {
      octx.fillStyle = bg === "white" ? "#f1f5f9" : "#ffffff";
      octx.fillRect(0, 0, outW / scale, outH / scale);
    }

    const ox = bounds.minX - pad;
    const oy = bounds.minY - pad;

    for (const e of state.edges.values()) {
      const a = state.nodes.get(e.from);
      const b = state.nodes.get(e.to);
      if (!a || !b) continue;

      const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      // match on-screen behavior: connect to node boundary and slightly extend outward
      const aw = rectBoundaryPoint(ca, cb, a, 8);
      const bw = rectBoundaryPoint(cb, ca, b, 8);

      const p0 = { x: aw.x - ox, y: aw.y - oy };
      const p3 = { x: bw.x - ox, y: bw.y - oy };
      const { p1, p2 } = edgeControls(p0, p3);
      const css = getComputedStyle(document.body);
      const map = {
        default: css.getPropertyValue("--edge-default").trim() || "rgba(15,23,42,0.55)",
        gray: css.getPropertyValue("--edge-gray").trim() || "rgba(100,116,139,0.7)",
        blue: css.getPropertyValue("--edge-blue").trim() || "#2563eb",
        green: css.getPropertyValue("--edge-green").trim() || "#16a34a",
        orange: css.getPropertyValue("--edge-orange").trim() || "#ea580c",
        red: css.getPropertyValue("--edge-red").trim() || "#dc2626",
        purple: css.getPropertyValue("--edge-purple").trim() || "#7c3aed",
      };
      const stroke = map[e.color || "default"] || map.default;
      drawDirectedEdge(octx, p0, p1, p2, p3, stroke, 1.8, e.label);
    }

    function cssVar(name, fallback) {
      const v = getComputedStyle(document.body).getPropertyValue(name).trim();
      return v || fallback;
    }
    const toneVars = {
      terminal: {
        fill: cssVar("--tone-terminal-bg", "#111827"),
        stroke: cssVar("--tone-terminal-border", "#020617"),
        text: cssVar("--tone-terminal-text", "#f8fafc"),
      },
      process: {
        fill: cssVar("--tone-process-bg", "#22c55e"),
        stroke: cssVar("--tone-process-border", "#15803d"),
        text: cssVar("--tone-process-text", "#f0fdf4"),
      },
      decision: {
        fill: cssVar("--tone-decision-bg", "#3b82f6"),
        stroke: cssVar("--tone-decision-border", "#1d4ed8"),
        text: cssVar("--tone-decision-text", "#eff6ff"),
      },
      io: {
        fill: cssVar("--tone-io-bg", "#fb923c"),
        stroke: cssVar("--tone-io-border", "#c2410c"),
        text: cssVar("--tone-io-text", "#fff7ed"),
      },
      subprocess: {
        fill: cssVar("--tone-subprocess-bg", "#ffffff"),
        stroke: cssVar("--tone-subprocess-border", "#64748b"),
        text: cssVar("--tone-subprocess-text", "#0f172a"),
      },
    };

    function toneStyle(n) {
      return toneVars[n.tone] || { fill: "#ffffff", stroke: "rgba(15,23,42,0.35)", text: "#0f172a" };
    }

    function roundRectPath(c, x, y, w, h, r) {
      const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
      c.beginPath();
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    }

    function wrapLines(c, text, maxWidth) {
      const raw = String(text || "").replace(/\r/g, "");
      const parts = raw.split("\n");
      const lines = [];
      for (const part of parts) {
        const s = part.trim();
        if (!s) {
          lines.push("");
          continue;
        }
        let cur = "";
        for (const ch of s) {
          const next = cur + ch;
          if (c.measureText(next).width > maxWidth && cur) {
            lines.push(cur);
            cur = ch;
          } else {
            cur = next;
          }
        }
        lines.push(cur);
      }
      return lines;
    }

    function drawNode(c, n) {
      const x = n.x - ox;
      const y = n.y - oy;
      const w = n.w;
      const h = n.h;
      const st = toneStyle(n);

      c.save();
      c.lineWidth = 2;
      c.strokeStyle = st.stroke;
      c.fillStyle = st.fill;

      if (n.shape === "text") {
        // no shape, only text
        c.fillStyle = "#0f172a";
        c.font = "800 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        const maxW = Math.max(20, w - 10);
        const lines = wrapLines(c, n.text, maxW);
        const lineH = 16;
        const totalH = lines.length * lineH;
        let ty = y + h / 2 - totalH / 2 + lineH / 2;
        for (const ln of lines.slice(0, 6)) {
          c.fillText(ln, x + w / 2, ty);
          ty += lineH;
        }
        c.restore();
        return;
      }

      if (n.shape === "pill") {
        roundRectPath(c, x, y, w, h, 999);
        c.fill();
        c.stroke();
      } else if (n.shape === "circle") {
        c.beginPath();
        c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        c.closePath();
        c.fill();
        c.stroke();
      } else if (n.shape === "parallelogram") {
        const skew = 14;
        c.beginPath();
        c.moveTo(x + skew, y);
        c.lineTo(x + w, y);
        c.lineTo(x + w - skew, y + h);
        c.lineTo(x, y + h);
        c.closePath();
        c.fill();
        c.stroke();
      } else if (n.shape === "manual-input") {
        c.beginPath();
        c.moveTo(x + w * 0.12, y);
        c.lineTo(x + w, y);
        c.lineTo(x + w * 0.88, y + h);
        c.lineTo(x, y + h);
        c.closePath();
        c.fill();
        c.stroke();
      } else if (n.shape === "preparation") {
        const k = Math.min(28, w * 0.18);
        c.beginPath();
        c.moveTo(x + k, y);
        c.lineTo(x + w - k, y);
        c.lineTo(x + w, y + h / 2);
        c.lineTo(x + w - k, y + h);
        c.lineTo(x + k, y + h);
        c.lineTo(x, y + h / 2);
        c.closePath();
        c.fill();
        c.stroke();
      } else if (n.shape === "document") {
        roundRectPath(c, x, y, w, h, 8);
        c.fill();
        c.stroke();
        // simple wave hint at bottom
        c.save();
        c.strokeStyle = "rgba(15,23,42,0.22)";
        c.lineWidth = 2;
        c.beginPath();
        const baseY = y + h - 10;
        c.moveTo(x + 10, baseY);
        c.quadraticCurveTo(x + w * 0.35, baseY + 8, x + w * 0.55, baseY);
        c.quadraticCurveTo(x + w * 0.78, baseY - 8, x + w - 10, baseY);
        c.stroke();
        c.restore();
      } else if (n.shape === "database") {
        // cylinder
        const ry = Math.max(8, Math.min(14, h * 0.18));
        c.save();
        c.beginPath();
        c.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
        c.closePath();
        c.fill();
        c.stroke();
        c.beginPath();
        c.moveTo(x, y + ry);
        c.lineTo(x, y + h - ry);
        c.moveTo(x + w, y + ry);
        c.lineTo(x + w, y + h - ry);
        c.stroke();
        c.beginPath();
        c.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, 0, Math.PI);
        c.stroke();
        c.restore();
      } else if (n.shape === "diamond") {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const s = Math.min(w, h) * 0.72;
        const r = 6;
        c.save();
        c.translate(cx, cy);
        c.rotate(Math.PI / 4);
        // rounded square
        roundRectPath(c, -s / 2, -s / 2, s, s, r);
        c.fillStyle = n.tone === "decision" ? st.fill : "#ffffff";
        c.strokeStyle = st.stroke;
        c.fill();
        c.stroke();
        c.restore();
      } else {
        roundRectPath(c, x, y, w, h, 8);
        c.fill();
        c.stroke();

        if (n.tone === "subprocess") {
          c.save();
          c.strokeStyle = "#94a3b8";
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(x + 6, y + 8);
          c.lineTo(x + 6, y + h - 8);
          c.moveTo(x + w - 6, y + 8);
          c.lineTo(x + w - 6, y + h - 8);
          c.stroke();
          c.restore();
        }
      }

      // text
      c.fillStyle = st.text;
      c.font = "750 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      const padX = n.shape === "pill" ? 14 : 10;
      const maxW = Math.max(20, w - padX * 2);
      const lines = wrapLines(c, n.text, maxW);
      const lineH = 16;
      const totalH = lines.length * lineH;
      let ty = y + h / 2 - totalH / 2 + lineH / 2;
      for (const ln of lines.slice(0, 6)) {
        c.fillText(ln, x + w / 2, ty);
        ty += lineH;
      }

      c.restore();
    }

    for (const n of state.nodes.values()) {
      drawNode(octx, n);
    }

    out.toBlob((blob) => {
      if (!blob) return;
      // Include pixel size to make scale differences obvious in file manager
      downloadBlob(`mindmap-${Date.now()}-${scale}x-${outW}x${outH}.png`, blob);
      setStatus("已導出 PNG");
    }, "image/png");
  }

  // Tool buttons
  toolSelect.addEventListener("click", () => setTool("select"));
  toolNode.addEventListener("click", () => setTool("node"));
  toolLine.addEventListener("click", () => setTool("line"));

  function zoomAtScreen(screen, newZoom) {
    const z = clamp(newZoom, 0.15, 4);
    const worldBefore = screenToWorld(screen);
    state.viewport.zoom = z;
    state.viewport.panX = screen.x - worldBefore.x * z;
    state.viewport.panY = screen.y - worldBefore.y * z;
  }

  zoomIn?.addEventListener("click", () => {
    const r = getViewportRect();
    zoomAtScreen({ x: r.width / 2, y: r.height / 2 }, state.viewport.zoom * 1.15);
    render();
  });
  zoomOut?.addEventListener("click", () => {
    const r = getViewportRect();
    zoomAtScreen({ x: r.width / 2, y: r.height / 2 }, state.viewport.zoom / 1.15);
    render();
  });
  zoomReset?.addEventListener("click", () => {
    state.viewport.zoom = 1;
    render();
  });
  zoomFit?.addEventListener("click", () => fitToContent());

  exportJson.addEventListener("click", exportJsonNow);
  importJsonBtn.addEventListener("click", () => importJsonFile.click());
  importJsonFile.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importJsonNow(f);
    e.target.value = "";
  });
  exportPng.addEventListener("click", () => {
    if (state.editingNodeId) endEditNode({ commit: true });
    exportPngNow().catch(() => setStatus("PNG 導出失敗（可能是字型/瀏覽器限制）"));
  });

  exportSvg?.addEventListener("click", () => {
    if (state.editingNodeId) endEditNode({ commit: true });
    if (state.editingEdgeId) hideEdgeLabelEditor({ commit: true });
    exportSvgNow();
  });

  function syncEdgeModeUi() {
    if (!edgeMode) return;
    edgeMode.textContent = state.edgeRouting === "straight" ? "直線" : "折線";
  }

  edgeMode?.addEventListener("click", () => {
    state.edgeRouting = state.edgeRouting === "straight" ? "ortho" : "straight";
    syncEdgeModeUi();
  });

  clearAll?.addEventListener("click", () => {
    if (state.editingNodeId) endEditNode({ commit: true });
    if (state.editingEdgeId) hideEdgeLabelEditor({ commit: true });
    const ok = window.confirm("確定要清除全部內容？（可用 Ctrl/⌘+Z 復原）");
    if (!ok) return;
    pushHistory();
    resetToInitial();
  });

  autoLayoutBtn?.addEventListener("click", () => {
    autoLayoutNow();
  });

  // Pointer interactions
  viewport.addEventListener("pointerdown", onViewportPointerDown);
  viewport.addEventListener("pointermove", onViewportPointerMove);
  window.addEventListener("pointerup", onViewportPointerUp);
  window.addEventListener("pointercancel", onViewportPointerUp);

  viewport.addEventListener("dragover", (e) => {
    if (!hasFlowchartDragData(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    viewport.classList.add("viewport--drop-target");
  });
  viewport.addEventListener("dragleave", (e) => {
    const r = viewport.getBoundingClientRect();
    const { clientX: x, clientY: y } = e;
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
      viewport.classList.remove("viewport--drop-target");
    }
  });
  viewport.addEventListener("drop", (e) => {
    viewport.classList.remove("viewport--drop-target");
    const pack = readFlowDropPayload(e.dataTransfer);
    if (!pack) return;
    e.preventDefault();
    const rect = getViewportRect();
    const world = screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    addNodeFromDrop({ ...world, noSnap: e.shiftKey }, pack.shape, pack.tone);
  });
  window.addEventListener("dragend", () => viewport.classList.remove("viewport--drop-target"));

  viewport.addEventListener("dblclick", onDblClick);
  viewport.addEventListener("wheel", onWheel, { passive: false });

  searchNode?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = (searchNode.value || "").trim().toLowerCase();
    if (!q) return;
    for (const n of state.nodes.values()) {
      const t = String(n.text || "").toLowerCase();
      if (t.includes(q)) {
        focusNodeById(n.id);
        return;
      }
    }
  });

  if (minimapToggle && minimap) {
    const key = "mindmap_minimap_enabled_v1";
    minimapState.enabled = localStorage.getItem(key) !== "0";
    minimap.classList.toggle("minimap--hidden", !minimapState.enabled);
    minimapToggle.textContent = minimapState.enabled ? "小地圖" : "小地圖";

    minimapToggle.addEventListener("click", () => {
      minimapState.enabled = !minimapState.enabled;
      minimap.classList.toggle("minimap--hidden", !minimapState.enabled);
      try {
        localStorage.setItem(key, minimapState.enabled ? "1" : "0");
      } catch {
        // ignore
      }
      render();
    });
  }

  minimapCanvas?.addEventListener("pointerdown", (e) => {
    minimapState.dragging = true;
    minimapCanvas.setPointerCapture?.(e.pointerId);
    const wpt = minimapScreenToWorld(e.clientX, e.clientY);
    panToWorldCenter(wpt);
  });
  minimapCanvas?.addEventListener("pointermove", (e) => {
    if (!minimapState.dragging) return;
    const wpt = minimapScreenToWorld(e.clientX, e.clientY);
    panToWorldCenter(wpt);
  });
  minimapCanvas?.addEventListener("pointerup", (e) => {
    minimapState.dragging = false;
    minimapCanvas.releasePointerCapture?.(e.pointerId);
  });

  // Edge hits selection
  hitSvg.addEventListener("pointerdown", (e) => {
    if (state.tool !== "select") return;
    const path = e.target.closest?.('path[data-kind="edge"]');
    if (!path) return;
    setSelection("edge", path.dataset.id);
    e.stopPropagation();
  });

  // Edge hits editing (more reliable than viewport dblclick)
  hitSvg.addEventListener("dblclick", (e) => {
    const path = e.target.closest?.('path[data-kind="edge"]');
    if (!path) return;
    e.preventDefault();
    e.stopPropagation();
    setSelection("edge", path.dataset.id);
    showEdgeLabelEditor(path.dataset.id);
  });

  edgeLabelEditor.addEventListener("keydown", (e) => {
    if (!state.editingEdgeId) return;
    if (e.key === "Enter") {
      e.preventDefault();
      hideEdgeLabelEditor({ commit: true });
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideEdgeLabelEditor({ commit: false });
    }
    e.stopPropagation();
  });
  edgeLabelEditor.addEventListener(
    "blur",
    () => {
      if (!state.editingEdgeId) return;
      hideEdgeLabelEditor({ commit: true });
    },
    true
  );

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const mod = isMac() ? e.metaKey : e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      if (state.editingNodeId || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (e.key === "Escape") {
      if (state.editingEdgeId) {
        e.preventDefault();
        hideEdgeLabelEditor({ commit: false });
        return;
      }
      if (state.editingNodeId) {
        e.preventDefault();
        endEditNode({ commit: false });
        return;
      }
      if (state.tool === "line" && state.lineDraft.fromNodeId) {
        state.lineDraft.fromNodeId = null;
        state.drag = null;
        setStatus("線：已取消");
        render();
        return;
      }
      setSelection("none", null);
      render();
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (state.editingEdgeId) return;
      if (state.editingNodeId) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      deleteSelection();
      return;
    }
    if (!state.editingNodeId && !isTypingTarget(e.target)) {
      if (e.key.toLowerCase() === "v") setTool("select");
      if (e.key.toLowerCase() === "n") setTool("node");
      if (e.key.toLowerCase() === "l") setTool("line");
    }
    if (e.key === "Enter" && !state.editingNodeId && !isTypingTarget(e.target)) {
      if (state.selection.kind === "node") {
      beginEditNode(state.selection.id);
      } else if (state.selection.kind === "edge") {
        e.preventDefault();
        showEdgeLabelEditor(state.selection.id);
      }
    }

    // Status cycle: S (待辦/進行中/完成/無)
    if (!state.editingNodeId && !state.editingEdgeId && !isTypingTarget(e.target) && e.key.toLowerCase() === "s") {
      const n = selectedNode();
      if (!n) return;
      if (n.shape === "frame") return;
      pushHistory();
      const order = ["none", "todo", "doing", "done"];
      const idx = Math.max(0, order.indexOf(n.status || "none"));
      n.status = order[(idx + 1) % order.length];
      render();
      return;
    }

    // Text node styling shortcuts
    if (!state.editingNodeId && !state.editingEdgeId && !isTypingTarget(e.target)) {
      const n = selectedNode();
      if (n?.shape === "text") {
        if (e.key.toLowerCase() === "t") {
          pushHistory();
          n.textKind = n.textKind === "title" ? "body" : "title";
          n.fontSize = n.textKind === "title" ? 18 : 14;
          render();
          return;
        }
        if (e.key.toLowerCase() === "b") {
          pushHistory();
          n.bg = n.bg === "yellow" ? "none" : "yellow";
          render();
          return;
        }
      }
    }
  });

  bindNodeTextEditing();

  bindPresetContainer(flowPresets);

  // (palette theme switcher removed)

  if (paletteToggle) {
    const palette = paletteToggle.closest(".palette");
    const collapsedKey = "mindmap_palette_collapsed_v1";
    const initCollapsed = localStorage.getItem(collapsedKey) === "1";
    if (palette && initCollapsed) {
      palette.classList.add("is-collapsed");
      paletteToggle.setAttribute("aria-expanded", "false");
      paletteToggle.textContent = "展開";
    }
    paletteToggle.addEventListener("click", () => {
      if (!palette) return;
      const next = !palette.classList.contains("is-collapsed");
      palette.classList.toggle("is-collapsed", next);
      paletteToggle.setAttribute("aria-expanded", next ? "false" : "true");
      paletteToggle.textContent = next ? "展開" : "收合";
      try {
        localStorage.setItem(collapsedKey, next ? "1" : "0");
      } catch {
        // ignore
      }
    });
  }
  if (applyFlowToSelection) {
    applyFlowToSelection.addEventListener("click", () => {
      const n = selectedNode();
      if (!n) {
        setStatus("請先選取節點");
        return;
      }
      pushHistory();
      n.shape = state.placementShape;
      n.tone = state.placementTone;
      const s = defaultSizeForShape(n.shape);
      n.w = s.w;
      n.h = s.h;
      render();
      setStatus("已套用形狀至選取節點");
    });
  }

  // initial
  syncEdgeModeUi();
  syncFlowPresetButtons();
  setTool("select");
  resizeCanvases();
  window.addEventListener("resize", resizeCanvases);
  render();
}

document.addEventListener("DOMContentLoaded", main);

