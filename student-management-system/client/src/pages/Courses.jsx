import { useEffect, useState } from 'react';
import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import PageHeader from '../components/PageHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CourseFormModal from '../components/CourseFormModal.jsx';
import { useToast } from '../components/Toast.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { deleteCourse, getCourses } from '../services/courseService.js';
import { getErrorMessage } from '../services/api.js';

export default function Courses() {
  const toast = useToast();

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

  const reload = () => setReloadKey((key) => key + 1);

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
      toast.error('Could not delete course', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Courses"
        description="Manage the courses offered in each semester."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormCourse({})}>
            <Plus className="h-4 w-4" />
            Add Course
          </button>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Search by name, code, faculty..."
              aria-label="Search courses"
            />
          </div>
          {!loading && !error && (
            <p className="text-sm text-slate-500">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            </p>
          )}
        </div>

        {loading && courses.length === 0 && !error ? (
          <LoadingState message="Loading courses..." />
        ) : error ? (
          <ErrorState title="Could not load courses" message={error} onRetry={reload} />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses found."
            description={search ? 'Try a different search term.' : 'Add your first course to get started.'}
            action={
              !search && (
                <button type="button" className="btn btn-primary" onClick={() => setFormCourse({})}>
                  <Plus className="h-4 w-4" />
                  Add Course
                </button>
              )
            }
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="table-head">
                    Course Code
                  </th>
                  <th scope="col" className="table-head">
                    Course Name
                  </th>
                  <th scope="col" className="table-head">
                    Credits
                  </th>
                  <th scope="col" className="table-head">
                    Faculty
                  </th>
                  <th scope="col" className="table-head">
                    Semester
                  </th>
                  <th scope="col" className="table-head">
                    Department
                  </th>
                  <th scope="col" className="table-head text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <tr key={course._id} className="transition-colors hover:bg-slate-50/70">
                    <td className="table-cell">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                        {course.courseCode}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-slate-900">{course.courseName}</p>
                      <p className="font-mono text-xs text-slate-500">{course.courseId}</p>
                    </td>
                    <td className="table-cell tabular-nums">{course.credits}</td>
                    <td className="table-cell">{course.faculty}</td>
                    <td className="table-cell">{course.semester}</td>
                    <td className="table-cell">{course.department}</td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setFormCourse(course)}
                          title="Edit"
                          aria-label={`Edit ${course.courseName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:bg-red-50 hover:text-red-600"
                          onClick={() => setCourseToDelete(course)}
                          title="Delete"
                          aria-label={`Delete ${course.courseName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formCourse && (
        <CourseFormModal
          course={formCourse._id ? formCourse : null}
          onClose={() => setFormCourse(null)}
          onSaved={handleSaved}
        />
      )}

      {courseToDelete && (
        <ConfirmDialog
          title="Are you sure you want to delete this course?"
          loading={deleting}
          confirmLabel="Delete course"
          onConfirm={handleDelete}
          onCancel={() => setCourseToDelete(null)}
          message={
            <>
              <p>
                <span className="font-medium text-slate-900">{courseToDelete.courseName}</span> (
                <span className="font-mono text-xs">{courseToDelete.courseId}</span>) and all attendance
                records for this course will be deleted from your database and from the professor database.
              </p>
              <p>This cannot be undone.</p>
            </>
          }
        />
      )}
    </>
  );
}
