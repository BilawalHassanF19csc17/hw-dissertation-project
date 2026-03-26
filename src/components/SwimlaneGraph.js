"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export default function SwimlaneGraph({ execution }) {
  const svgRef = useRef(null);
  const [step, setStep] = useState(1);
  const [showHB, setShowHB] = useState(true);

  useEffect(() => {
    setStep(1);
  }, [execution?.id]);

  const maxStep = useMemo(() => {
    const s1 = d3.max(execution.actions, (d) => d.step) ?? 1;
    const s2 = d3.max(execution.edges, (d) => d.step) ?? 1;
    return Math.max(s1, s2);
  }, [execution]);

  useEffect(() => {
    const width = 980;
    const height = 420;
    const margin = { top: 40, right: 40, bottom: 40, left: 160 };

    const laneHeight = 120;
    const nodeSpacing = 220;
    const nodeR = 24;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("width", width)
      .attr("height", height)
      .style("background", "white")
      .style("border", "1px solid #e5e7eb")
      .style("borderRadius", "12px");

    // Arrowheads
    const defs = svg.append("defs");
    const addMarker = (id, color) => {
      defs
        .append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    };
    addMarker("arrow-po", "#111827");
    addMarker("arrow-rf", "#2563eb");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const threadIndex = new Map(execution.threads.map((t, i) => [t.id, i]));
    const nodeX = (a) => a.index * nodeSpacing + 80;
    const nodeY = (a) => (threadIndex.get(a.thread) ?? 0) * laneHeight;

    const visibleActions = execution.actions.filter((a) => a.step <= step);
    const visibleActionIds = new Set(visibleActions.map((a) => a.id));

    let visibleEdges = execution.edges.filter(
      (e) =>
        e.step <= step &&
        visibleActionIds.has(e.from) &&
        visibleActionIds.has(e.to)
    );

    if (!showHB) {
      visibleEdges = visibleEdges.filter((e) => e.type !== "hb");
    }

    // Lanes
    const lanes = g
      .selectAll(".lane")
      .data(execution.threads, (d) => d.id)
      .join("g")
      .attr("class", "lane")
      .attr(
        "transform",
        (d) => `translate(0, ${(threadIndex.get(d.id) ?? 0) * laneHeight})`
      );

    lanes
      .append("line")
      .attr("x1", 0)
      .attr("x2", width - margin.left - margin.right)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 2);

    lanes
      .append("text")
      .attr("x", -20)
      .attr("y", 5)
      .attr("text-anchor", "end")
      .attr("font-size", 14)
      .attr("fill", "#111827")
      .style("font-weight", 600)
      .text((d) => d.name);

    // Edges
    const actionById = new Map(execution.actions.map((a) => [a.id, a]));

    function edgePath(e) {
      const from = actionById.get(e.from);
      const to = actionById.get(e.to);
      if (!from || !to) return "";

      const x1 = nodeX(from);
      const y1 = nodeY(from);
      const x2 = nodeX(to);
      const y2 = nodeY(to);

      if (e.type === "po" || e.type === "hb") {
        return `M${x1 + nodeR} ${y1} L${x2 - nodeR} ${y2}`;
      }

      // rf curve
      const midX = (x1 + x2) / 2;
      return `M${x1} ${y1 + nodeR} C${midX} ${y1 + 80}, ${midX} ${y2 - 80}, ${x2} ${y2 - nodeR}`;
    }

    g.selectAll(".edge")
      .data(visibleEdges, (d) => d.id)
      .join("path")
      .attr("class", "edge")
      .attr("d", edgePath)
      .attr("fill", "none")
      .attr("stroke-width", (d) => (d.type === "rf" ? 2.5 : 2))
      .attr("stroke", (d) => {
        if (d.type === "po") return "#111827";
        if (d.type === "hb") return "#9ca3af";
        return "#2563eb";
      })
      .attr("stroke-dasharray", (d) => (d.type === "hb" ? "6 5" : "0"))
      .attr("marker-end", (d) =>
        d.type === "rf" ? "url(#arrow-rf)" : "url(#arrow-po)"
      )
      .attr("opacity", (d) => (d.type === "hb" ? 0.9 : 0.95));

    // Nodes
    const nodeG = g
      .selectAll(".node")
      .data(visibleActions, (d) => d.id)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${nodeX(d)}, ${nodeY(d)})`);

    const fillForType = (t) => {
      if (t === "IW") return "#6b7280"; // init
      if (t === "AW") return "#7c3aed"; // atomic write
      if (t === "AR") return "#db2777"; // atomic read
      if (t === "W") return "#16a34a"; // write
      return "#f59e0b"; // read
    };

    nodeG
      .append("circle")
      .attr("r", nodeR)
      .attr("fill", (d) => fillForType(d.type))
      .attr("stroke", "#111827")
      .attr("stroke-width", 1.5);

    nodeG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", 12)
      .attr("fill", "white")
      .style("font-weight", 800)
      .text((d) => d.type);

    nodeG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", nodeR + 22)
      .attr("font-size", 12)
      .attr("fill", "#111827")
      .text((d) => d.label);
  }, [execution, step, showHB]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          className="px-4 py-2 rounded-lg bg-black text-white"
          onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
        >
          Step +
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-gray-200 text-black"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          Back
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-gray-200 text-black"
          onClick={() => setStep(1)}
        >
          Reset
        </button>

        <label className="flex items-center gap-2 text-sm text-gray-700 ml-2">
          <input
            type="checkbox"
            checked={showHB}
            onChange={(e) => setShowHB(e.target.checked)}
          />
          Show hb (simplified)
        </label>

        <div className="text-sm text-gray-700">
          Step: <b>{step}</b> / {maxStep}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} />
      </div>

      <div className="mt-2 text-xs text-gray-600">
        Legend: <b>po</b>=black, <b>rf</b>=blue, <b>hb</b>=grey dashed (MVP: hb = po)
      </div>
    </div>
  );
}
