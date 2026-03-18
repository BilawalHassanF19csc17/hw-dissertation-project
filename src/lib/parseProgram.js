export function parseProgram(input, opts = {}) {
    const maxThreads = opts.maxThreads ?? 3;
    const maxOpsPerThread = opts.maxOpsPerThread ?? 4;
  
    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  
    const threads = [];
    let current = null;
    const locs = new Set();
  
    for (const line of lines) {
      // Thread header like "T1:"
      const headerMatch = line.match(/^([A-Za-z0-9_]+)\s*:\s*$/);
      if (headerMatch) {
        if (threads.length >= maxThreads) {
          throw new Error(`Too many threads. Max is ${maxThreads}.`);
        }
        const id = headerMatch[1];
        current = { id, name: id, ops: [] };
        threads.push(current);
        continue;
      }
  
      if (!current) {
        throw new Error(`Instruction before any thread header. Line: "${line}"`);
      }
  
      if (current.ops.length >= maxOpsPerThread) {
        throw new Error(
          `Too many operations in ${current.id}. Max ops per thread is ${maxOpsPerThread}.`
        );
      }
  
      // Atomic store: A_STORE x 1
      const asMatch = line.match(
        /^A_STORE\s+([A-Za-z_][A-Za-z0-9_]*)\s+(-?\d+)\s*$/i
      );
      if (asMatch) {
        const loc = asMatch[1];
        const val = Number(asMatch[2]);
        locs.add(loc);
        current.ops.push({ kind: "W", loc, val, atomic: true });
        continue;
      }
  
      // Atomic load: A_LOAD y r1
      const alMatch = line.match(
        /^A_LOAD\s+([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i
      );
      if (alMatch) {
        const loc = alMatch[1];
        const reg = alMatch[2];
        locs.add(loc);
        current.ops.push({ kind: "R", loc, reg, atomic: true });
        continue;
      }
  
      // Normal write: W x 1
      const wMatch = line.match(
        /^W\s+([A-Za-z_][A-Za-z0-9_]*)\s+(-?\d+)\s*$/i
      );
      if (wMatch) {
        const loc = wMatch[1];
        const val = Number(wMatch[2]);
        locs.add(loc);
        current.ops.push({ kind: "W", loc, val, atomic: false });
        continue;
      }
  
      // Normal read: R y r1
      const rMatch = line.match(
        /^R\s+([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i
      );
      if (rMatch) {
        const loc = rMatch[1];
        const reg = rMatch[2];
        locs.add(loc);
        current.ops.push({ kind: "R", loc, reg, atomic: false });
        continue;
      }
  
      throw new Error(`Unknown instruction: "${line}"`);
    }
  
    if (threads.length === 0) {
      throw new Error("No threads found. Add at least one thread like T1: ...");
    }
  
    return { threads, locations: Array.from(locs) };
  }
  