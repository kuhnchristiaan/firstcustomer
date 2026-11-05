# Predeclared commercial intelligence rubric

Recorded before generation or inspecting any new benchmark output. Score the original contract, not an assembler's success or a model's own assessment. Each component earns zero for absent/contradictory reasoning, roughly half for a usable but weakly justified hypothesis, and full marks for specific, evidence-aware reasoning with explicit uncertainties and an executable validation method. Partial points are permitted with concrete reasons and excerpts.

| Category | Components | Maximum |
| --- | --- | ---: |
| A Product understanding | Accurate product/workflow/customer interpretation (8); claims distinguish owner evidence from proof and avoid invented capabilities/guarantees (7) | 15 |
| B Customer prioritisation | Different buyer/workflow groups (5); plausible first buyer (5); urgency (4); authority (3); access and willingness to pay (3) | 20 |
| C Acquisition strategy | Buying-motion fit (7); first-channel justification (8); two credible alternatives and switching conditions (6); no unjustified traffic/audience/budget dependency (4) | 25 |
| D Actionability | Prospect qualification and location (5); scoped first action (6); realistic resources (3); useful continue/adjust/stop rules (6) | 20 |
| E Commercial reasoning | Engagement/activation/payment distinctions and payment path (5); avoids arbitrary response/conversion forecasts (5) | 10 |
| F Reliability and clarity | Internal consistency (5); complete concise messages and clear presentation (3); explicit evidence limits, no invented research (2) | 10 |

For the cost-per-commercially-acceptable-strategy calculation, require **80/100**, at least **60% in every category**, and no critical invented capability/performance/compliance guarantee, fabricated prospect observation, unavoidable unstated paid-resource dependency, or unusable first experiment. This benchmark rule is separate from the application's unchanged quality thresholds. Do not change it after seeing outputs.

Primary review: model-label-hidden content assessment by the Codex assistant in this chat, with scores/reasons saved before opening the model mapping or usage results. No extra model grading API call and no generator self-rating is used. This is an assistant judgment, not independent human market validation. The exact underlying Codex model identifier is not exposed by the evaluation API; evaluator-family/style bias remains possible. Model labels can be inferred from style despite hiding metadata. Preserve every complete original output for the user's independent assessment.

Official specifications and pricing checked 5 November 2026:

- [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini): $0.40/M input, $0.10/M cached input, $1.60/M output; Responses and structured outputs supported. Documentation marks this model deprecated; test the explicitly requested ID rather than substitute.
- [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol): Standard $2/M input, $0.10/M cached input, $10/M output; cache writes $2.50/M. Responses and structured outputs supported; medium reasoning supported.
- [API pricing](https://developers.openai.com/api/docs/pricing) and [reasoning controls](https://developers.openai.com/api/docs/guides/reasoning): output limits include reasoning; initial experimentation guidance recommends at least 25,000 output/reasoning tokens. Use Standard processing, not Fast/Ultrafast, and no tools or extra research.

Planned request differences: model ID; Mini output cap 6,000 versus Sol 25,000; Sol alone receives `reasoning: {effort: "medium"}`. Both use the exact same system instructions, structured output schema and user data for each product. No temperature/top-p controls are supplied. Production model/environment/budgets remain unchanged. Preflight uses a deliberately conservative one-token-per-request-byte reservation plus 2,048 framing tokens, all output tokens, and the highest applicable input/cache-write rate without a cache discount. Actual cost includes reasoning once within total output, not twice. Unknown usage retains the full reservation.
