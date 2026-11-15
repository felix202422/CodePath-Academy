import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { AssessmentFormModal } from './AssessmentFormModal';
import { AdminQueryState } from './AdminQueryState';
import { StatusButtons } from './StatusButtons';
import {
  useAdminAssessments,
  useDeleteAssessment,
  useSetAssessmentStatus,
  type AssessmentAdminResponse,
  type ModuleAdminResponse,
} from './adminApi';
import { statusTone } from './statusUi';

interface AssessmentsSectionProps {
  courseId: string;
  /** Modules of this course, for the modal's module picker and row labels. */
  modules: ModuleAdminResponse[];
}

/**
 * Assessment authoring for one course: real question/attempt counts, status
 * controls with the server's publish rules, and an inline delete confirm.
 * The question set locks after the first student attempt — rows then offer
 * archive instead of delete, matching the backend conflict rules.
 */
export function AssessmentsSection({ courseId, modules }: AssessmentsSectionProps) {
  const assessments = useAdminAssessments(courseId);
  const statusMutation = useSetAssessmentStatus();
  const deleteMutation = useDeleteAssessment();
  const [modalAssessmentId, setModalAssessmentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const pendingStatusId = statusMutation.isPending ? statusMutation.variables?.id : undefined;
  const pendingStatusTarget = statusMutation.isPending
    ? statusMutation.variables?.status
    : undefined;
  const mutationError = statusMutation.error ?? deleteMutation.error;

  function confirmDelete(row: AssessmentAdminResponse) {
    setConfirmingDeleteId(null);
    deleteMutation.mutate({ id: row.id, courseId });
  }

  return (
    <section aria-labelledby="assessments-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="assessments-heading" className="text-xl font-semibold text-navy-950">
          Assessments
        </h2>
        <Button size="sm" onClick={() => {
          setModalAssessmentId(null);
          setModalOpen(true);
        }}>
          <Plus className="size-4" aria-hidden="true" />
          Add assessment
        </Button>
      </div>

      {mutationError && <Alert tone="danger">{mutationError.message}</Alert>}

      <AdminQueryState
        query={assessments}
        loadingLabel="Loading assessments…"
        subject="assessments"
      >
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No assessments yet"
              description="Add a quiz or assignment, author its questions, then publish it for enrolled students."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setModalAssessmentId(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add assessment
                </Button>
              }
            />
          ) : (
            <ul className="space-y-4">
              {rows.map((row) => {
                const locked = row.attemptCount > 0;
                const moduleTitle =
                  row.moduleId == null
                    ? null
                    : modules.find((module) => module.id === row.moduleId)?.title ?? 'Module';
                const confirming = confirmingDeleteId === row.id;
                return (
                  <li key={row.id} className="rounded-lg border border-slate-200 bg-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink">{row.title}</h3>
                          <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                          {locked && <Badge tone="warning">Questions locked</Badge>}
                          <Badge tone="neutral">
                            {moduleTitle ? `Module: ${moduleTitle}` : 'Course-level'}
                          </Badge>
                        </div>
                        {row.description && (
                          <p className="mt-1 text-sm text-ink-muted">{row.description}</p>
                        )}
                        <p className="mt-1 text-sm text-ink-muted">
                          {row.questionCount} question{row.questionCount === 1 ? '' : 's'} ·{' '}
                          {row.attemptCount} attempt{row.attemptCount === 1 ? '' : 's'} · pass at{' '}
                          {row.passScorePercent}% · {row.maxAttempts} attempt
                          {row.maxAttempts === 1 ? '' : 's'} allowed
                          {row.timeLimitMinutes != null && ` · ${row.timeLimitMinutes} min`}
                        </p>
                        {row.questionCount === 0 && row.status !== 'PUBLISHED' && (
                          <p className="mt-1 text-xs text-amber-700">
                            Needs at least one question before it can be published.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setModalAssessmentId(row.id);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <StatusButtons
                          current={row.status}
                          disabled={statusMutation.isPending}
                          pendingTarget={
                            pendingStatusId === row.id ? pendingStatusTarget : undefined
                          }
                          onSelect={(status) => statusMutation.mutate({ id: row.id, status })}
                        />
                        {confirming ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-sm text-ink-muted">Delete this assessment?</span>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={deleteMutation.isPending}
                              onClick={() => confirmDelete(row)}
                            >
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmingDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={locked}
                            title={
                              locked
                                ? 'Students have attempted this assessment — archive it instead of deleting.'
                                : undefined
                            }
                            onClick={() => setConfirmingDeleteId(row.id)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        }
      </AdminQueryState>

      {modalOpen && (
        <AssessmentFormModal
          courseId={courseId}
          assessmentId={modalAssessmentId}
          modules={modules}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}
