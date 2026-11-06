import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
const transport=vi.hoisted(()=>({create:vi.fn()}));
vi.mock('openai',()=>({default:class{responses={create:transport.create}}}));
import {verifyClaims} from '@/modules/strategy/claims';
import {fieldPatch} from '@/modules/intelligence/field-repair';
import {acquisitionWireSchema,acquisitionSchema} from '@/modules/intelligence/acquisition-contract';
import {provider} from '@/modules/analysis/provider';
import {passingReview} from './fixtures/quality-review';
const root='docs/sol-review-budget-acceptance/';
const load=(p:string)=>JSON.parse(readFileSync(root+p,'utf8'));
const candidate=load('2-output.txt'),repair=load('3-output.txt');
afterEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks()});
const check=(value:unknown)=>verifyClaims(value,[],[],{},true,{productName:'Senja',deferCapabilities:true});
it('preserves the genuine disclaimer and channel hypothesis byte-for-byte',()=>{
 const original={positioning:candidate.positioning,firstExperiment:{channelRationale:candidate.firstExperiment.channelRationale}};
 expect(check(original).value).toEqual(original);expect(check(original).actions.filter(a=>a.action==='removed')).toEqual([]);
});
it.each([
 'Senja delivers twice as many testimonials.',
 candidate.positioning+'; Senja guarantees twice as many testimonials.',
 'Do not claim twice as many testimonials, but Senja guarantees twice as many testimonials.',
 'Unknown whether Senja is useful; Senja guarantees twice as many testimonials.',
])('rejects an affirmative unsupported promise even next to a warning: %s',positioning=>{
 expect(check({positioning}).actions.some(a=>a.action==='removed')).toBe(true);
});
it('does not exempt a product promise placed in a channel comparison field',()=>{
 expect(check({firstExperiment:{channelRationale:{tradeoff:'Manual research may help, but Senja is faster than every other product.'}}}).actions.some(a=>a.action==='removed')).toBe(true);
});
it('rejects the exact saved incomplete repair in its patch schema and full contract',()=>{
 const issues=load('summary.json').failure.qualityFailure.issues;
 const p=fieldPatch(candidate,acquisitionWireSchema().shape,issues);
 expect(p.schema.safeParse(repair).success).toBe(false);
 const incomplete=structuredClone(candidate);incomplete.positioning=repair.positioning;
 expect(acquisitionSchema().safeParse(incomplete).success).toBe(false);
 const corrected={...repair,positioning:'Senja provides customizable forms for collecting learner testimonials.'};
 expect(p.schema.safeParse(corrected).success).toBe(true);
 const applied=p.apply(corrected);const expected=structuredClone(candidate);
 expected.positioning=corrected.positioning;expected.firstExperiment.channelRationale.tradeoff=corrected['firstExperiment.channelRationale.tradeoff'];
 expect(applied).toEqual(expected);expect(candidate.positioning).not.toBe(corrected.positioning);
});
function env(){for(const[k,v]of Object.entries({DATABASE_URL:'postgresql://unused/local',APP_URL:'http://localhost:3100',NEON_AUTH_BASE_URL:'http://localhost/auth',NEON_AUTH_COOKIE_SECRET:'fixture-only-secret-over-32-characters',OPENAI_API_KEY:'fixture-not-a-key',OPENAI_MODEL:'gpt-6.1-sol',MOCK_ANALYSIS:'false',MAX_OUTPUT_TOKENS:'8000'}))vi.stubEnv(k,v);}
const response=(v:unknown)=>({status:'completed',output_text:JSON.stringify(v),usage:{input_tokens:200,output_tokens:200}});
it('repairs only the genuine dangling uncertainty clause and reaches offline final acceptance',async()=>{
 env();const original=structuredClone(candidate);
 transport.create.mockResolvedValueOnce(response(load('1-output.txt'))).mockResolvedValueOnce(response(candidate))
 .mockResolvedValueOnce(response({'unknowns.2':'Founder resources and product access are unknown; verify the listed free tools before execution.'}))
 .mockResolvedValueOnce(response(passingReview));
 const result=await provider().analyze(load('sources.json'),AbortSignal.timeout(3000));
 expect(result.report.schemaVersion).toBe('1.1');
 expect(transport.create.mock.calls.map(([r])=>r.text.format.name)).toEqual(['attributed_product_profile','acquisition_strategy','quality_repair','quality_review']);
 expect(Object.keys(transport.create.mock.calls[2][0].text.format.schema.properties)).toEqual(['unknowns.2']);
 if(result.report.schemaVersion!=='1.1')throw Error('Wrong schema');
 const expected=structuredClone(candidate);expected.unknowns[2]='Founder resources and product access are unknown; verify the listed free tools before execution.';
 expect(result.report.acquisitionStrategy).toEqual(expected);expect(candidate).toEqual(original);expect(result.report.quality?.repairs).toBe(1);
});
it('still rejects a semantic failure after a valid bounded correction',async()=>{
 env();const failed=structuredClone(passingReview);failed.scores.successCriteria=0;failed.issues=[{section:'firstExperiment.continueWhen',reason:'Trial agreement is not buying evidence'}];
 transport.create.mockResolvedValueOnce(response(load('1-output.txt'))).mockResolvedValueOnce(response(candidate))
 .mockResolvedValueOnce(response({'unknowns.2':'Founder resources and product access remain unknown; verify access before execution.'}))
 .mockResolvedValueOnce(response(failed));
 await expect(provider().analyze(load('sources.json'),AbortSignal.timeout(3000))).rejects.toMatchObject({reason:'quality_failed'});
 expect(transport.create).toHaveBeenCalledTimes(4);
});
it('passes a complete saved candidate to semantic review unchanged without buying a repair',async()=>{
 env();const valid=structuredClone(candidate);valid.unknowns[2]='Founder resources and product access are unknown; verify free access before execution.';
 transport.create.mockResolvedValueOnce(response(load('1-output.txt'))).mockResolvedValueOnce(response(valid)).mockResolvedValueOnce(response(passingReview));
 const result=await provider().analyze(load('sources.json'),AbortSignal.timeout(3000));
 expect(transport.create.mock.calls.map(([r])=>r.text.format.name)).toEqual(['attributed_product_profile','acquisition_strategy','quality_review']);
 if(result.report.schemaVersion!=='1.1')throw Error('Wrong schema');expect(result.report.acquisitionStrategy).toEqual(valid);expect(result.report.quality?.repairs).toBe(0);
});
import { zodTextFormat } from 'openai/helpers/zod';
it('uses provider-compatible repair schemas while rejecting the real incomplete repair locally',()=>{
 const p=fieldPatch(candidate,acquisitionWireSchema().shape,load('summary.json').failure.qualityFailure.issues);
 const wire=zodTextFormat(p.wireSchema,'quality_repair');expect(JSON.stringify(wire)).not.toContain('?!');
 expect(p.wireSchema.safeParse(repair).success).toBe(true);expect(p.schema.safeParse(repair).success).toBe(false);expect(()=>p.apply(repair)).toThrow();
});
it('accepts observable purchase-step wording from the latest genuine trace without a spurious repair',async()=>{
 env();const read=(p:string)=>JSON.parse(readFileSync('docs/senja-committed-acceptance/'+p,'utf8'));
 const real=read('2-output.txt');transport.create.mockResolvedValueOnce(response(read('1-output.txt'))).mockResolvedValueOnce(response(real)).mockResolvedValueOnce(response(passingReview));
 const result=await provider().analyze(read('sources.json'),AbortSignal.timeout(3000));
 expect(transport.create.mock.calls.map(([r])=>r.text.format.name)).toEqual(['attributed_product_profile','acquisition_strategy','quality_review']);
 if(result.report.schemaVersion!=='1.1')throw Error('Wrong schema');expect(result.report.acquisitionStrategy).toEqual(real);
});
import {strategyConsistency} from '@/modules/intelligence/strategy-consistency';
it('groups both genuine incomplete fields into one repair before semantic review',async()=>{
 env();const root='docs/senja-continuation/improved-prefix/';const read=(p:string)=>JSON.parse(readFileSync(root+p,'utf8'));const real=JSON.parse(read('2-response.json').output_text);const issues=strategyConsistency(real).filter(i=>i.reason.startsWith('Incomplete strategic'));
 expect(issues.map(i=>i.path).sort()).toEqual(['alternatives.1.preferWhen','firstExperiment.resources.constraints']);
 const patch={'firstExperiment.channelDescription':'Research public course websites and send individual business emails about current testimonial workflows.','alternatives.1.preferWhen':'Prefer community participation when posting is permitted; consider existing-user discovery only with authorized workflow evidence.','firstExperiment.resources.constraints':'Zero spend and capacity are assumptions. Use public business routes; obtain founder time approval before activation support or later-week execution.'};
 transport.create.mockResolvedValueOnce(response(JSON.parse(read('1-response.json').output_text))).mockResolvedValueOnce(response(real)).mockResolvedValueOnce(response(patch)).mockResolvedValueOnce(response(passingReview));
 const result=await provider().analyze(read('sources.json'),AbortSignal.timeout(3000));
 expect(Object.keys(transport.create.mock.calls[2][0].text.format.schema.properties).sort()).toEqual(Object.keys(patch).sort());expect(transport.create).toHaveBeenCalledTimes(4);
 if(result.report.schemaVersion!=='1.1')throw Error('Wrong schema');expect(result.report.quality?.repairs).toBe(1);
});
it('rejects a genuine complete-looking repair that duplicates numeric resource estimates in prose',()=>{
 const read=(p:string)=>JSON.parse(readFileSync('docs/senja-continuation/improved-prefix/'+p,'utf8'));const real=JSON.parse(read('2-response.json').output_text);const raw=JSON.parse(readFileSync('docs/senja-continuation/combined-repair-failure/3-output.txt','utf8'));
 const issues=strategyConsistency(real).filter(i=>i.reason.startsWith('Incomplete strategic'));const p=fieldPatch(real,acquisitionWireSchema().shape,issues);
 const invalid=p.apply(raw);expect(acquisitionSchema().safeParse(invalid).success).toBe(false);expect(strategyConsistency(invalid).some(i=>i.path==='firstExperiment.resources.constraints')).toBe(true);
});
