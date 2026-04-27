/* Flowchart editor (Canvas edges + HTML nodes) */

const SCHEMA_VERSION = 3;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function uuid() {
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function nowIso() {
  return new Date().toISOString();
}

function snapToGrid(v, grid) {
  if (!grid) return v;
  return Math.round(v / grid) * grid;
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
    case "document":
      return { w: 170, h: 72 };
    case "manual-input":
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

function listAnchorCandidates(node) {
  // Order MUST be [top, right, bottom, left]
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const hw = node.w / 2;
  const hh = node.h / 2;

  if (node.shape === "diamond") {
    // Match the on-screen inset diamond (`.node__diamond` is 72% capped at 88px).
    const m = Math.min(node.w, node.h);
    const s = Math.min(88, 0.72 * m);
    // Push anchors slightly outward so connectors land on the visible tips (users expect "pointy corners").
    const r = s / 2;
    const out = 6;
    const ro = Math.min(Math.min(node.w, node.h) / 2, r + out);
    return [
      { x: cx, y: cy - ro, nx: 0, ny: -1 },
      { x: cx + ro, y: cy, nx: 1, ny: 0 },
      { x: cx, y: cy + ro, nx: 0, ny: 1 },
      { x: cx - ro, y: cy, nx: -1, ny: 0 },
    ];
  }

  // Default: rect-like.
  return [
    { x: cx, y: node.y, nx: 0, ny: -1 },
    { x: node.x + node.w, y: cy, nx: 1, ny: 0 },
    { x: cx, y: node.y + node.h, nx: 0, ny: 1 },
    { x: node.x, y: cy, nx: -1, ny: 0 },
  ];
}

function pickAnchorIndexFromClick(node, worldPoint) {
  // Stable selection by quadrant from center.
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = worldPoint.x - cx;
  const dy = worldPoint.y - cy;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 1 : 3;
  return dy >= 0 ? 2 : 0;
}

function nodeAnchorPointForIndex(node, index) {
  const cands = listAnchorCandidates(node);
  if (!cands.length) return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
  const i = clamp(Number(index) || 0, 0, cands.length - 1);
  return { x: cands[i].x, y: cands[i].y };
}

function pixelSnapPoints(pts) {
  return (pts || []).filter(Boolean).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
}

function ensureOrthogonalPoints(pts) {
  const inPts = (pts || []).filter(Boolean);
  if (inPts.length < 2) return inPts;
  const out = [inPts[0]];
  for (let i = 1; i < inPts.length; i++) {
    const prev = out[out.length - 1];
    const next = inPts[i];
    if (prev.x !== next.x && prev.y !== next.y) {
      // Insert a right-angle elbow to prevent diagonal segments.
      out.push({ x: next.x, y: prev.y });
    }
    out.push(next);
  }
  return out;
}

function dedupeConsecutivePoints(pts) {
  const out = [];
  for (const p of pts) {
    const prev = out[out.length - 1];
    if (!prev || p.x !== prev.x || p.y !== prev.y) out.push(p);
  }
  return out;
}

function portNormal(portIndex) {
  const p = Number(portIndex);
  if (p === 0) return { nx: 0, ny: -1 };
  if (p === 1) return { nx: 1, ny: 0 };
  if (p === 2) return { nx: 0, ny: 1 };
  if (p === 3) return { nx: -1, ny: 0 };
  return { nx: 0, ny: 0 };
}

function withPortStub(pt, portIndex, len) {
  const l = Number(len) || 0;
  if (!l) return { x: pt.x, y: pt.y };
  if (portIndex == null || !Number.isFinite(Number(portIndex))) return { x: pt.x, y: pt.y };
  const { nx, ny } = portNormal(portIndex);
  return { x: pt.x + nx * l, y: pt.y + ny * l };
}

/** Manhattan between two stubs on the "down" side (+Y in screen space). 上/下 對稱 = 上端用 y→-y 轉到同一套。 */
function manhattanStubsDownDown(a, b) {
  const eps = 0.5;
  const vClear = 36;
  if (b.y > a.y + eps) {
    const y = Math.max(a.y, b.y);
    return [a, { x: a.x, y }, { x: b.x, y }, b];
  }
  if (b.y < a.y - eps) {
    const yDown = Math.max(a.y, b.y) + vClear;
    return [a, { x: a.x, y: yDown }, { x: b.x, y: yDown }, b];
  }
  if (Math.abs(b.x - a.x) < 0.5) return [a, b];
  const y = Math.max(a.y, b.y);
  return [a, { x: a.x, y }, { x: b.x, y }, b];
}

function flipY(p) {
  return { x: p.x, y: -p.y };
}

/** Port 0=上 / 2=下：幾何上同一思路，僅以 Y 翻轉對應。 */
function manhattanStubsUpUp(a, b) {
  const m = manhattanStubsDownDown(flipY(a), flipY(b));
  return m.map(flipY);
}

/** 底(2) stub → 頂(0) stub。頂→底 為同一函數在 y→-y 下之鏡像。 */
function manhattanBottomStubToTopStub(a, b) {
  if (Math.abs(b.y - a.y) < 0.5) {
    if (Math.abs(b.x - a.x) < 0.5) return [a, b];
    const y = (a.y + b.y) / 2;
    return [a, { x: a.x, y }, { x: b.x, y }, b];
  }
  if (b.y < a.y) {
    if (Math.abs(b.x - a.x) < 0.5) return [a, b];
    const midY = (a.y + b.y) / 2;
    return [a, { x: a.x, y: midY }, { x: b.x, y: midY }, b];
  }
  if (b.y > a.y) {
    if (Math.abs(b.x - a.x) < 0.5) return [a, b];
    return [a, { x: a.x, y: b.y }, b];
  }
  return null;
}

function manhattanByPorts(p0, p3, fromPort, toPort) {
  // p0/p3 are stubbed connector points; route between them using predictable Manhattan paths.
  const fp = Number.isFinite(Number(fromPort)) ? Number(fromPort) : null;
  const tp = Number.isFinite(Number(toPort)) ? Number(toPort) : null;
  if (fp == null || tp == null) return null;

  const a = p0;
  const b = p3;

  if (fp === 0 && tp === 0) {
    return manhattanStubsUpUp(a, b);
  }
  if (fp === 2 && tp === 2) {
    return manhattanStubsDownDown(a, b);
  }
  // Right-to-right / left-to-left
  if (fp === 1 && tp === 1) {
    const x = Math.max(a.x, b.x);
    return [a, { x, y: a.y }, { x, y: b.y }, b];
  }
  if (fp === 3 && tp === 3) {
    const x = Math.min(a.x, b.x);
    return [a, { x, y: a.y }, { x, y: b.y }, b];
  }

  if (fp === 2 && tp === 0) {
    return manhattanBottomStubToTopStub(a, b);
  }
  if (fp === 0 && tp === 2) {
    const m = manhattanBottomStubToTopStub(flipY(a), flipY(b));
    return m.map(flipY);
  }

  // Bottom/top → left/right：先垂直到與目標 stub 同高，再橫向接上（與連線預覽／直覺一致；勿用固定短垂線以免多一折）。
  if (fp === 2 && (tp === 1 || tp === 3)) {
    if (Math.abs(b.x - a.x) < 0.5) return [a, b];
    return [a, { x: a.x, y: b.y }, b];
  }
  if (fp === 0 && (tp === 1 || tp === 3)) {
    if (Math.abs(b.x - a.x) < 0.5) return [a, b];
    return [a, { x: a.x, y: b.y }, b];
  }

  if (fp === 1 && tp === 3) {
    if (b.x < a.x) {
      if (Math.abs(b.y - a.y) < 0.5) return [a, b];
      const midX = (a.x + b.x) / 2;
      return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b];
    }
    if (b.x > a.x) {
      if (Math.abs(b.y - a.y) < 0.5) return [a, b];
      return [a, { x: b.x, y: a.y }, b];
    }
  }
  if (fp === 3 && tp === 1) {
    if (b.x > a.x) {
      if (Math.abs(b.y - a.y) < 0.5) return [a, b];
      const midX = (a.x + b.x) / 2;
      return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b];
    }
    if (b.x < a.x) {
      if (Math.abs(b.y - a.y) < 0.5) return [a, b];
      return [a, { x: b.x, y: a.y }, b];
    }
  }

  return null;
}

