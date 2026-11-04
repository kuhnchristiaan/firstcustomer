export default function Page() {
  return (
    <main className="container py-12">
      <article className="panel mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-semibold">Support</h1>
        <p className="mb-5 text-sm leading-7">
          For a reproducible technical problem, open an issue in the
          FirstCustomers GitHub repository. Include the page, approximate time,
          device/browser, steps and the visible error message.
        </p>
        <p className="mb-5 text-sm leading-7">
          GitHub issues are public: never include passwords, API keys,
          verification/reset links, guest tokens, report contents or personal
          account information. For a private data-access/deletion request, first
          ask the maintainer to provide a private contact channel without
          posting the private details.
        </p>
        <p className="mb-5 text-sm leading-7">
          A dedicated private support inbox has not yet been configured. This is
          a beta support route; no response-time commitment is offered.
        </p>
        <a
          className="text-teal-800 underline"
          href="https://github.com/kuhnchristiaan/firstcustomer/issues"
        >
          Open FirstCustomers support issues
        </a>
      </article>
    </main>
  );
}
