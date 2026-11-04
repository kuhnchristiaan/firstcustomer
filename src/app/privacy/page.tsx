export default function Page() {
  return (
    <main className="container py-12">
      <article className="legal-page mx-auto">
        <h1 className="mb-6 text-3xl font-semibold">Privacy and data use</h1>
        <p className="mb-5 text-sm leading-7">
          FirstCustomers processes the public website URL you submit, fetched
          page content and the founder context you choose to provide to generate
          a sales strategy. Please submit only websites you are authorised to
          analyse and avoid entering personal, confidential or sensitive
          information in report inputs.
        </p>
        <p className="mb-5 text-sm leading-7">
          Website evidence and founder context are sent to OpenAI for
          generation. Reports, source evidence and account records are stored
          using Neon; the app is hosted on Vercel. Cloudflare Turnstile receives
          verification data for bot protection. These providers process data
          under their own policies.
        </p>
        <p className="mb-5 text-sm leading-7">
          Accounts use your email address and name. Authentication and guest
          access use cookies. Guest tokens are stored hashed in the application
          database; the browser cookie controls guest report access. Network
          addresses are used for abuse prevention through rotating keyed hashes
          and usage limits. The application also stores aggregate funnel counts
          and limited diagnostic events.
        </p>
        <p className="mb-5 text-sm leading-7">
          Guest access expires, normally after 24 hours; expiry does not
          guarantee immediate deletion of underlying records. Cleanup depends on
          operator scheduling. Saved account reports and previous revisions
          remain stored for persistent access. There is currently no
          self-service account or report deletion control.
        </p>
        <p className="mb-5 text-sm leading-7">
          Use the Support page to ask about data access or deletion. Do not post
          report contents, passwords, tokens or personal account details in
          public GitHub issues. This notice describes the beta implementation;
          it does not promise specific retention periods or provider data-use
          settings that have not been verified.
        </p>
      </article>
    </main>
  );
}