function orthoPolylineByFirstAxis(p0, p3, firstAxis) {
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  if (Math.abs(dy) < 0.5 || Math.abs(dx) < 0.5) return [p0, p3];

  if (firstAxis === "h") {
    const sx = Math.sign(dx) || 1;
    const ax = Math.abs(dx);
    const elbow = clamp(Math.max(28, Math.min(160, ax * 0.35)), 28, 160);
    const x1 = p0.x + sx * Math.min(elbow, Math.max(24, ax - 8));
    return [p0, { x: x1, y: p0.y }, { x: x1, y: p3.y }, p3];
  }
  if (firstAxis === "v") {
    const sy = Math.sign(dy) || 1;
    const ay = Math.abs(dy);
    const elbow = clamp(Math.max(28, Math.min(160, ay * 0.35)), 28, 160);
    const y1 = p0.y + sy * Math.min(elbow, Math.max(24, ay - 8));
    return [p0, { x: p0.x, y: y1 }, { x: p3.x, y: y1 }, p3];
  }

  // Default: 2-bend.
  if (Math.abs(dx) >= Math.abs(dy)) {
    const mx = (p0.x + p3.x) / 2;
    return [p0, { x: mx, y: p0.y }, { x: mx, y: p3.y }, p3];
  }
  const my = (p0.y + p3.y) / 2;
  return [p0, { x: p0.x, y: my }, { x: p3.x, y: my }, p3];
}

function edgePolylinePoints(p0, p3, mode, meta = {}) {
  if (mode === "straight") return [p0, p3];

  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const fromPort = meta.fromPort;
  const toPort = meta.toPort;
  const stub = 18;
  const p0o = withPortStub(p0, fromPort, stub);
  const p3o = withPortStub(p3, toPort, stub);

  // 同邊(上-上 / 下-下) 且觸發「迴路」heuristic 時，避開 xFar；下用 U 向下繞、上用 U 向上繞（Y 鏡像）。
  {
    const fp0 = Number(fromPort);
    const tp0 = Number(toPort);
    const vClear = 40;
    if (fp0 === 2 && tp0 === 2 && p3o.y < p0o.y - 0.5) {
      const yDown = Math.max(p0o.y, p3o.y) + vClear;
      const pts0 = [p0, p0o, { x: p0o.x, y: yDown }, { x: p3o.x, y: yDown }, p3o, p3];
      return dedupeConsecutivePoints(pixelSnapPoints(ensureOrthogonalPoints(pts0)));
    }
    if (fp0 === 0 && tp0 === 0 && p3o.y > p0o.y + 0.5) {
      const yUp = Math.min(p0o.y, p3o.y) - vClear;
      const pts0 = [p0, p0o, { x: p0o.x, y: yUp }, { x: p3o.x, y: yUp }, p3o, p3];
      return dedupeConsecutivePoints(pixelSnapPoints(ensureOrthogonalPoints(pts0)));
    }
  }

  // Non-loop, predictable "flowchart" routing between ports (especially top/bottom/left/right).
  const wantLoop0 = Boolean(meta.forceLoop) || p3.y < p0.y - 0.5;
  if (!wantLoop0) {
    const mb = manhattanByPorts(p0o, p3o, fromPort, toPort);
    if (mb) {
      const pts0 = [p0, p0o, ...mb.slice(1, -1), p3o, p3];
      return dedupeConsecutivePoints(pixelSnapPoints(ensureOrthogonalPoints(pts0)));
    }
  }

  const wantLoop = wantLoop0;
  if (wantLoop) {
    const base = Math.max(32, 0.08 * Math.hypot(Math.abs(dx), Math.abs(dy) || 1));
    const hPad = base + Math.max(0, Number(meta.midOffset) || 0);
    // More breathing room for long bottom loop-backs (prevents "too close to nodes" routes).
    const outsidePad = Math.max(110, hPad + 72);
    const wantOuter = Boolean(meta.loopOutside);

    const sideHint = meta.loopSide === "left" ? "left" : meta.loopSide === "right" ? "right" : null;
    const preferRight = sideHint ? sideHint === "right" : Math.abs(dx) < 18 ? true : dx >= 0;
    const xNearR = Math.max(p0.x, p3.x);
    const xNearL = Math.min(p0.x, p3.x);
    const xFar = wantOuter
      ? preferRight
        ? xNearR + outsidePad
        : xNearL - outsidePad
      : preferRight
        ? xNearR + hPad
        : xNearL - hPad;

    // Dogleg for side ports: sideways then straight up/down then into target.
    if (meta.firstAxis === "h") {
      const pts = [p0, p0o, { x: xFar, y: p0o.y }, { x: xFar, y: p3o.y }, p3o, p3];
      return dedupeConsecutivePoints(pixelSnapPoints(ensureOrthogonalPoints(pts)));
    }

    // Dogleg for vertical ports: out a bit first, then sideways to outside lane.
    if (meta.firstAxis === "v") {
      const fp = Number.isFinite(Number(meta.fromPort)) ? Number(meta.fromPort) : null;
      const sy = fp === 0 ? -1 : fp === 2 ? 1 : dy >= 0 ? 1 : -1;
      const vStep = Math.max(28, Math.min(160, Math.abs(dy) * 0.25));
      const y1 = p0o.y + sy * vStep;
      const pts = [p0, p0o, { x: p0o.x, y: y1 }, { x: xFar, y: y1 }, { x: xFar, y: p3o.y }, p3o, p3];
      return dedupeConsecutivePoints(pixelSnapPoints(ensureOrthogonalPoints(pts)));
    }

    // Fallback U-route.
    const yDown = Math.max(p0.y, p3.y) + base;
    const pts = [p0, p0o, { x: p0o.x, y: yDown }, { x: xFar, y: yDown }, { x: xFar, y: p3o.y }, p3o, p3];
    return dedupeConsecutivePoints(pixelSnapPoints(ensureOrthogonalPoints(pts)));
  }

  const mid = orthoPolylineByFirstAxis(p0o, p3o, meta.firstAxis);
  const pts = [p0, p0o, ...mid.slice(1, -1), p3o, p3];
  return dedupeConsecutivePoints(pixelSnapPoints(ensureOrthogonalPoints(pts)));
}

