import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import Meter from '../components/charts/Meter.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CourseFormModal from '../components/CourseFormModal.jsx';
import { useToast } from '../components/Toast.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { useAnalytics } from '../hooks/useAnalytics.jsx';
import { deleteCourse, getCourses } from '../services/courseService.js';
import { getErrorMessage } from '../services/api.js';
import { LOW_ATTENDANCE_THRESHOLD } from '../utils/constants.js';

function CourseCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="mt-3.5 h-4 w-44" />
      <Skeleton className="mt-2 h-3 w-32" />
      <Skeleton className="mt-5 h-2.5 w-full rounded-[4px]" />
    </div>
  );
}

function CourseCard({ course, focused, onEdit, onDelete }) {
  return (
    <article
      className={`card card-hover flex flex-col p-5 ${focused ? 'ring-2 ring-brand-500/40' : ''}`}
      id={`course-${course.courseId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="badge badge-brand font-mono">{course.courseCode}</span>
        <div className="flex gap-0.5">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onEdit(course)}
            title="Edit course"
            aria-label={`Edit ${course.courseName}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="icon-btn hover:bg-red-50 hover:text-status-critical"
            onClick={() => onDelete(course)}
            title="Remove course"
            aria-label={`Remove ${course.courseName}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-[15px] leading-snug font-semibold text-slate-900">{course.courseName}</h3>
      <p className="mt-1 text-[13px] text-slate-500">{course.faculty}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span>Semester {course.semester}</span>
        <span aria-hidden="true">·</span>
        <span>
          {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
        </span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{course.department}</span>
      </div>

      <div className="mt-5 flex-1 border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between text-[13px]">
          <span className="flex items-center gap-1.5 text-slate-500">
            <Users className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
            {course.enrolled} enrolled
          </span>
          {course.atRisk > 0 && <span className="badge badge-critical">{course.atRisk} at risk</span>}
        </div>

        {course.averageAttendance == null ? (
          <p className="text-[13px] text-slate-400">No attendance recorded yet</p>
        ) : (
          <Meter value={course.averageAttendance} threshold={LOW_ATTENDANCE_THRESHOLD} label="Average attendance" />
        )}
      </div>
    </article>
  );
}

export default function Courses() {
  const toast = useToast();
  const { refresh: refreshAnalytics } = useAnalytics();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedCourseId = searchParams.get('focus');

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedSearch = useDebounce(search);

  const [formCourse, setFormCourse] = useState(null); // null = closed, {} = add, course = edit
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError('');
    getCourses({ search: debouncedSearch })
      .then((response) => {
        if (!ignore) setCourses(response.data);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, reloadKey]);

  // Bring a course opened from global search into view, then drop the highlight
  useEffect(() => {
    if (!focusedCourseId || loading || courses.length === 0) return;

    document.getElementById(`course-${focusedCourseId}`)?.scrollIntoView({ block: 'center' });
    const timer = setTimeout(() => setSearchParams({}, { replace: true }), 2400);
    return () => clearTimeout(timer);
  }, [focusedCourseId, loading, courses.length, setSearchParams]);

  function reload() {
    setReloadKey((key) => key + 1);
    refreshAnalytics();
  }

  function handleSaved() {
    setFormCourse(null);
    reload();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await deleteCourse(courseToDelete._id);
      toast.success(response.message);
      toast.sync(response.sync);
      setCourseToDelete(null);
      reload();
    } catch (err) {
      toast.error('Could not remove course', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Courses"
        description="Every course offered, with live enrolment and attendance."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormCourse({})}>
            <Plus className="h-4 w-4" />
            Add course
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-9"
            placeholder="Search by name, code, faculty or department..."
            aria-label="Search courses"
          />
        </div>
        {!loading && !error && (
          <p className="text-xs text-slate-500">
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
          </p>
        )}
      </div>

      {loading && courses.length === 0 && !error ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState title="Could not load courses" message={error} onRetry={reload} />
        </div>
      ) : courses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BookOpen}
            title="No courses found"
            description={
              search
                ? 'No course matches your search.'
                : 'Add a course so attendance and performance can be tracked against it.'
            }
            action={
              !search && (
                <button type="button" className="btn btn-primary" onClick={() => setFormCourse({})}>
                  <Plus className="h-4 w-4" />
                  Add course
                </button>
              )
            }
          />
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}
        >
          {courses.map((course) => (
            <CourseCard
              key={course._id}
              course={course}
              focused={course.courseId === focusedCourseId}
              onEdit={setFormCourse}
              onDelete={setCourseToDelete}
            />
          ))}
        </div>
      )}

      {formCourse && (
        <CourseFormModal
          course={formCourse._id ? formCourse : null}
          onClose={() => setFormCourse(null)}
          onSaved={handleSaved}
        />
      )}

      {courseToDelete && (
        <ConfirmDialog
          title="Remove this course?"
          loading={deleting}
          confirmLabel="Remove course"
          loadingLabel="Removing..."
          onConfirm={handleDelete}
          onCancel={() => setCourseToDelete(null)}
          message={
            <>
              <p>
                <span className="font-medium text-slate-900">{courseToDelete.courseName}</span> and all{' '}
                {courseToDelete.enrolled} attendance{' '}
                {courseToDelete.enrolled === 1 ? 'record' : 'records'} for it will be permanently removed.
              </p>
              <p>This action cannot be undone.</p>
            </>
          }
        />
      )}
    </>
  );
}
