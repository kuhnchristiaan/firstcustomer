import type { Strategy } from "@/modules/strategy/schema";
type Comparison = Extract<
  Strategy,
  { schemaVersion: "3.0" }
>["intelligence"]["segmentComparison"];
const factors = {
  productRelevance: "Product relevance",
  painSeverity: "Likely problem severity",
  decisionMakerAccess: "Decision-maker access",
  purchasingSimplicity: "Purchasing simplicity",
  onboardingSimplicity: "Onboarding simplicity",
  timeFit: "Founder time fit",
  paymentLikelihood: "Payment likelihood",
  evidenceStrength: "Evidence strength",
  repeatability: "Acquisition repeatability",
} as const;
export function SegmentComparison({
  comparisons,
}: {
  comparisons: Comparison;
}) {
  const ordered = [...comparisons].sort((a, b) => a.priority - b.priority);
  return (
    <details className="comparison-matrix">
      <summary>Compare the nine decision factors</summary>
      <table>
        <caption>
          Qualitative planning judgements, not measured demand or conversion
          probabilities. Unknown factors need validation.
        </caption>
        <thead>
          <tr>
            <th scope="col">Decision factor</th>
            {ordered.map((s) => (
              <th scope="col" key={s.priority}>
                {s.priority}. {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(factors).map(([key, label]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              {ordered.map((s) => (
                <td key={s.priority}>
                  {s.factors[key as keyof typeof factors]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
