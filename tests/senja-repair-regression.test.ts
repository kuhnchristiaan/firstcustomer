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
