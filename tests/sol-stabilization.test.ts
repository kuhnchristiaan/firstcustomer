import {it,expect} from 'vitest';
import {fieldPatch} from '@/modules/intelligence/field-repair';
import {acquisitionWireSchema} from '@/modules/intelligence/acquisition-contract';
import {compactFixture} from './fixtures/acquisition';
import {commercialFixture} from './fixtures/commercial-quality';
it('preserves repair enum constraints and removes unsupported pricing citations without inventing evidence',()=>{
 const s=compactFixture(commercialFixture().report);s.paymentPath.monetizationStatus='Website-supported';s.paymentPath.pricingStatementIds=['s1'];
 const p=fieldPatch(s,acquisitionWireSchema().shape,[{section:'paymentPath',path:'paymentPath.monetizationStatus',reason:'Unsupported pricing evidence'}]);
 expect(p.schema.safeParse({'paymentPath.monetizationStatus':'invented paid tier','paymentPath.pricingStatementIds':[]}).success).toBe(false);
 const fixed=p.apply({'paymentPath.monetizationStatus':'Unknown','paymentPath.pricingStatementIds':[]});
 expect((fixed.paymentPath as typeof s.paymentPath).pricingStatementIds).toEqual([]);expect(s.paymentPath.pricingStatementIds).toEqual(['s1']);
});
it('retains integer and upper resource bounds in repair requests',()=>{
 const s=compactFixture(commercialFixture().report);const p=fieldPatch(s,acquisitionWireSchema().shape,[{section:'firstExperiment',path:'firstExperiment.resources.assumedMinutes',reason:'Invalid effort'}]);
 expect(p.schema.safeParse({'firstExperiment.resources.assumedMinutes':121}).success).toBe(false);
 expect(p.schema.safeParse({'firstExperiment.resources.assumedMinutes':85.5}).success).toBe(false);
});

import {analysisRequest} from '@/modules/analysis/provider';
import {z} from 'zod';
it('uses Sol structured outputs with explicit reasoning and no hidden token expansion',()=>{
 const r=analysisRequest(z.object({answer:z.string()}),'probe','instructions',{},'gpt-6.1-sol',700);
 expect(r.model).toBe('gpt-6.1-sol');expect(r.max_output_tokens).toBe(700);expect(r.reasoning).toEqual({effort:'low'});expect(r.text.format.strict).toBe(true);
});
import {assembleAcquisition} from '@/modules/intelligence/acquisition-strategy';
import {deterministicQuality} from '@/modules/intelligence/quality';
it('recognizes concrete observed collection and buying events without demanding metric keywords',()=>{
 const f=commercialFixture();const s=compactFixture(f.report);
 s.firstExperiment.commercialLearning='Learn whether a founder describes a current collection bottleneck, completes a useful product event, and considers the verified SaaS purchase path.';
 const report=assembleAcquisition(s,f.profile);
 expect(deterministicQuality(report).filter(i=>i.reason.includes('No observable success measure'))).toEqual([]);
});
