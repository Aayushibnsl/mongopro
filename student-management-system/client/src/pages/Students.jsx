import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, SlidersHorizontal, Trash2, Users, X } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/Avatar.jsx';
import AttendanceBadge from '../components/AttendanceBadge.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StudentFormModal from '../components/StudentFormModal.jsx';
import { useToast } from '../components/Toast.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { useAnalytics } from '../hooks/useAnalytics.jsx';
import { deleteStudent, getStudentFilters, getStudents } from '../services/studentService.js';
import { getErrorMessage } from '../services/api.js';
import { formatCgpa, getPerformanceStatus } from '../utils/format.js';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'cgpa:desc', label: 'Highest CGPA' },
  { value: 'cgpa:asc', label: 'Lowest CGPA' },
  { value: 'semester:asc', label: 'Semester (low to high)' },
  { value: 'semester:desc', label: 'Semester (high to low)' },
];

export default function Students() {
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh: refreshAnalytics } = useAnalytics();

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [filterOptions, setFilterOptions] = useState({ branches: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search);

  const [formStudent, setFormStudent] = useState(null); // null = closed, {} = add, student = edit
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const hasFilters = Boolean(search || branch || city);

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await getStudentFilters();
      setFilterOptions(response.data);
    } catch {
      // The table surfaces any error; empty dropdowns are an acceptable fallback
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    let ignore = false;
    const [sortBy, order] = sort.split(':');

    setLoading(true);
    setError('');
    getStudents({ search: debouncedSearch, branch, city, sortBy, order, page, limit: PAGE_SIZE })
      .then((response) => {
        if (ignore) return;
        setStudents(response.data);
        setPagination(response.pagination);
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
  }, [debouncedSearch, branch, city, sort, page, reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
    loadFilterOptions();
    refreshAnalytics();
  }

  function updateFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  function clearFilters() {
    setSearch('');
    setBranch('');
    setCity('');
    setPage(1);
  }

  function handleSaved() {
    setFormStudent(null);
    reload();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await deleteStudent(studentToDelete._id);
      toast.success(response.message);
      toast.sync(response.sync);
      setStudentToDelete(null);

      if (students.length === 1 && page > 1) setPage(page - 1);
      reload();
    } catch (err) {
      toast.error('Could not remove student', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const firstShown = pagination.total === 0 ? 0 : (pagination.page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(pagination.page * PAGE_SIZE, pagination.total);

  return (
    <>
      <PageHeader
        title="Students"
        description="Search, review and manage every student enrolled on the platform."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormStudent({})}>
            <Plus className="h-4 w-4" />
            Add student
          </button>
        }
      />

      <div className="card">
        {/* Toolbar */}
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={updateFilter(setSearch)}
                className="input pl-9"
                placeholder="Search by name or roll number..."
                aria-label="Search students"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`btn btn-secondary lg:hidden ${showFilters ? 'bg-slate-50' : ''}`}
                onClick={() => setShowFilters((open) => !open)}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>

              <select
                value={sort}
                onChange={updateFilter(setSort)}
                className="input w-full lg:w-44"
                aria-label="Sort students"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-1 gap-3 sm:grid-cols-2 lg:flex`}>
              <select
                value={branch}
                onChange={updateFilter(setBranch)}
                className="input lg:w-48"
                aria-label="Filter by branch"
              >
                <option value="">All branches</option>
                {filterOptions.branches.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={city}
                onChange={updateFilter(setCity)}
                className="input lg:w-40"
                aria-label="Filter by city"
              >
                <option value="">All cities</option>
                {filterOptions.cities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading && students.length === 0 && !error ? (
          <TableSkeleton rows={8} columns={6} />
        ) : error ? (
          <ErrorState title="Could not load students" message={error} onRetry={reload} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description={
              hasFilters
                ? 'No student matches the current search and filters.'
                : 'Add your first student to begin tracking attendance and academic performance.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setFormStudent({})}>
                  <Plus className="h-4 w-4" />
                  Add student
                </button>
              )
            }
          />
        ) : (
          <>
            <div className={`scroll-x transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <table className="min-w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th scope="col" className="th">
                      Student
                    </th>
                    <th scope="col" className="th">
                      Roll number
                    </th>
                    <th scope="col" className="th">
                      Programme
                    </th>
                    <th scope="col" className="th">
                      Attendance
                    </th>
                    <th scope="col" className="th">
                      Performance
                    </th>
                    <th scope="col" className="th text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((student) => {
                    const standing = getPerformanceStatus(student.cgpa);
                    return (
                      <tr
                        key={student._id}
                        onClick={() => navigate(`/students/${student._id}`)}
                        className="cursor-pointer transition-colors hover:bg-slate-50/70"
                      >
                        <td className="td">
                          <div className="flex items-center gap-3">
                            <Avatar name={student.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{student.name}</p>
                              <p className="truncate text-[11px] text-slate-400">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="td font-mono text-xs text-slate-500">{student.studentId}</td>
                        <td className="td">
                          <p className="text-slate-700">{student.branch}</p>
                          <p className="text-[11px] text-slate-400">Semester {student.semester}</p>
                        </td>
                        <td className="td">
                          <AttendanceBadge percentage={student.averageAttendance} />
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-2.5">
                            <span className="font-medium text-slate-900 tabular-nums">
                              {formatCgpa(student.cgpa)}
                            </span>
                            <span className={`badge ${standing.badge}`}>{standing.label}</span>
                          </div>
                        </td>
                        <td className="td">
                          <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setFormStudent(student)}
                              title="Edit student"
                              aria-label={`Edit ${student.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:bg-red-50 hover:text-status-critical"
                              onClick={() => setStudentToDelete(student)}
                              title="Remove student"
                              aria-label={`Remove ${student.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
              <p className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-medium text-slate-900">
                  {firstShown}–{lastShown}
                </span>{' '}
                of <span className="font-medium text-slate-900">{pagination.total}</span> students
              </p>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1 || loading}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <span className="px-1 text-xs text-slate-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {formStudent && (
        <StudentFormModal
          student={formStudent._id ? formStudent : null}
          cities={filterOptions.cities}
          onClose={() => setFormStudent(null)}
          onSaved={handleSaved}
        />
      )}

      {studentToDelete && (
        <ConfirmDialog
          title="Remove this student?"
          loading={deleting}
          confirmLabel="Remove student"
          loadingLabel="Removing..."
          onConfirm={handleDelete}
          onCancel={() => setStudentToDelete(null)}
          message={
            <>
              <p>
                <span className="font-medium text-slate-900">{studentToDelete.name}</span> (
                <span className="font-mono text-xs">{studentToDelete.studentId}</span>) and all of their
                attendance records will be permanently removed.
              </p>
              <p>This action cannot be undone.</p>
            </>
          }
        />
      )}
    </>
  );
}
