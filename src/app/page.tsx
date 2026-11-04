import { guestConfig } from "@/modules/guest/config";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, ArrowRight } from "lucide-react";
import { UrlForm } from "@/components/url-form";
import { LandingMetric } from "@/components/landing-metric";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  let guestAvailable = false;
  try {
    guestConfig();
    guestAvailable = true;
  } catch {}
  const query = await searchParams;
  const initialUrl =
    typeof query.url === "string" ? query.url.slice(0, 2048) : "";
  return (
    <main className="marketing">
      {guestAvailable && <LandingMetric />}
      <section className="marketing-hero">
        <div className="container">
          <div className="hero-topline">
            <span>
              <i /> The next chapter for SaaS founders
            </span>
            <span className="hero-edition">
              Your first customers start here.
            </span>
          </div>
          <h1>
            You built your SaaS.
            <br />
            Now find your
            <br className="hero-break" /> <span>first customers.</span>
          </h1>
          <div className="hero-bottom">
            <p>
              A sharper target. A message worth sending. A practical sales
              strategy built from your website — so you can stop guessing and
              start a conversation.
            </p>
            <a href="#strategy-example" className="hero-explore">
              See what you’ll get <ArrowDown size={18} />
            </a>
          </div>
          <div className="hero-form" id="generate">
            <div className="form-intro">
              <span className="step-number">01</span>
              <div>
                <h2>Start with your website.</h2>
                <p>We’ll help you find your next move.</p>
              </div>
              <span className="free-label">Free. Yours to use.</span>
            </div>
            {guestAvailable ? (
              <UrlForm initialUrl={initialUrl} />
            ) : (
              <div role="status">
                <p className="mb-4">
                  Free website analysis is temporarily unavailable. Your saved
                  reports are still available.
                </p>
                <Link href="/preview" className="text-link">
                  Explore a sample sales strategy <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </div>
          <div className="hero-assurances">
            <span>
              <Check size={15} /> No account required
            </span>
            <span>
              <Check size={15} /> No credit card
            </span>
            <span>
              <Check size={15} /> Built for SaaS founders
            </span>
          </div>
        </div>
      </section>
      <section className="container demonstration" id="strategy-example">
        <div className="section-heading">
          <div>
            <p className="section-kicker">
              Less guesswork. A better first move.
            </p>
            <h2>
              A strategy you can
              <br />
              actually put to work.
            </h2>
          </div>
          <p>
            Not another list of marketing channels.
            <br />A starting point, a small experiment, and a reason to keep
            going — or change course.
          </p>
        </div>
        <article className="strategy-demonstration">
          <div className="demo-title">
            <div>
              <span className="demo-product">L</span>
              <div>
                <h3>Launchboard</h3>
                <p>Onboarding analytics SaaS · Illustrative example</p>
              </div>
            </div>
            <span className="badge inferred">
              Hypothesis — needs validation
            </span>
          </div>
          <div className="demo-main">
            <div className="demo-recommendation">
              <p className="section-kicker">Your recommended first move</p>
              <h3>
                Find the founders
                <br />
                whose trials get stuck.
              </h3>
              <p>
                Start with small, founder-led SaaS teams that have active trials
                but don’t know why users fail to activate.
              </p>
              <span className="demo-effort">
                45 minutes <span>·</span> No paid tools assumed
              </span>
            </div>
            <div className="demo-steps">
              <div>
                <span>01</span>
                <div>
                  <h4>Make it small.</h4>
                  <p>
                    Choose two relevant founders you can already reach. Ask
                    about the last trial that went quiet.
                  </p>
                </div>
              </div>
              <div>
                <span>02</span>
                <div>
                  <h4>Learn something that matters.</h4>
                  <p>
                    Look for an urgent onboarding problem and an agreed next
                    buying step, not likes or free signups.
                  </p>
                </div>
              </div>
              <div>
                <span>03</span>
                <div>
                  <h4>Let the evidence decide.</h4>
                  <p>
                    If the problem is low priority, narrow the audience before
                    contacting more people.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="demo-footer">
            <p>
              Assumes access to relevant founders. No prospects discovered. Two
              contacts is a planning target, not a forecast.
            </p>
            <Link href="/preview">
              Read the sample strategy <ArrowUpRight size={18} />
            </Link>
          </div>
        </article>
      </section>
      <section className="container editorial-section">
        <div className="section-heading">
          <h2>
            From “who needs this?”
            <br />
            to “here’s my next move.”
          </h2>
          <p>
            For solo founders and small SaaS teams
            <br />
            with a product — and customers to find.
          </p>
        </div>
        <div className="outcome-list">
          {[
            [
              "01",
              "Find your people.",
              "Three prioritized customer profiles. Their likely problems, buying motivations, and the trade-offs that make one a better starting point.",
            ],
            [
              "02",
              "Start the right conversation.",
              "Positioning and outreach you can adapt. Clear experiments with concrete actions, assumptions, and decisions to make.",
            ],
            [
              "03",
              "Make the next 30 days count.",
              "A practical weekly sales plan. Add your time, budget, and traction to refine it around the business you’re actually building.",
            ],
          ].map(([number, title, body]) => (
            <div key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="trust-section">
        <div className="container trust-grid">
          <div>
            <p className="section-kicker">Useful advice starts with honesty.</p>
            <h2>
              Evidence where we have it.
              <br />
              <span>Questions where we don’t.</span>
            </h2>
          </div>
          <div>
            <p>
              Your website tells part of the story. Your context makes it
              sharper. FirstCustomers keeps website-supported information,
              founder answers, hypotheses, and unknowns distinct.
            </p>
            <p>
              Recommendations are experiments to test. We don’t invent market
              demand, customer results, competitor research, or real prospects.
            </p>
            <a href="#generate" className="text-link">
              Find your next move <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
