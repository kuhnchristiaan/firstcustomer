type Run = { status: string; leaseExpiresAt: Date };
export function analysisStatus(run: Run | undefined, now = new Date()) {
  return run?.status === "RUNNING" && run.leaseExpiresAt <= now
    ? "FAILED"
    : run?.status;
}
export function activeAnalysis(run: Run, now = new Date()) {
  return run.status === "RUNNING" && run.leaseExpiresAt > now;
}
