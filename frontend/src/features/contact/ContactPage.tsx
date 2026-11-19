import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { usePageMeta } from '../../lib/pageMeta';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Field';
import { submitContact } from './contactApi';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(160, 'Name must be 160 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.').max(320, 'Email is too long.'),
  subject: z.string().trim().min(1, 'Enter a subject.').max(200, 'Subject must be 200 characters or fewer.'),
  message: z
    .string()
    .trim()
    .min(1, 'Enter your message.')
    .max(4000, 'Message must be 4000 characters or fewer.'),
});

type ContactValues = z.infer<typeof contactSchema>;

/**
 * Public contact form. Submissions are stored in the academy's message
 * inbox (there is no SMTP integration), so the acknowledgement never
 * promises an email reply or a response time. On success the visitor lands
 * on the dedicated thank-you page.
 */
export function ContactPage() {
  usePageMeta({
    title: 'Contact',
    description:
      'Contact the CodePath-Academy team about courses, learning paths, or your account. Messages are recorded for administrator review.',
  });
  const navigate = useNavigate();
  const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });

  const contactMutation = useMutation({
    mutationFn: submitContact,
    onSuccess: (data) => {
      navigate('/contact/thank-you', { replace: true, state: { message: data.message } });
    },
  });

  const submit = form.handleSubmit((values) => {
    contactMutation.reset();
    contactMutation.mutate(values);
  });

  return (
    <section aria-labelledby="contact-heading" className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Get in touch</p>
        <h1 id="contact-heading" className="mt-2 text-2xl font-bold text-navy-950">
          Contact the academy
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Send a message about courses, learning paths, or your account. Messages are stored in
          the academy's inbox and reviewed by an administrator.
        </p>

        {contactMutation.error && (
          <Alert tone="danger" className="mt-5">
            {contactMutation.error.message || 'Unable to send your message. Please try again.'}
          </Alert>
        )}

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <Input
            label="Your name"
            autoComplete="name"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Input
            label="Subject"
            error={form.formState.errors.subject?.message}
            {...form.register('subject')}
          />
          <Textarea
            label="Message"
            rows={6}
            maxLength={4000}
            hint={`${4000} characters maximum.`}
            error={form.formState.errors.message?.message}
            {...form.register('message')}
          />
          <Button type="submit" fullWidth loading={contactMutation.isPending}>
            Send message
          </Button>
        </form>

        {contactEmail && (
          <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-ink-muted">
            Prefer email? Write to{' '}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium text-accent-600 underline underline-offset-2"
            >
              {contactEmail}
            </a>
            .
          </p>
        )}

        <p className="mt-4 text-sm text-ink-muted">
          See how we handle your information in the{' '}
          <Link to="/privacy" className="font-medium text-accent-600 underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </Card>
    </section>
  );
}
