import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {zodTextFormat} from 'openai/helpers/zod';
import {qualityGate,qualityReviewSchema,reviewIssues,uniqueQualityIssues} from '@/modules/intelligence/quality';
import {acquisitionWireSchema,acquisitionSchema} from '@/modules/intelligence/acquisition-contract';
import {strategyConsistency} from '@/modules/intelligence/strategy-consistency';
const read=(p:string)=>JSON.parse(readFileSync('docs/senja-continuation/'+p,'utf8'));
const accepted=read('accepted/accepted-report.json');
const realReview=read('three-field-review/4-output.txt');
const passing=read('accepted/4-output.txt');
it('does not retroactively reclassify a historical genuine issue as advisory',()=>{
 const snapshot=JSON.stringify(realReview);expect(reviewIssues(qualityReviewSchema.parse(realReview))).toEqual(realReview.issues);expect(JSON.stringify(realReview)).toBe(snapshot);
});
it('accepts usable editorial feedback without spending a repair or modifying the genuine strategy',async()=>{
 // Explicit current-policy fixture; the saved historical judgment stays intact.
 const review=qualityReviewSchema.parse({...passing,advisories:realReview.issues});
 const strategy=accepted.acquisitionStrategy,snapshot=JSON.stringify(strategy);
 const call=vi.fn().mockResolvedValue(review);
 const result=await qualityGate({candidate:strategy,fields:acquisitionWireSchema().shape,product:accepted.productIntelligence,context:{},call,inspect:v=>strategyConsistency(v),claimIssues:()=>[],validate:v=>acquisitionSchema().parse(v)});
 expect(result.repairs).toBe(0);expect(call).toHaveBeenCalledTimes(1);expect(call.mock.calls[0][1]).toBe('quality_review');expect(result.review.advisories).toEqual(realReview.issues);expect(JSON.stringify(result.value)).toBe(snapshot);
});
it.each(['claimSafety','outreachCompleteness','successCriteria'] as const)('an advisory never compensates for weak %s',dimension=>{
 const r=qualityReviewSchema.parse({...passing,scores:{...passing.scores,[dimension]:1},advisories:realReview.issues});expect(()=>reviewIssues(r)).toThrow('inconsistent');
});
it('a commercial defect remains blocking even when editorial advice also exists',()=>{
 const r=qualityReviewSchema.parse({...passing,scores:{...passing.scores,commercialRealism:0},issues:[{section:'firstExperiment',reason:'The buyer cannot be reached within the founder budget.'}],advisories:realReview.issues});expect(reviewIssues(r)).toEqual(r.issues);
});
it('deduplicates rendered copies of one defect but preserves different source paths and defect types',()=>{
 const a={section:'firstExperiment',path:'firstExperiment.commercialLearning',reason:'No observable success measure: acquisitionChannels.0.successMetric'};
 const b={...a,reason:'No observable success measure: thirtyDayPlan.0.successMetric'};
 const other={...a,path:'firstExperiment.continueWhen'};
 const unsafe={...a,reason:'Unsupported assertion: firstExperiment.commercialLearning'};
 expect(uniqueQualityIssues([a,b,other,unsafe])).toEqual([a,other,unsafe]);
});
it('retains old record compatibility and strict SDK output compatibility',()=>{
 expect(qualityReviewSchema.safeParse(passing).success).toBe(true);
 const f=zodTextFormat(qualityReviewSchema,'quality_review');expect(f.strict).toBe(true);expect(f.schema.required).toContain('advisories');expect(JSON.stringify(f)).not.toContain('?!');
});
it('an editorial advisory cannot hide a deterministic resource blocker',async()=>{
 const bad=structuredClone(accepted.acquisitionStrategy);bad.firstExperiment.resources.assumedMinutes=15;
 const call=vi.fn().mockResolvedValue({});
 await expect(qualityGate({candidate:bad,fields:acquisitionWireSchema().shape,product:accepted.productIntelligence,context:{},initialReview:qualityReviewSchema.parse({...passing,advisories:realReview.issues}),call,inspect:v=>strategyConsistency(v),claimIssues:()=>[],validate:v=>acquisitionSchema().parse(v)})).rejects.toThrow();
 expect(call).toHaveBeenCalledTimes(1);expect(call.mock.calls[0][1]).toBe('quality_repair');
});
it('unusable repetition remains blocking even if supplied only as an advisory',()=>{
 const r=qualityReviewSchema.parse({...passing,scores:{...passing.scores,repetition:0},advisories:realReview.issues});expect(()=>reviewIssues(r)).toThrow('inconsistent');
});
