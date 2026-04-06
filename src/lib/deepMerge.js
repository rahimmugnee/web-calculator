/** Deep-merge plain objects; arrays and primitives from `patch` replace. */
export function deepMerge(base, patch) {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(patch)) return patch.slice();
  if (typeof patch !== "object") return patch;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return deepMerge({}, patch);
  }
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = base[key];
    if (pv !== null && typeof pv === "object" && !Array.isArray(pv)) {
      out[key] = deepMerge(typeof bv === "object" && bv !== null && !Array.isArray(bv) ? bv : {}, pv);
    } else {
      out[key] = pv;
    }
  }
  return out;
}
