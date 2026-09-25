/** Deterministic bounded risk, not a mandatory halfway dialog. No new random stream. */
export function assignmentIncidentRisk(task: {id: number; created: number; kind: string; site: string; quality?: number}, order: number): boolean {
  let hash = 2166136261;
  for (const ch of [task.id, task.created, task.kind, task.site].join('|')) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const quality = Number.isFinite(task.quality) ? Math.min(150, Math.max(0, task.quality!)) : 100;
  const stability = Number.isFinite(order) ? Math.min(100, Math.max(0, order)) : 0;
  const risk = Math.max(5, Math.min(85, Math.round(40 - stability * .4 + (100 - quality) * .5)));
  return (hash >>> 0) % 100 < risk;
}
