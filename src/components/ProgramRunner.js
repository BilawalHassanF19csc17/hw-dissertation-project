"use client";

import { useMemo, useState } from "react";
import SwimlaneGraph from "./SwimlaneGraph";
import { parseProgram } from "../lib/parseProgram";
import { generateExecutions } from "../lib/generateExecutions";

const DEFAULT_PROGRAM_TEXT = `T1:
  W x 1
  R y r1
  A_STORE z 1
  A_LOAD x r2

T2:
  W y 1
  R x r3
  A_STORE x 2
  A_LOAD z r4`;

export default function ProgramRunner() {
  const [text, setText] = useState(DEFAULT_PROGRAM_TEXT);
  const [error, setError] = useState("");
  const [executions, setExecutions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [maxExecutions, setMaxExecutions] = useState(200);

  function onGenerate() {
    try {
      setError("");

      // Must-have: parse user input program
      const program = parseProgram(text, {
        maxThreads: 3,
        maxOpsPerThread: 4, // supports your DSL example with 4 ops per thread
      });

      // Must-have: generate one or more executions
      const execs = generateExecutions(program, { maxExecutions });

      setExecutions(execs);
      setSelectedId(execs[0]?.id ?? "");
    } catch (e) {
      setExecutions([]);
      setSelectedId("");
      setError(e?.message ?? "Failed to parse/generate.");
    }
  }

  const selectedExecution = useMemo(() => {
    return executions.find((e) => e.id === selectedId) ?? executions[0] ?? null;
  }, [executions, selectedId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-medium text-black">Program input (DSL)</div>

          <textarea
            className="w-full h-72 p-3 border rounded-xl font-mono text-sm text-black"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-black text-white"
              onClick={onGenerate}
            >
              Parse + Generate Executions
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-gray-200 text-black border border-black"
              onClick={() => {
                setText(DEFAULT_PROGRAM_TEXT);
                setError("");
              }}
            >
              Reset input
            </button>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Max exec</label>
              <input
                className="w-24 border rounded-lg px-2 py-1 text-black"
                type="number"
                min={1}
                max={2000}
                value={maxExecutions}
                onChange={(e) => setMaxExecutions(Number(e.target.value || 200))}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="text-sm text-gray-700">
            Executions generated: <b>{executions.length}</b>
          </div>

          {executions.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-black">Choose execution</label>
              <select
                className="border rounded-lg px-3 py-2 bg-white text-black"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {executions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-xs text-gray-600 leading-relaxed">
            <div className="font-semibold mb-1">DSL rules</div>
            <div>Thread header: <b>T1:</b>, <b>T2:</b>, <b>T3:</b> (max 3)</div>
            <div>Ops per thread: max 4</div>
            <div className="mt-1">
              Instructions:{" "}
              <span className="font-mono">W x 1</span>,{" "}
              <span className="font-mono">R y r1</span>,{" "}
              <span className="font-mono">A_STORE z 1</span>,{" "}
              <span className="font-mono">A_LOAD x r2</span>
            </div>
          </div>
        </div>
 
        <div className="space-y-2">
          <div className="text-sm font-medium text-black">Execution graph (swimlane)</div>
          {selectedExecution ? (
            <SwimlaneGraph execution={selectedExecution} />
          ) : (
            <div className="p-6 rounded-xl border bg-white text-gray-600">
              Click <b>Parse + Generate Executions</b> to render a graph.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}