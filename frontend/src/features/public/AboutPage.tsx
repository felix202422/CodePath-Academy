import { Card, CardDescription, CardTitle } from '../../components/ui/Card';

/** About page: factual project information only — no unverified claims. */
export function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-navy-950">About CodePath Academy</h1>
      <p className="mt-4 text-ink-muted">
        CodePath Academy is an interactive online technology academy offering structured
        learning paths, practical courses, assessments, and real-world projects across
        software engineering, cybersecurity, networking, and emerging technologies.
      </p>

      <div className="mt-8 space-y-5">
        <Card>
          <CardTitle>How the curriculum is built</CardTitle>
          <CardDescription>
            Course content is imported from the CodePath-Masterclass repository (MIT
            licensed) through a repeatable, audited importer that records the exact source
            commit for every import. Imported lessons are stored by the academy, so your
            learning never depends on GitHub availability.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>How learning works</CardTitle>
          <CardDescription>
            Students request enrollment, administrators review each request, and approved
            students work through modules at their own pace. Progress persists across
            sessions, and assessments are graded on the server — never in the browser.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Project status</CardTitle>
          <CardDescription>
            This platform is under active development and is not yet deployed. Enrollment,
            assessments, and administration features arrive in the phases listed in the
            project implementation register.
          </CardDescription>
        </Card>
      </div>
    </article>
  );
}
