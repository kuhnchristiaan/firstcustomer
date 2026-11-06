import { it, expect, vi } from "vitest";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { execFileSync } from "node:child_process";
const audit = vi.hoisted(() => ({ capture: undefined as undefined | ((request: unknown, reserve: number, dispatch: () => Promise<unknown>) => Promise<unknown>) }));
// Capture only. dispatch remains the genuine configured OpenAI SDK call.
vi.mock("@/modules/advisor/smoke-audit", () => ({ auditedResponse: (request: unknown, reserve: number, dispatch: () => Promise<unknown>) => audit.capture!(request, reserve, dispatch) }));
vi.mock("@/modules/auth/server", () => ({ auth: () => { throw new Error("Isolated domain acceptance: synthetic tenant supplied, no app auth bypass"); } }));
import { db } from "@/lib/db";
import { advisorWorkspace } from "@/modules/advisor/service";
import { submitResults, generateWeeklyReview, acceptWeeklyPlan } from "@/modules/advisor/weekly-service";
import { deepStrictEqual } from "node:assert";
const dir = "docs/stage-3-live-acceptance/run-1";
it.skipIf(process.env.WEEKLY_ACCEPTANCE_APPROVED !== "0.90")("runs three genuine first-attempt weekly reviews under the approved shared ceiling", async () => {
  await mkdir(dir); // exclusive one-run lock; no retry/resume
  const keyFile = "C:/Users/Kuhn/Documents/Code/FirstCustomer/.env.local";
  execFileSync("git", ["-C", "C:/Users/Kuhn/Documents/Code/FirstCustomer", "check-ignore", "--quiet", "--", ".env.local"]);
  const key = parse(await readFile(keyFile, "utf8")).OPENAI_API_KEY;
  if (!key) throw new Error("FirstCustomers key unavailable");
  Object.assign(process.env, { DATABASE_URL: "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_weekly_acceptance", APP_URL: "http://localhost:3100", NEON_AUTH_BASE_URL: "http://127.0.0.1:3103/auth", NEON_AUTH_COOKIE_SECRET: "local-acceptance-only-cookie-secret-32-characters", ADVISOR_ENABLED: "true", ADVISOR_FIXTURES: "false", ADVISOR_LIVE_ENABLED: "true", ADVISOR_STRATEGY_MODEL: "gpt-6.1-sol", OPENAI_API_KEY: key });
  delete process.env.ADVISOR_SMOKE_AUDIT_DIR;
  const seed = JSON.parse(await readFile("docs/stage-2b-live-smoke/database-evidence.json", "utf8"));
  const ledger = { ceilingUsd: 0.90, calls: 0, settledUpperUsd: 0, uncertainReservedUsd: 0, stopped: false };
  const save = async (name: string, value: unknown) => writeFile(`${dir}/${name}`, JSON.stringify(value, null, 2)+"\n", { flag: "wx" });
  const update = async () => { await writeFile(`${dir}/ledger.pending.json`, JSON.stringify(ledger, null, 2)); await rename(`${dir}/ledger.pending.json`, `${dir}/ledger.json`); };
  let scenario = 0;
  audit.capture = async (wire, reserve, dispatch) => {
    const request = wire as { model: string; text: { format: { name: string } } };
    if (ledger.stopped || ledger.calls >= 3 || request.model !== "gpt-6.1-sol" || request.text.format.name !== "advisor_weekly_review" || reserve > 0.30 || ledger.settledUpperUsd + ledger.uncertainReservedUsd + reserve > 0.90) throw new Error("Acceptance spending/call guard stopped dispatch");
    await save(`${scenario}-request.json`, request);
    ledger.calls++; ledger.uncertainReservedUsd += reserve; await update();
    const started = Date.now();
    try {
      const response = await dispatch() as { status: string; model: string; output_text: string; usage?: { input_tokens: number; output_tokens: number; input_tokens_details: { cached_tokens?: number; cache_write_tokens?: number }; output_tokens_details: { reasoning_tokens?: number } } };
      const latencyMs = Date.now()-started;
      await save(`${scenario}-response.json`, response);
      await writeFile(`${dir}/${scenario}-output.txt`, response.output_text, { flag: "wx" });
      const u = response.usage;
      if (!u) throw new Error("Missing usage");
      const cached=u.input_tokens_details.cached_tokens??0, writes=u.input_tokens_details.cache_write_tokens??0;
      const cost=((u.input_tokens-cached-writes)*2+cached*0.1+writes*2.5+u.output_tokens*10)/1e6;
      const upper=(u.input_tokens*2.5+u.output_tokens*10)/1e6;
      ledger.uncertainReservedUsd=Math.max(0,ledger.uncertainReservedUsd-reserve); ledger.settledUpperUsd+=upper;
      if(upper>reserve||response.status!=="completed")ledger.stopped=true;
      await update();
      await save(`${scenario}-metrics.json`,{model:response.model,status:response.status,latencyMs,usage:u,estimatedCostUsd:cost,conservativeCostUpperUsd:upper,reservedUsd:reserve});
      return response;
    } catch(error) { ledger.stopped=true; await update(); await save(`${scenario}-error.json`,{status:typeof(error as {status?:unknown}).status==="number"?(error as {status:number}).status:null,note:"No retry; raw provider errors/headers omitted; uncertain reservation retained."}); throw error; }
  };
  await update();
  const p=db();
  const cases=[
    { prospectsContacted:6,replies:2,qualifiedConversations:2,activations:0,payingCustomers:null,feedback:"Synthetic report: founders expressed interest but raised pricing objections. No further pricing or customer-interaction details were supplied." },
    { prospectsContacted:15,replies:0,qualifiedConversations:0,activations:0,payingCustomers:0,feedback:"Synthetic report: no responses observed. Message quality, targeting accuracy and delivery are unverified." },
    { prospectsContacted:0,replies:null,qualifiedConversations:null,activations:null,payingCustomers:null,feedback:"Synthetic report: the founder cannot realistically access the recommended Indie Hackers channel. No meaningful customer response data exists. This is an execution access blocker." }
  ];
  for(const input of cases){
    if(ledger.stopped)break;
    scenario++;
    const userId=`acceptance-${randomUUID()}`;
    await p.user.create({data:{id:userId,email:"synthetic-acceptance@example.test"}});
    const org=await p.organization.create({data:{name:"Synthetic weekly acceptance",slug:userId,ownerId:userId,memberships:{create:{userId}}}});
    const product=await p.product.create({data:{organizationId:org.id,name:"Senja",websiteUrl:"https://senja.io/"}});
    const w=await p.advisorWorkspace.create({data:{productId:product.id,founderContext:seed.workspace.founderContext,profile:seed.workspace.profile,sources:seed.workspace.sources}});
    const plan=await p.advisorStrategy.create({data:{workspaceId:w.id,version:1,strategyVersion:1,founderContext:seed.workspace.founderContext,output:seed.strategy.output,fixture:false,tasks:{create:seed.strategy.output.tasks.map((_:unknown,position:number)=>({position}))}}});
    const t={organizationId:org.id,userId};
    const results=await submitResults(t,product.id,{planId:plan.id,submissionKey:randomUUID(),...input,feedback:input.feedback+" Task-completion confirmations were not supplied; no tasks are marked completed.",completedTaskIds:[]});
    await save(`${scenario}-case.json`,{synthetic:true,productId:product.id,workspaceId:w.id,planId:plan.id,reviewId:results.id,context:seed.workspace.founderContext,results:results.results});
    let failure: string|null=null;
    try { await generateWeeklyReview(t,product.id,results.id); } catch(e) { failure=e instanceof Error?e.message:"Review failed"; }
    const reviewed=await p.advisorWeeklyReview.findUniqueOrThrow({where:{id:results.id}});
    const current=await advisorWorkspace(t,product.id);
    deepStrictEqual(current.strategies[0].output,plan.output);
    expect(current.strategies[0].id).toBe(plan.id);
    expect(await p.advisorStrategy.count({where:{workspaceId:w.id}})).toBe(1);
    expect(reviewed.nextPlanId).toBeNull();
    let staleApprovalDenied=false;
    if(reviewed.status==="PROPOSED"){
      try{await acceptWeeklyPlan(t,product.id,{reviewId:results.id,expectedPlanId:"stale-test-plan",confirmMaterialChange:true});}catch(e){staleApprovalDenied=(e as {status?:number}).status===409;}
      expect(staleApprovalDenied).toBe(true);
    }
    await save(`${scenario}-result.json`,{review:reviewed,applicationFailure:failure,activePlanUnchanged:true,noProposalApplied:true,staleApprovalDenied});
  }
  await p.$disconnect();
  delete process.env.OPENAI_API_KEY;
  expect(ledger.settledUpperUsd+ledger.uncertainReservedUsd).toBeLessThanOrEqual(0.90);
}, 450000);
