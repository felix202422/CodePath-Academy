import { ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import type { CourseLevel, CourseSummary } from './catalogApi';

const LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const LEVEL_TONE: Record<CourseLevel, BadgeTone> = {
  BEGINNER: 'success',
  INTERMEDIATE: 'info',
  ADVANCED: 'warning',
};

interface CoursePhoto {
  src: string;
  alt: string;
}

const PHOTOS = {
  circuitBoard: {
    src: '/images/courses/circuit-board.webp',
    alt: 'Close-up photograph of a computer circuit board and electronic components.',
  },
  codingLaptop: {
    src: '/images/courses/coding-laptop.webp',
    alt: 'Photograph of a laptop displaying source code on a desk.',
  },
  codeScreen: {
    src: '/images/courses/code-screen.webp',
    alt: 'Photograph of a computer monitor showing code in an editor.',
  },
  webInterface: {
    src: '/images/courses/web-interface.webp',
    alt: 'Photograph of source code in a programming editor with an AI actions menu visible.',
  },
  networkCables: {
    src: '/images/courses/network-cables.webp',
    alt: 'Photograph of network cabling and equipment in a data center.',
  },
  serverRacks: {
    src: '/images/courses/server-racks.webp',
    alt: 'Photograph of open server racks and data-center equipment.',
  },
  mobileInterface: {
    src: '/images/courses/mobile-interface.webp',
    alt: 'Photograph of a hand holding a smartphone with a blank screen.',
  },
  securityLock: {
    src: '/images/courses/security-lock.webp',
    alt: 'Photograph of a padlock resting on a computer keyboard.',
  },
} satisfies Record<string, CoursePhoto>;

const COURSE_PHOTOS: Record<string, CoursePhoto> = {
  'computer-foundations': PHOTOS.circuitBoard,
  'programming-fundamentals': PHOTOS.codingLaptop,
  'developer-tools': PHOTOS.codeScreen,
  'java-programming': PHOTOS.webInterface,
  'data-structures-and-algorithms': PHOTOS.codeScreen,
  'internet-and-web-foundations': PHOTOS.networkCables,
  'html-and-css': PHOTOS.webInterface,
  'javascript-and-typescript': PHOTOS.codeScreen,
  'frontend-engineering': PHOTOS.webInterface,
  'database-engineering': PHOTOS.serverRacks,
  'backend-engineering': PHOTOS.serverRacks,
  'mobile-development': PHOTOS.mobileInterface,
  'software-engineering-and-architecture': PHOTOS.codingLaptop,
  'testing-and-quality': PHOTOS.codeScreen,
  'application-security': PHOTOS.securityLock,
  'devops-and-infrastructure': PHOTOS.networkCables,
  'cloud-and-production': PHOTOS.serverRacks,
  'advanced-engineering': PHOTOS.circuitBoard,
  'professional-development': PHOTOS.codingLaptop,
  'project-laboratory': PHOTOS.webInterface,
};

const PATH_PHOTOS: Record<string, CoursePhoto> = {
  'software-engineering': PHOTOS.codingLaptop,
  'frontend-development': PHOTOS.webInterface,
  'backend-development': PHOTOS.serverRacks,
  'database-engineering': PHOTOS.serverRacks,
  'mobile-development': PHOTOS.mobileInterface,
  cybersecurity: PHOTOS.securityLock,
  'devops-and-cloud': PHOTOS.networkCables,
};
const DEFAULT_PHOTO = PHOTOS.codingLaptop;

/** Catalog card for one published course, with a real, locally bundled photo. */
export function CourseCard({
  course,
  isStartHere = false,
  isFavorite,
  onToggleFavorite,
}: {
  course: CourseSummary;
  isStartHere?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
}) {
  const photo = COURSE_PHOTOS[course.slug] ?? PATH_PHOTOS[course.pathSlug] ?? DEFAULT_PHOTO;

  return (
    <Card className="group flex h-full flex-col overflow-hidden !p-0 transition-all duration-300 ease-out hover:-translate-y-2 hover:border-accent-400 hover:ring-2 hover:ring-accent-500/30 hover:shadow-2xl hover:shadow-accent-700/20 focus-within:-translate-y-2 focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-500/30 focus-within:shadow-2xl motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative isolate flex h-36 items-end overflow-hidden bg-gradient-to-br from-navy-900 via-accent-700 to-violet-600 p-4">
        <img
          src={photo.src}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-focus-within:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-navy-950/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-violet-600/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        />
        <button
          type="button"
          aria-label={`${isFavorite ? 'Remove' : 'Add'} ${course.title} ${isFavorite ? 'from' : 'to'} favorites`}
          aria-pressed={isFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() => onToggleFavorite(course.slug)}
          className={`absolute top-3 right-3 z-20 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/60 shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white hover:text-danger hover:shadow-lg active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none ${
            isFavorite ? 'bg-white text-danger' : 'bg-navy-950/50 text-white'
          }`}
        >
          <Heart
            className={`size-5 transition-transform duration-200 ${
              isFavorite ? 'scale-105 fill-current' : 'fill-none group-hover:scale-110'
            }`}
            aria-hidden="true"
          />
        </button>
        <div className="relative z-10 max-w-[75%]">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase">
            Learning path
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-white">
            {course.pathName}
          </p>
        </div>
        {isStartHere && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold tracking-wide text-accent-700 shadow-sm uppercase">
            Start here
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={LEVEL_TONE[course.level]}>{LEVEL_LABEL[course.level]}</Badge>
          <Badge>{course.pathName}</Badge>
        </div>
        <CardTitle className="mt-3 min-h-12 leading-6">
          <Link
            to={`/courses/${course.slug}`}
            className="transition-colors duration-200 hover:text-accent-700 focus-visible:text-accent-700"
          >
            {course.title}
          </Link>
        </CardTitle>
        <CardDescription className="mt-2 line-clamp-3 flex-1 leading-5">
          {course.summary}
        </CardDescription>
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-ink-muted">Published course</span>
          <Link
            to={`/courses/${course.slug}`}
            className="group/view inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700 ring-1 ring-inset ring-accent-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-600 hover:text-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 motion-reduce:transform-none motion-reduce:transition-none"
          >
            View course
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover/view:translate-x-1 group-focus-visible/view:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </Card>
  );
}
