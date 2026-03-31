function cartesianProduct(arrays, max = 200) {
    let combos = [[]];
    for (const choices of arrays) {
      const next = [];
      for (const combo of combos) {
        for (const choice of choices) {
          next.push([...combo, choice]);
          if (next.length >= max) return next;
        }
      }
      combos = next;
    }
    return combos;
  }
  
  export function generateExecutions(program, opts = {}) {
    const maxExecutions = opts.maxExecutions ?? 200;
  

    const threads = [
      { id: "INIT", name: "Init" },
      ...program.threads.map((t) => ({ id: t.id, name: t.name })),
    ];
  
    const actions = [];
    const initWriteByLoc = new Map();
  

    program.locations.forEach((loc, i) => {
      const id = `init_${loc}`;
      const a = {
        id,
        thread: "INIT",
        index: i,
        kind: "W",
        loc,
        val: 0,
        atomic: true,
        type: "IW",
        label: `Init W(${loc})=0`,
        step: 1,
      };
      actions.push(a);
      initWriteByLoc.set(loc, a);
    });
  
    const writesByLoc = new Map(); 
    const reads = [];
  

    for (const t of program.threads) {
      let laneIndex = 0;
  
      t.ops.forEach((op, opIndex) => {
        const id = `${t.id}_${op.kind}_${op.loc}_${opIndex}`;
        const base = {
          id,
          thread: t.id,
          index: laneIndex++,
          kind: op.kind,
          loc: op.loc,
          atomic: !!op.atomic,
          step: 2 + opIndex, 
        };
  
        if (op.kind === "W") {
          const isAtomic = !!op.atomic;
          const a = {
            ...base,
            val: op.val,
            type: isAtomic ? "AW" : "W",
            label: isAtomic
              ? `A_STORE(${op.loc})=${op.val}`
              : `W(${op.loc})=${op.val}`,
          };
          actions.push(a);
          if (!writesByLoc.has(op.loc)) writesByLoc.set(op.loc, []);
          writesByLoc.get(op.loc).push(a);
        } else {
          const isAtomic = !!op.atomic;
          const a = {
            ...base,
            reg: op.reg,
            type: isAtomic ? "AR" : "R",
            label: isAtomic
              ? `A_LOAD(${op.loc})=? (${op.reg})`
              : `R(${op.loc})=? (${op.reg})`,
          };
          actions.push(a);
          reads.push(a);
        }
      });
    }
  

    const poEdges = [];
    for (const t of program.threads) {
      const laneActions = actions
        .filter((a) => a.thread === t.id)
        .sort((a, b) => a.index - b.index);
  
      for (let i = 0; i < laneActions.length - 1; i++) {
        const from = laneActions[i];
        const to = laneActions[i + 1];
        poEdges.push({
          id: `po_${t.id}_${from.id}_${to.id}`,
          type: "po",
          from: from.id,
          to: to.id,
          step: Math.max(from.step, to.step),
        });
      }
    }
  

    const hbEdges = poEdges.map((e) => ({
      ...e,
      id: `hb_${e.id}`,
      type: "hb",
    }));
  

    function possibleSourcesForRead(readAction) {
      const loc = readAction.loc;
      const sources = [];
      const init = initWriteByLoc.get(loc);
      if (init) sources.push(init);
  
      const allWrites = writesByLoc.get(loc) ?? [];
      for (const w of allWrites) {
        if (w.thread === readAction.thread) {
          if (w.index < readAction.index) sources.push(w);
        } else {
          sources.push(w);
        }
      }
      return sources;
    }
  
    const sourceOptions = reads.map((r) =>
      possibleSourcesForRead(r).map((src) => ({
        readId: r.id,
        readReg: r.reg,
        readAtomic: r.atomic,
        loc: r.loc,
        fromId: src.id,
        value: src.val,
      }))
    );
  

    const combos = cartesianProduct(sourceOptions, maxExecutions);
  

    const executions = combos.map((combo, i) => {
      const actionsClone = actions.map((a) => ({ ...a }));
      const actionMap = new Map(actionsClone.map((a) => [a.id, a]));
  
      const rfEdges = [];
      const regValues = [];
  
      for (const choice of combo) {
        const read = actionMap.get(choice.readId);
        if (!read) continue;
  
        read.label = choice.readAtomic
          ? `A_LOAD(${choice.loc})=${choice.value} (${choice.readReg})`
          : `R(${choice.loc})=${choice.value} (${choice.readReg})`;
  
        regValues.push(`${choice.readReg}=${choice.value}`);
  
        rfEdges.push({
          id: `rf_${choice.fromId}_to_${choice.readId}`,
          type: "rf",
          from: choice.fromId,
          to: choice.readId,
          step: read.step,
        });
      }
  

      const edges = [...poEdges, ...rfEdges, ...hbEdges];
  
      return {
        id: `exec_${i + 1}`,
        title: `Exec ${i + 1}: ${regValues.join(", ") || "no reads"}`,
        threads,
        actions: actionsClone,
        edges,
      };
    });
  
    return executions;
  }
  