function main() {
  const viewport = document.getElementById("viewport");
  if (!viewport) return;

  const edgeCanvas = document.getElementById("edgeCanvas");
  const nodesLayer = document.getElementById("nodesLayer");
  const hitSvg = document.getElementById("hitSvg");

  const toolSelect = document.getElementById("toolSelect");
  const toolLine = document.getElementById("toolLine");
  const edgeMode = document.getElementById("edgeMode");
  const edgeModeLabel = document.getElementById("edgeModeLabel");
  const exportJson = document.getElementById("exportJson");
  const exportPng = document.getElementById("exportPng");
  const exportSvg = document.getElementById("exportSvg");
  const importJsonBtn = document.getElementById("importJsonBtn");
  const importJsonFile = document.getElementById("importJsonFile");
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const applyFlowToSelection = document.getElementById("applyFlowToSelection");
  const searchNode = document.getElementById("searchNode");
  const pngBg = document.getElementById("pngBg");
  const pngScale = document.getElementById("pngScale");
  const clearAll = document.getElementById("clearAll");
  const flowPresets = document.getElementById("flowPresets");
  const palette = document.querySelector(".palette");
  const paletteToggle = document.getElementById("paletteToggle");
  const minimap = document.getElementById("minimap");
  const minimapCanvas = document.getElementById("minimapCanvas");
  const minimapToggle = document.getElementById("minimapToggle");
  const mmCtx = minimapCanvas ? minimapCanvas.getContext("2d", { alpha: true, desynchronized: true }) : null;

  const ctx = edgeCanvas.getContext("2d", { alpha: true, desynchronized: true });

  const state = {
    tool: "select",
    viewport: { panX: 120, panY: 80, zoom: 1 },
    placementShape: "rect",
    placementTone: "process",
    edgeRouting: "straight",
    nodes: new Map(),
    edges: new Map(),
    selection: { kind: "none", id: null },
    lineDraft: { fromNodeId: null, fromPort: null },
    drag: null,
    guides: null, // { x?: number, y?: number }
  };

  function setStatus(msg) {
    // Status UI removed by request; keep as no-op for future reuse.
    void msg;
  }

  function getViewportRect() {
    const r = viewport.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function worldToScreen(pt) {
    const { panX, panY, zoom } = state.viewport;
    return { x: pt.x * zoom + panX, y: pt.y * zoom + panY };
  }

  function screenToWorld(pt) {
    const { panX, panY, zoom } = state.viewport;
    return { x: (pt.x - panX) / zoom, y: (pt.y - panY) / zoom };
  }

  /**
   * Snap *straight* edges to true horizontal/vertical in world space (stable at any zoom).
   * For top/bottom ↔ top/bottom links, if the link is "mostly vertical", use average X so
   * 流程圖常見的上下連接永遠是鉛直線（節點寬度不同時也一致）。
   */
  function snapStraightLineScreen(aw, bw, p0, p3, fromPort, toPort) {
    if (!aw || !bw) return { p0, p3 };
    const wSnapTight = 12;
    const dwx = bw.x - aw.x;
    const dwy = bw.y - aw.y;
    const fp = Number(fromPort);
    const tp = Number(toPort);
    const vPorts =
      (fp === 0 || fp === 2) && (tp === 0 || tp === 2) && Number.isFinite(fp) && Number.isFinite(tp);
    const hPorts =
      (fp === 1 || fp === 3) && (tp === 1 || tp === 3) && Number.isFinite(fp) && Number.isFinite(tp);

    if (vPorts) {
      const mostlyVertical = Math.abs(dwy) > 4 && Math.abs(dwx) * 1.15 <= Math.abs(dwy);
      const smallHorizontal = Math.abs(dwx) <= 40 && Math.abs(dwy) > Math.abs(dwx);
      if (mostlyVertical || smallHorizontal) {
        const xw = (aw.x + bw.x) / 2;
        return {
          p0: worldToScreen({ x: xw, y: aw.y }),
          p3: worldToScreen({ x: xw, y: bw.y }),
        };
      }
    }
    if (hPorts) {
      const mostlyHorizontal = Math.abs(dwx) > 4 && Math.abs(dwy) * 1.15 <= Math.abs(dwx);
      const smallVertical = Math.abs(dwy) <= 40 && Math.abs(dwx) > Math.abs(dwy);
      if (mostlyHorizontal || smallVertical) {
        const yw = (aw.y + bw.y) / 2;
        return {
          p0: worldToScreen({ x: aw.x, y: yw }),
          p3: worldToScreen({ x: bw.x, y: yw }),
        };
      }
    }

    if (Math.abs(dwx) <= wSnapTight) {
      const xw = (aw.x + bw.x) / 2;
      return {
        p0: worldToScreen({ x: xw, y: aw.y }),
        p3: worldToScreen({ x: xw, y: bw.y }),
      };
    }
    if (Math.abs(dwy) <= wSnapTight) {
      const yw = (aw.y + bw.y) / 2;
    return {
        p0: worldToScreen({ x: aw.x, y: yw }),
        p3: worldToScreen({ x: bw.x, y: yw }),
      };
    }
    return { p0, p3 };
  }

  function pointerPos(e) {
    const r = getViewportRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function resizeCanvases() {
    const r = viewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    edgeCanvas.style.width = `${r.width}px`;
    edgeCanvas.style.height = `${r.height}px`;
    edgeCanvas.width = Math.max(1, Math.floor(r.width * dpr));
    edgeCanvas.height = Math.max(1, Math.floor(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (hitSvg) {
      hitSvg.setAttribute("width", String(r.width));
      hitSvg.setAttribute("height", String(r.height));
      hitSvg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    }
    render();
  }

  function isMinimapOpen() {
    return minimap && !minimap.classList.contains("minimap--hidden");
  }

  function getWorldBoundsForMinimap() {
    const vp = getViewportRect();
    const c0 = screenToWorld({ x: 0, y: 0 });
    const c1 = screenToWorld({ x: vp.width, y: vp.height });
    let minX = Math.min(c0.x, c1.x);
    let minY = Math.min(c0.y, c1.y);
    let maxX = Math.max(c0.x, c1.x);
    let maxY = Math.max(c0.y, c1.y);
    for (const n of state.nodes.values()) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    const pad = 96;
    if (!state.nodes.size && maxX - minX < 1) {
      return { minX: -200, minY: -200, maxX: 1000, maxY: 800 };
    }
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function getMinimapLayout() {
    if (!minimap || !isMinimapOpen()) return null;
    const r = minimap.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    const b = getWorldBoundsForMinimap();
    const bw = b.maxX - b.minX;
    const bh = b.maxY - b.minY;
    if (bw < 1 || bh < 1) return null;
    const scale = Math.min(r.width / bw, r.height / bh);
    const ox = (r.width - bw * scale) / 2;
    const oy = (r.height - bh * scale) / 2;
    return { b, r, scale, ox, oy };
  }

  function worldFromMinimapLocal(mx, my, layout) {
    const { b, scale, ox, oy } = layout;
    return {
      x: b.minX + (mx - ox) / scale,
      y: b.minY + (my - oy) / scale,
    };
  }

  function drawMinimap() {
    if (!minimapCanvas || !mmCtx || !isMinimapOpen()) return;
    const layout = getMinimapLayout();
    if (!layout) return;
    const dpr = window.devicePixelRatio || 1;
    const { b, r, scale, ox, oy } = layout;
    const w = Math.max(1, Math.floor(r.width * dpr));
    const h = Math.max(1, Math.floor(r.height * dpr));
    if (minimapCanvas.width !== w || minimapCanvas.height !== h) {
      minimapCanvas.width = w;
      minimapCanvas.height = h;
    }
    mmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mmCtx.clearRect(0, 0, r.width, r.height);
    mmCtx.fillStyle = "#e8edf4";
    mmCtx.fillRect(0, 0, r.width, r.height);

    function w2m(wx, wy) {
      return { x: (wx - b.minX) * scale + ox, y: (wy - b.minY) * scale + oy };
    }

    for (const n of state.nodes.values()) {
      const p1 = w2m(n.x, n.y);
      const p2 = w2m(n.x + n.w, n.y + n.h);
      const col =
        n.tone === "decision"
          ? "rgba(59,130,246,0.7)"
          : n.tone === "terminal"
            ? "rgba(17,24,39,0.8)"
            : n.tone === "io"
              ? "rgba(251,146,60,0.75)"
              : "rgba(34,197,94,0.55)";
      mmCtx.fillStyle = col;
      mmCtx.fillRect(p1.x, p1.y, Math.max(1, p2.x - p1.x), Math.max(1, p2.y - p1.y));
    }

    for (const e of state.edges.values()) {
      const a = state.nodes.get(e.from);
      const c = state.nodes.get(e.to);
      if (!a || !c) continue;
      const aw = nodeAnchorPointForIndex(a, e.fromPort);
      const bw = nodeAnchorPointForIndex(c, e.toPort);
      const p0 = w2m(aw.x, aw.y);
      const p3 = w2m(bw.x, bw.y);
      mmCtx.strokeStyle = "rgba(15,23,42,0.35)";
      mmCtx.lineWidth = 1;
      mmCtx.beginPath();
      mmCtx.moveTo(p0.x, p0.y);
      mmCtx.lineTo(p3.x, p3.y);
      mmCtx.stroke();
    }

    const vp = getViewportRect();
    const w0 = screenToWorld({ x: 0, y: 0 });
    const w1 = screenToWorld({ x: vp.width, y: vp.height });
    const v1 = w2m(w0.x, w0.y);
    const v2 = w2m(w1.x, w1.y);
    const vx = Math.min(v1.x, v2.x);
    const vy = Math.min(v1.y, v2.y);
    const vw = Math.max(1, Math.abs(v2.x - v1.x));
    const vh = Math.max(1, Math.abs(v2.y - v1.y));
    mmCtx.strokeStyle = "rgba(79,70,229,0.95)";
    mmCtx.lineWidth = 1.5;
    mmCtx.strokeRect(vx, vy, vw, vh);
  }

  function syncMinimapToggleUi() {
    if (!minimapToggle) return;
    const open = isMinimapOpen();
    minimapToggle.setAttribute("aria-expanded", open ? "true" : "false");
    minimapToggle.title = open ? "隱藏小地圖" : "顯示小地圖";
  }

  function nodeInnerHtml(n) {
    if (n.shape === "diamond") {
      return `
        <div class="node__body node__body--diamond node__body--tone-${n.tone}">
          <div class="node__diamond"><div class="node__text" spellcheck="false"></div></div>
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
      </div>`;
  }

  function renderNodes() {
    const existing = new Map();
    for (const el of nodesLayer.querySelectorAll(".node")) existing.set(el.dataset.id, el);

    for (const n of state.nodes.values()) {
      let el = existing.get(n.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "node";
        el.dataset.id = n.id;
        el.innerHTML = nodeInnerHtml(n);
        nodesLayer.appendChild(el);
      } else if (el.dataset.shape !== n.shape || el.dataset.tone !== n.tone) {
        el.innerHTML = nodeInnerHtml(n);
      }
      el.dataset.shape = n.shape;
      el.dataset.tone = n.tone;

      const topLeft = worldToScreen({ x: n.x, y: n.y });
      el.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px) scale(${state.viewport.zoom})`;
      el.style.transformOrigin = "top left";
      el.style.width = `${n.w}px`;
      el.style.height = `${n.h}px`;
      el.style.zIndex = n.shape === "frame" ? "0" : "2";
      el.classList.toggle("is-selected", state.selection.kind === "node" && state.selection.id === n.id);

      const textEl = el.querySelector(".node__text");
      if (textEl) textEl.textContent = n.text;
    }

    for (const [id, el] of existing.entries()) {
      if (!state.nodes.has(id)) el.remove();
    }
  }

  function drawDirectedEdgeOrtho(c, pts, strokeStyle, lineWidth, label) {
    const points = (pts || []).filter(Boolean);
    if (points.length < 2) return;
    c.strokeStyle = strokeStyle;
    c.lineWidth = lineWidth;
    c.lineCap = "round";
    c.lineJoin = "round";
    const tip = points[points.length - 1];
    const prev = points[points.length - 2] || points[0];
    const dx = tip.x - prev.x;
    const dy = tip.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const ang = Math.atan2(dy, dx);
    const s = 10;
    // Pull arrow tip slightly back so it doesn't hide under the target node.
    // Also end the polyline at the same point so we don't leave a tiny segment beyond the arrow.
    // Short last segments (stub into node): cap pullback so the stroke still meets the port.
    const back = Math.max(0, Math.min(10, len - 1, len * 0.45));
    const tipBack = { x: tip.x - ux * back, y: tip.y - uy * back };
    // Round line caps can protrude slightly beyond the last point; stop the stroke a hair earlier
    // to avoid a tiny "tail" showing past the arrow tip.
    const shrink = Math.min(lineWidth * 0.6, Math.max(0, back - 0.5));
    const tipStroke = { x: tipBack.x - ux * shrink, y: tipBack.y - uy * shrink };

    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) c.lineTo(points[i].x, points[i].y);
    c.lineTo(tipStroke.x, tipStroke.y);
    c.stroke();
    c.save();
    c.fillStyle = strokeStyle;
    c.translate(tipBack.x, tipBack.y);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-s, -s * 0.55);
    c.lineTo(-s, s * 0.55);
    c.closePath();
    c.fill();
    c.restore();

    if (label && String(label).trim()) {
      // place label at half of total length
      let total = 0;
      const seg = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const l0 = Math.hypot(b.x - a.x, b.y - a.y);
        seg.push({ a, b, len: l0 });
        total += l0;
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
      c.strokeText(String(label).trim(), mid.x, mid.y);
      c.fillStyle = "#0f172a";
      c.fillText(String(label).trim(), mid.x, mid.y);
      c.restore();
    }
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

  function findEdgeNearScreen(screen, radiusPx = 14) {
    const r2 = radiusPx * radiusPx;
    let best = null;
    let bestD2 = Infinity;
    for (const e of state.edges.values()) {
      const a = state.nodes.get(e.from);
      const b = state.nodes.get(e.to);
      if (!a || !b) continue;
      const aw = nodeAnchorPointForIndex(a, e.fromPort);
      const bw = nodeAnchorPointForIndex(b, e.toPort);
      const p0 = worldToScreen(aw);
      const p3 = worldToScreen(bw);
      const pts = screenPolylineForEdge(e, p0, p3, aw, bw);
      for (let i = 1; i < pts.length; i++) {
        const d2 = dist2PointToSegment(screen, pts[i - 1], pts[i]);
        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
      }
    }
    if (bestD2 <= r2) return best;
    return null;
  }

  function screenPolylineForEdge(e, p0, p3, aw, bw) {
    // In straight mode, snap almost-aligned endpoints to perfect horizontal/vertical
    // so users get true straight lines when nodes are visually aligned.
    if ((e.routing || "ortho") === "straight") {
      const s = snapStraightLineScreen(aw, bw, p0, p3, e.fromPort, e.toPort);
      return [
        { x: Math.round(s.p0.x), y: Math.round(s.p0.y) },
        { x: Math.round(s.p3.x), y: Math.round(s.p3.y) },
      ];
    }

    const lp = e.fromPort === 3 || e.toPort === 3 ? "left" : e.fromPort === 1 || e.toPort === 1 ? "right" : null;
    const firstAxis = e.fromPort === 1 || e.fromPort === 3 ? "h" : e.fromPort === 0 || e.fromPort === 2 ? "v" : null;
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const backward = p3.y < p0.y - 0.5;
    const loopOutside = backward && Math.abs(dx) < 90 && Math.abs(dy) > 140;
    return edgePolylinePoints(p0, p3, e.routing || "ortho", {
      firstAxis,
      loopSide: lp,
      loopOutside,
      fromPort: e.fromPort,
      toPort: e.toPort,
      midOffset: e.midOffset || 0,
    });
  }

  function getDiagramBounds(padExtra = 48) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of state.nodes.values()) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    if (!Number.isFinite(minX)) return null;
    const pad = padExtra;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function toneExportColors(tone) {
    switch (tone) {
      case "terminal":
        return { fill: "#111827", stroke: "#020617", text: "#f8fafc" };
      case "decision":
        return { fill: "#3b82f6", stroke: "#1d4ed8", text: "#eff6ff" };
      case "io":
        return { fill: "#fb923c", stroke: "#c2410c", text: "#fff7ed" };
      case "subprocess":
        return { fill: "#ffffff", stroke: "#64748b", text: "#0f172a" };
      default:
        return { fill: "#22c55e", stroke: "#15803d", text: "#f0fdf4" };
    }
  }

  function withExportViewport(bounds, scale, fn) {
    const saved = { panX: state.viewport.panX, panY: state.viewport.panY, zoom: state.viewport.zoom };
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    state.viewport.zoom = scale;
    state.viewport.panX = -bounds.minX * scale;
    state.viewport.panY = -bounds.minY * scale;
    try {
      fn({ cssW: bw * scale, cssH: bh * scale });
    } finally {
      state.viewport.panX = saved.panX;
      state.viewport.panY = saved.panY;
      state.viewport.zoom = saved.zoom;
      render();
    }
  }

  function drawExportNodeShape(ctx, n, z) {
    const tl = worldToScreen({ x: n.x, y: n.y });
    const w = n.w * z;
    const h = n.h * z;
    const col = toneExportColors(n.tone);
    const lw = Math.max(1.25, 1.8 * Math.min(z, 2));
    ctx.save();
    ctx.strokeStyle = col.stroke;
    ctx.fillStyle = col.fill;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";

    const cx = tl.x + w / 2;

    ctx.beginPath();
    if (n.shape === "diamond") {
      const cy = tl.y + h / 2;
      ctx.moveTo(cx, tl.y);
      ctx.lineTo(tl.x + w, cy);
      ctx.lineTo(cx, tl.y + h);
      ctx.lineTo(tl.x, cy);
      ctx.closePath();
    } else {
      const rx =
        n.shape === "pill" ? Math.min(h / 2, Math.max(18, 0.45 * h)) : Math.max(6, 8 * Math.min(z, 2));
      if (typeof ctx.roundRect === "function") ctx.roundRect(tl.x, tl.y, w, h, rx);
      else ctx.rect(tl.x, tl.y, w, h);
    }
    ctx.fill();
    ctx.stroke();

    const text = String(n.text || "").trim();
    if (text) {
      ctx.fillStyle = col.text;
      ctx.font = `600 ${Math.round(13 * z)}px ui-sans-serif, system-ui, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text.slice(0, 200), cx, tl.y + h / 2, w * 0.88);
    }
    ctx.restore();
  }

  function zoomAtViewportCenter(factor) {
    const vp = getViewportRect();
    const cx = vp.width * 0.5;
    const cy = vp.height * 0.5;
    const worldBefore = screenToWorld({ x: cx, y: cy });
    const before = state.viewport.zoom;
    const after = clamp(before * factor, 0.15, 4);
    if (after === before) return;
    state.viewport.zoom = after;
    state.viewport.panX = cx - worldBefore.x * after;
    state.viewport.panY = cy - worldBefore.y * after;
    render();
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function exportDiagramPng() {
    const bounds = getDiagramBounds(48);
    if (!bounds) return;
    const scale = clamp(Number(pngScale?.value || 2), 1, 4);
    const transparent = pngBg?.value === "transparent";
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    withExportViewport(bounds, scale, ({ cssW, cssH }) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.floor(cssW * dpr));
      c.height = Math.max(1, Math.floor(cssH * dpr));
      const x = c.getContext("2d");
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!transparent) {
        x.fillStyle = "#ffffff";
        x.fillRect(0, 0, cssW, cssH);
      }

      const lw = Math.max(1.5, 1.8 * Math.min(scale, 2));

      for (const e of state.edges.values()) {
        const a = state.nodes.get(e.from);
        const b = state.nodes.get(e.to);
        if (!a || !b) continue;
        const aw = nodeAnchorPointForIndex(a, e.fromPort);
        const bw = nodeAnchorPointForIndex(b, e.toPort);
        const p0 = worldToScreen(aw);
        const p3 = worldToScreen(bw);
        const pts = screenPolylineForEdge(e, p0, p3, aw, bw);
        drawDirectedEdgeOrtho(x, pts, "rgba(15,23,42,0.65)", lw, e.label);
      }

      const sorted = Array.from(state.nodes.values()).sort((a, b) => {
        const fa = a.shape === "frame" ? 0 : 1;
        const fb = b.shape === "frame" ? 0 : 1;
        return fa - fb;
      });
      for (const n of sorted) drawExportNodeShape(x, n, scale);

      c.toBlob((blob) => {
        if (blob) downloadBlob(`flowchart-${Date.now()}.png`, blob);
      }, "image/png");
    });
  }

  function exportDiagramSvg() {
    const bounds = getDiagramBounds(48);
    if (!bounds) return;
    const scale = clamp(Number(pngScale?.value || 2), 1, 4);
    const transparent = pngBg?.value === "transparent";

    withExportViewport(bounds, scale, ({ cssW, cssH }) => {
      const sw = Math.max(1.5, 1.8 * Math.min(scale, 2));
      let body = "";
      if (!transparent) {
        body += `<rect x="0" y="0" width="${cssW}" height="${cssH}" fill="#ffffff"/>`;
      }

      body +=
        '<defs><marker id="flowchart-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0,6 L9,3 z" fill="rgba(15,23,42,0.65)"/></marker></defs>';

      for (const e of state.edges.values()) {
        const a = state.nodes.get(e.from);
        const b = state.nodes.get(e.to);
        if (!a || !b) continue;
        const aw = nodeAnchorPointForIndex(a, e.fromPort);
        const bw = nodeAnchorPointForIndex(b, e.toPort);
        const p0 = worldToScreen(aw);
        const p3 = worldToScreen(bw);
        const pts = screenPolylineForEdge(e, p0, p3, aw, bw);
        if (pts.length < 2) continue;
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
        body += `<path d="${d}" fill="none" stroke="rgba(15,23,42,0.65)" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#flowchart-arrow)"/>`;
      }

      const sorted = Array.from(state.nodes.values()).sort((a, b) => {
        const fa = a.shape === "frame" ? 0 : 1;
        const fb = b.shape === "frame" ? 0 : 1;
        return fa - fb;
      });

      for (const n of sorted) {
        const tl = worldToScreen({ x: n.x, y: n.y });
        const w = n.w * scale;
        const h = n.h * scale;
        const col = toneExportColors(n.tone);
        const cx = tl.x + w / 2;
        if (n.shape === "diamond") {
          body += `<polygon points="${cx},${tl.y} ${tl.x + w},${tl.y + h / 2} ${cx},${tl.y + h} ${tl.x},${tl.y + h / 2}" fill="${col.fill}" stroke="${col.stroke}" stroke-width="${sw}"/>`;
        } else {
          const rx =
            n.shape === "pill" ? Math.min(h / 2, Math.max(18, 0.45 * h)) : Math.max(6, 8 * Math.min(scale, 2));
          body += `<rect x="${tl.x.toFixed(2)}" y="${tl.y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${rx.toFixed(2)}" fill="${col.fill}" stroke="${col.stroke}" stroke-width="${sw}"/>`;
        }
        const t = escapeXml(String(n.text || "").trim());
        if (t) {
          body += `<text x="${cx.toFixed(2)}" y="${(tl.y + h / 2).toFixed(2)}" fill="${col.text}" font-family="ui-sans-serif,system-ui,Segoe UI,sans-serif" font-size="${Math.round(13 * scale)}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${t.slice(0, 500)}</text>`;
        }
      }

      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${cssW}" height="${cssH}" viewBox="0 0 ${cssW} ${cssH}">${body}</svg>`;
      downloadText(`flowchart-${Date.now()}.svg`, svg);
    });
  }

  function drawEdges() {
    const r = viewport.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);

    // grid bg
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, r.width, r.height);
    const { panX, panY, zoom } = state.viewport;
    const grid = 24 * zoom;
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

    // Alignment guides (during dragging)
    if (state.guides && (state.guides.x != null || state.guides.y != null)) {
      ctx.save();
      ctx.strokeStyle = "rgba(79,70,229,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      if (state.guides.x != null) {
      ctx.beginPath();
        ctx.moveTo(state.guides.x, 0);
        ctx.lineTo(state.guides.x, r.height);
        ctx.stroke();
      }
      if (state.guides.y != null) {
        ctx.beginPath();
        ctx.moveTo(0, state.guides.y);
        ctx.lineTo(r.width, state.guides.y);
      ctx.stroke();
      }
      ctx.restore();
    }

    for (const e of state.edges.values()) {
      const a = state.nodes.get(e.from);
      const b = state.nodes.get(e.to);
      if (!a || !b) continue;
      const aw = nodeAnchorPointForIndex(a, e.fromPort);
      const bw = nodeAnchorPointForIndex(b, e.toPort);
      const p0 = worldToScreen(aw);
      const p3 = worldToScreen(bw);
      const pts = screenPolylineForEdge(e, p0, p3, aw, bw);
      const isSel = state.selection.kind === "edge" && state.selection.id === e.id;
      drawDirectedEdgeOrtho(
        ctx,
        pts,
        isSel ? "#4f46e5" : "rgba(15,23,42,0.55)",
        isSel ? 2.5 : 1.8,
        e.label
      );
    }

    if (state.tool === "line" && state.lineDraft.fromNodeId && state.drag?.kind === "line-preview") {
      const from = state.nodes.get(state.lineDraft.fromNodeId);
      if (from) {
        const fp = state.lineDraft.fromPort ?? 0;
        const aw = nodeAnchorPointForIndex(from, fp);
        const p0 = worldToScreen(aw);
        const screen = state.drag.screen;
        const worldAt = screenToWorld(screen);
        let p3 = screen;
        let toPort = null;
        const vr = viewport.getBoundingClientRect();
        const hitEl = document.elementFromPoint(vr.left + screen.x, vr.top + screen.y);
        const hitNode = hitEl?.closest?.(".node");
        const fid = state.lineDraft.fromNodeId;
        if (hitNode?.dataset?.id && hitNode.dataset.id !== fid) {
          const toN = state.nodes.get(hitNode.dataset.id);
          if (toN) {
            toPort = pickAnchorIndexFromClick(toN, worldAt);
            const bw = nodeAnchorPointForIndex(toN, toPort);
            p3 = worldToScreen(bw);
          }
        }
        const firstAxis =
          fp === 1 || fp === 3 ? "h" : fp === 0 || fp === 2 ? "v" : null;
        const dx = p3.x - p0.x;
        const dy = p3.y - p0.y;
        const backward = p3.y < p0.y - 0.5;
        const loopOutside = backward && Math.abs(dx) < 90 && Math.abs(dy) > 140;
        const lp = fp === 3 ? "left" : fp === 1 ? "right" : null;
        const pts = edgePolylinePoints(p0, p3, state.drag.shiftKey ? "straight" : state.edgeRouting, {
          firstAxis,
          loopSide: lp,
          loopOutside,
          fromPort: fp,
          toPort,
        });
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "rgba(16,185,129,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function render() {
    drawEdges();
    renderNodes();
    drawMinimap();
  }

  function setTool(tool) {
    state.tool = tool;
    for (const btn of [toolSelect, toolLine]) btn?.classList.remove("is-active");
    if (tool === "select") toolSelect?.classList.add("is-active");
    if (tool === "line") toolLine?.classList.add("is-active");
    if (tool !== "line") {
      state.lineDraft.fromNodeId = null;
      state.lineDraft.fromPort = null;
      state.drag = null;
    }
    setStatus(
      tool === "select" ? "選取：點區塊/線；拖曳移動；空白拖曳平移" : "線：先點起點節點，再點終點節點"
    );
    render();
  }

  // Quick edit (V + Enter): prompt-based editing for reliability on desktop/mobile.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (state.tool !== "select") return;
    // avoid triggering while doing palette drag etc.
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;

    if (state.selection.kind === "node") {
      const n = state.nodes.get(state.selection.id);
      if (!n) return;
      e.preventDefault();
      const next = window.prompt("編輯文字", n.text || "");
      if (next == null) return;
      n.text = String(next);
      render();
      return;
    }

    if (state.selection.kind === "edge") {
      const ed = state.edges.get(state.selection.id);
      if (!ed) return;
      e.preventDefault();
      const next = window.prompt("編輯線文字", ed.label || "");
      if (next == null) return;
      ed.label = String(next);
      render();
      return;
    }
  });

  toolSelect?.addEventListener("click", () => setTool("select"));
  toolLine?.addEventListener("click", () => setTool("line"));

  function deleteSelection() {
    if (state.selection.kind === "edge") {
      const id = state.selection.id;
      if (id && state.edges.has(id)) {
        state.edges.delete(id);
        state.selection = { kind: "none", id: null };
        render();
      }
      return;
    }
    if (state.selection.kind === "node") {
      const id = state.selection.id;
      if (!id || !state.nodes.has(id)) return;
      state.nodes.delete(id);
      for (const [eid, ed] of state.edges.entries()) {
        if (ed.from === id || ed.to === id) state.edges.delete(eid);
      }
      state.selection = { kind: "none", id: null };
      render();
      return;
    }
  }

  document.addEventListener("keydown", (e) => {
    if (state.tool !== "select") return;
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    e.preventDefault();
    deleteSelection();
  });

  function syncPaletteToggleUi() {
    if (!palette || !paletteToggle) return;
    const collapsed = palette.classList.contains("is-collapsed");
    paletteToggle.textContent = collapsed ? "展開" : "收合";
    paletteToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  paletteToggle?.addEventListener("click", () => {
    if (!palette) return;
    palette.classList.toggle("is-collapsed");
    syncPaletteToggleUi();
  });

  minimapToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!minimap) return;
    minimap.classList.toggle("minimap--hidden");
    syncMinimapToggleUi();
    requestAnimationFrame(() => drawMinimap());
  });

  minimapCanvas?.addEventListener("click", (e) => {
    if (!isMinimapOpen() || e.button !== 0) return;
    e.stopPropagation();
    const layout = getMinimapLayout();
    if (!layout) return;
    const r = minimapCanvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const target = worldFromMinimapLocal(mx, my, layout);
    const vp = getViewportRect();
    const { zoom } = state.viewport;
    state.viewport.panX = vp.width * 0.5 - target.x * zoom;
    state.viewport.panY = vp.height * 0.5 - target.y * zoom;
    render();
  });

  function syncEdgeModeLabel() {
    const t = state.edgeRouting === "straight" ? "直線" : "折線";
    if (edgeModeLabel) edgeModeLabel.textContent = t;
    else if (edgeMode) edgeMode.textContent = t;
  }

  edgeMode?.addEventListener("click", (e) => {
    e.stopPropagation();
    state.edgeRouting = state.edgeRouting === "straight" ? "ortho" : "straight";
    syncEdgeModeLabel();
    render();
  });

  syncEdgeModeLabel();

  function addNodeAt(world, shape, tone, opts = {}) {
    const id = uuid();
    const s = defaultSizeForShape(shape);
    const grid = 24;
    const snap = !opts.noSnap;
    const n = {
      id,
      text: defaultTextForTone(tone),
      x: snap ? snapToGrid(world.x, grid) : world.x,
      y: snap ? snapToGrid(world.y, grid) : world.y,
      w: s.w,
      h: s.h,
      shape,
      tone,
    };
    state.nodes.set(id, n);
    state.selection = { kind: "node", id };
    render();
  }

  function isClientInViewport(clientX, clientY) {
    const r = viewport.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }

  function addNodeFromClientPoint(clientX, clientY, shape, tone, opts = {}) {
    const rect = getViewportRect();
    const world = screenToWorld({ x: clientX - rect.left, y: clientY - rect.top });
    addNodeAt(world, shape, tone, opts);
  }

  function addEdge(fromId, toId, fromPort, toPort, routing) {
    if (fromId === toId) return;
    const id = uuid();
    state.edges.set(id, {
      id,
      from: fromId,
      to: toId,
      fromPort: clamp(Number(fromPort) || 0, 0, 3),
      toPort: clamp(Number(toPort) || 0, 0, 3),
      label: "",
      routing,
      midOffset: 0,
    });
    state.selection = { kind: "edge", id };
    render();
  }

  function serialize() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      viewport: { ...state.viewport },
      nodes: Array.from(state.nodes.values()),
      edges: Array.from(state.edges.values()),
    };
  }

  function load(data) {
    state.nodes.clear();
    state.edges.clear();
    const vp = data?.viewport || {};
    state.viewport.panX = Number(vp.panX || 0);
    state.viewport.panY = Number(vp.panY || 0);
    state.viewport.zoom = clamp(Number(vp.zoom || 1), 0.1, 5);
    for (const n of data?.nodes || []) {
      if (!n?.id) continue;
      const ds = defaultSizeForShape(n.shape || "rect");
      state.nodes.set(n.id, {
        id: n.id,
        text: String(n.text ?? ""),
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
        w: Number(n.w) || ds.w,
        h: Number(n.h) || ds.h,
        shape: n.shape || "rect",
        tone: n.tone || "process",
      });
    }
    for (const e of data?.edges || []) {
      if (!e?.id || !e?.from || !e?.to) continue;
      if (!state.nodes.has(e.from) || !state.nodes.has(e.to)) continue;
      state.edges.set(e.id, {
        id: e.id,
        from: e.from,
        to: e.to,
        fromPort: Number.isFinite(Number(e.fromPort)) ? clamp(Number(e.fromPort), 0, 3) : 0,
        toPort: Number.isFinite(Number(e.toPort)) ? clamp(Number(e.toPort), 0, 3) : 0,
        label: String(e.label ?? ""),
        routing: e.routing === "straight" ? "straight" : "ortho",
        midOffset: Number.isFinite(Number(e.midOffset)) ? clamp(Number(e.midOffset), 0, 200) : 0,
      });
    }
    render();
  }

  exportJson?.addEventListener("click", () => {
    downloadText(`flowchart-${Date.now()}.json`, JSON.stringify(serialize()));
    setStatus("已導出 JSON");
  });
  importJsonBtn?.addEventListener("click", () => importJsonFile?.click());
  importJsonFile?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        load(JSON.parse(String(reader.result || "{}")));
        setStatus("已導入 JSON");
      } catch {
        setStatus("導入失敗：不是有效的 JSON");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  });
  clearAll?.addEventListener("click", () => {
    const ok = window.confirm("確定要清除全部內容？");
    if (!ok) return;
    state.nodes.clear();
    state.edges.clear();
    state.selection = { kind: "none", id: null };
    render();
  });

  zoomIn?.addEventListener("click", () => zoomAtViewportCenter(1.08));
  zoomOut?.addEventListener("click", () => zoomAtViewportCenter(1 / 1.08));

  exportPng?.addEventListener("click", () => exportDiagramPng());
  exportSvg?.addEventListener("click", () => exportDiagramSvg());

  applyFlowToSelection?.addEventListener("click", () => {
    if (state.selection.kind !== "node") return;
    const n = state.nodes.get(state.selection.id);
    if (!n) return;
    const shape = state.placementShape || "rect";
    const tone = state.placementTone || "process";
    const ds = defaultSizeForShape(shape);
    n.shape = shape;
    n.tone = tone;
    n.w = ds.w;
    n.h = ds.h;
    render();
  });

  function focusNodeBySearch(id) {
    const n = state.nodes.get(id);
    if (!n) return;
    state.selection = { kind: "node", id };
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    const vp = getViewportRect();
    const z = state.viewport.zoom;
    state.viewport.panX = vp.width * 0.5 - cx * z;
    state.viewport.panY = vp.height * 0.5 - cy * z;
    render();
  }

  searchNode?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = (searchNode.value || "").trim().toLowerCase();
    if (!q) return;
    for (const n of state.nodes.values()) {
      if (String(n.text || "").toLowerCase().includes(q)) {
        focusNodeBySearch(n.id);
        e.preventDefault();
        return;
      }
    }
  });

  // Seed start node
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

  // Basic interactions
  viewport.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      viewport.focus();
    const screen = pointerPos(e);
    const world = screenToWorld(screen);
      const targetNode = e.target.closest?.(".node");

    if (targetNode) {
      const id = targetNode.dataset.id;
        const n = state.nodes.get(id);
        if (!n) return;

        if (state.tool === "line") {
        if (!state.lineDraft.fromNodeId) {
          state.lineDraft.fromNodeId = id;
            state.lineDraft.fromPort = pickAnchorIndexFromClick(n, world);
            state.drag = { kind: "line-preview", screen, shiftKey: e.shiftKey, pointerId: e.pointerId };
          setStatus("線：選擇終點區塊");
          render();
        } else {
            const toPort = pickAnchorIndexFromClick(n, world);
            addEdge(state.lineDraft.fromNodeId, id, state.lineDraft.fromPort, toPort, e.shiftKey ? "straight" : state.edgeRouting);
          state.lineDraft.fromNodeId = null;
            state.lineDraft.fromPort = null;
          state.drag = null;
          setStatus("線：完成");
          render();
        }
        return;
      }

        state.selection = { kind: "node", id };
        // Only allow node dragging in select tool (V). Other tools should not accidentally drag nodes.
        if (state.tool === "select") {
        state.drag = {
            kind: "drag-node",
          id,
          startWorld: world,
          startNode: { x: n.x, y: n.y },
          pointerId: e.pointerId,
        };
          try {
            viewport.setPointerCapture?.(e.pointerId);
          } catch {}
        } else {
          state.drag = null;
        }
        render();
      return;
    }

    if (state.tool === "line") {
      state.lineDraft.fromNodeId = null;
        state.lineDraft.fromPort = null;
      state.drag = null;
      setStatus("線：先點起點區塊，再點終點區塊");
      render();
      return;
    }

      // Select edges by clicking near them (select tool).
      if (state.tool === "select") {
        const near = findEdgeNearScreen(screen, 14);
        if (near) {
          state.selection = { kind: "edge", id: near.id };
          state.drag = null;
          render();
          return;
        }
      }

      // pan (empty space)
      state.selection = { kind: "none", id: null };
      state.drag = { kind: "pan", startScreen: screen, startPan: { ...state.viewport }, pointerId: e.pointerId };
      try {
        viewport.setPointerCapture?.(e.pointerId);
      } catch {}
    },
    { passive: false }
  );

  viewport.addEventListener(
    "pointermove",
    (e) => {
      if (state.drag?.pointerId != null && e.pointerId !== state.drag.pointerId) return;
    const screen = pointerPos(e);
    if (state.tool === "line" && state.lineDraft.fromNodeId && state.drag?.kind === "line-preview") {
      state.drag.screen = screen;
      state.drag.shiftKey = e.shiftKey;
        drawEdges();
      return;
    }
    if (!state.drag) return;
    const world = screenToWorld(screen);
      if (state.drag.kind === "drag-node") {
        const n = state.nodes.get(state.drag.id);
        if (!n) return;
        let nx = state.drag.startNode.x + (world.x - state.drag.startWorld.x);
        let ny = state.drag.startNode.y + (world.y - state.drag.startWorld.y);

        // Shift disables snapping (for fine placement).
        if (!e.shiftKey) {
          // Grid snap is the baseline.
          nx = snapToGrid(nx, 24);
          ny = snapToGrid(ny, 24);
        }

        // Prefer center-to-center alignment first (flowchart columns/rows) — wider window than edge snap.
        const centerSnap = e.shiftKey ? 0 : 24;
        if (centerSnap) {
          const myCx = nx + n.w / 2;
          let bestDcx = centerSnap + 1;
          for (const other of state.nodes.values()) {
            if (other.id === n.id) continue;
            const d = other.x + other.w / 2 - myCx;
            if (Math.abs(d) < Math.abs(bestDcx)) bestDcx = d;
          }
          if (Math.abs(bestDcx) <= centerSnap) nx += bestDcx;

          const myCy = ny + n.h / 2;
          let bestDcy = centerSnap + 1;
          for (const other of state.nodes.values()) {
            if (other.id === n.id) continue;
            const d = other.y + other.h / 2 - myCy;
            if (Math.abs(d) < Math.abs(bestDcy)) bestDcy = d;
          }
          if (Math.abs(bestDcy) <= centerSnap) ny += bestDcy;
        }

        // Extra alignment snap: align to other nodes' left/center/right and top/middle/bottom.
        // This makes it much easier to line things up, reducing "almost aligned" diagonals.
        const snapPx = e.shiftKey ? 0 : 12;
        const candX = [];
        const candY = [];
        for (const other of state.nodes.values()) {
          if (other.id === n.id) continue;
          candX.push(other.x, other.x + other.w / 2, other.x + other.w);
          candY.push(other.y, other.y + other.h / 2, other.y + other.h);
        }
        const myX = [nx, nx + n.w / 2, nx + n.w];
        const myY = [ny, ny + n.h / 2, ny + n.h];
        let guideX = null;
        let guideY = null;

        let bestDx = snapPx + 1;
        let bestNx = nx;
        for (const ax of myX) {
          for (const bx of candX) {
            const d = bx - ax;
            if (Math.abs(d) < Math.abs(bestDx)) {
              bestDx = d;
              bestNx = nx + d;
              guideX = bx;
            }
          }
        }
        if (Math.abs(bestDx) <= snapPx) nx = bestNx;

        let bestDy = snapPx + 1;
        let bestNy = ny;
        for (const ay of myY) {
          for (const by of candY) {
            const d = by - ay;
            if (Math.abs(d) < Math.abs(bestDy)) {
              bestDy = d;
              bestNy = ny + d;
              guideY = by;
            }
          }
        }
        if (Math.abs(bestDy) <= snapPx) ny = bestNy;

        n.x = nx;
        n.y = ny;
        state.guides = e.shiftKey
          ? null
          : {
              x: guideX != null ? worldToScreen({ x: guideX, y: 0 }).x : null,
              y: guideY != null ? worldToScreen({ x: 0, y: guideY }).y : null,
            };
      render();
      return;
    }
    if (state.drag.kind === "pan") {
      const dx = screen.x - state.drag.startScreen.x;
      const dy = screen.y - state.drag.startScreen.y;
      state.viewport.panX = state.drag.startPan.panX + dx;
      state.viewport.panY = state.drag.startPan.panY + dy;
      render();
    }
    },
    { passive: false }
  );

  window.addEventListener(
    "pointerup",
    (e) => {
      if (state.drag?.pointerId != null && e.pointerId !== state.drag.pointerId) return;
      try {
        viewport.releasePointerCapture?.(e.pointerId);
      } catch {}
    if (state.drag?.kind === "line-preview") {
        state.drag = null;
      return;
    }
    state.drag = null;
      state.guides = null;
    },
    { passive: true }
  );

  viewport.addEventListener(
    "wheel",
    (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 0.92;
    const before = state.viewport.zoom;
    const after = clamp(before * factor, 0.15, 4);
    if (after === before) return;
    const screen = pointerPos(e);
      const worldBefore = screenToWorld(screen);
    state.viewport.zoom = after;
    state.viewport.panX = screen.x - worldBefore.x * after;
    state.viewport.panY = screen.y - worldBefore.y * after;
    render();
    },
    { passive: false }
  );

  // palette click to set placement
  flowPresets?.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".flowbtn");
    if (!btn) return;
    state.placementShape = btn.dataset.shape || "rect";
    state.placementTone = btn.dataset.tone || "process";
    for (const b of document.querySelectorAll(".flowbtn")) b.classList.toggle("is-active", b === btn);
  });

  // Desktop drag/drop from palette (HTML5 DnD)
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

  flowPresets?.addEventListener("dragstart", (e) => {
    const t = e.target.closest?.(".flowbtn");
    if (!t || !e.dataTransfer) return;
    const payload = JSON.stringify({ shape: t.dataset.shape, tone: t.dataset.tone });
    e.dataTransfer.setData("application/x-flowchart", payload);
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "copy";
  });

  viewport.addEventListener("dragover", (e) => {
    if (!hasFlowchartDragData(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  viewport.addEventListener("drop", (e) => {
    const pack = readFlowDropPayload(e.dataTransfer);
    if (!pack) return;
    e.preventDefault();
    addNodeFromClientPoint(e.clientX, e.clientY, pack.shape, pack.tone, { noSnap: e.shiftKey });
  });

  // Mobile/touch palette drag (pointer-based)
  const paletteDrag = { active: false, pointerId: null, shape: null, tone: null, ghost: null };
  function ensureDragGhost() {
    if (paletteDrag.ghost) return paletteDrag.ghost;
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    el.style.zIndex = "9999";
    el.style.pointerEvents = "none";
    el.style.padding = "8px 10px";
    el.style.borderRadius = "12px";
    el.style.background = "rgba(15,23,42,0.85)";
    el.style.color = "#fff";
    el.style.font = "800 12px ui-sans-serif, system-ui, Segoe UI, sans-serif";
    el.style.transform = "translate(-9999px, -9999px)";
    document.body.appendChild(el);
    paletteDrag.ghost = el;
    return el;
  }
  function setGhostAt(clientX, clientY, text) {
    const g = ensureDragGhost();
    g.textContent = text || "";
    g.style.transform = `translate(${Math.round(clientX + 12)}px, ${Math.round(clientY + 12)}px)`;
  }
  function endPaletteDrag() {
    paletteDrag.active = false;
    paletteDrag.pointerId = null;
    paletteDrag.shape = null;
    paletteDrag.tone = null;
    if (paletteDrag.ghost) paletteDrag.ghost.style.transform = "translate(-9999px,-9999px)";
  }

  flowPresets?.addEventListener(
    "pointerdown",
    (e) => {
      const btn = e.target.closest?.(".flowbtn");
      if (!btn) return;
      if (e.pointerType === "mouse") return; // mouse uses HTML5 drag
      paletteDrag.active = true;
      paletteDrag.pointerId = e.pointerId;
      paletteDrag.shape = btn.dataset.shape;
      paletteDrag.tone = btn.dataset.tone;
      try {
        flowPresets.setPointerCapture?.(e.pointerId);
      } catch {}
      setGhostAt(e.clientX, e.clientY, (btn.textContent || "").trim() || "新增");
    e.preventDefault();
      setStatus("拖曳到畫布放下新增節點（或點空白新增）");
    },
    { passive: false }
  );
  flowPresets?.addEventListener(
    "pointermove",
    (e) => {
      if (!paletteDrag.active) return;
      if (paletteDrag.pointerId != null && e.pointerId !== paletteDrag.pointerId) return;
      setGhostAt(e.clientX, e.clientY, paletteDrag.shape || "");
      e.preventDefault();
    },
    { passive: false }
  );
  flowPresets?.addEventListener(
    "pointerup",
    (e) => {
      if (!paletteDrag.active) return;
      if (paletteDrag.pointerId != null && e.pointerId !== paletteDrag.pointerId) return;
      const shape = paletteDrag.shape;
      const tone = paletteDrag.tone;
      const inView = shape && tone && isClientInViewport(e.clientX, e.clientY);
      endPaletteDrag();
      if (inView) addNodeFromClientPoint(e.clientX, e.clientY, shape, tone, { noSnap: e.shiftKey });
      e.preventDefault();
    },
    { passive: false }
  );
  flowPresets?.addEventListener(
    "pointercancel",
    (e) => {
      if (!paletteDrag.active) return;
      if (paletteDrag.pointerId != null && e.pointerId !== paletteDrag.pointerId) return;
      endPaletteDrag();
      e.preventDefault();
    },
    { passive: false }
  );

  resizeCanvases();
  window.addEventListener("resize", resizeCanvases);
  syncPaletteToggleUi();
  syncMinimapToggleUi();
  setTool("select");
}

main();
