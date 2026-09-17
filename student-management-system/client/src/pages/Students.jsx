import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';

import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import AttendanceBadge from '../components/AttendanceBadge.jsx';
import LoadingState, { Spinner } from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StudentFormModal from '../components/StudentFormModal.jsx';
import StudentDetailsModal from '../components/StudentDetailsModal.jsx';
import { useToast } from '../components/Toast.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { deleteStudent, getStudentFilters, getStudents } from '../services/studentService.js';
import { getErrorMessage } from '../services/api.js';
import { formatCgpa } from '../utils/format.js';

const PAGE_SIZE = 10;

// Each option becomes ?sortBy=...&order=... on the API request
const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'cgpa:desc', label: 'CGPA: high to low' },
  { value: 'cgpa:asc', label: 'CGPA: low to high' },
  { value: 'age:asc', label: 'Age: youngest first' },
  { value: 'age:desc', label: 'Age: oldest first' },
  { value: 'name:asc', label: 'Name: A to Z' },
];

export default function Students() {
  const toast = useToast();

  // Data from the API
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [filterOptions, setFilterOptions] = useState({ branches: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search, filters, sorting and paging
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedSearch = useDebounce(search);

  // Modals
  const [formStudent, setFormStudent] = useState(null); // null = closed, {} = add, student = edit
  const [viewStudentId, setViewStudentId] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const hasFilters = Boolean(search || branch || city);

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await getStudentFilters();
      setFilterOptions(response.data);
    } catch {
      // The table shows the error message; the filter dropdowns can stay empty
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Fetch students whenever the search, filters, sort or page change
  useEffect(() => {
    let ignore = false; // ignore responses from older requests
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
  }

  // Changing a filter always goes back to page 1
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

      // If we deleted the last student on this page, go back one page
      if (students.length === 1 && page > 1) setPage(page - 1);
      reload();
    } catch (err) {
      toast.error('Could not delete student', getErrorMessage(err));
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
        description="Search, filter and manage student records."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormStudent({})}>
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        }
      />

      <div className="card">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={updateFilter(setSearch)}
              className="input pl-9"
              placeholder="Search by name or student ID..."
              aria-label="Search students"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
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

            <select
              value={sort}
              onChange={updateFilter(setSort)}
              className="input lg:w-48"
              aria-label="Sort students"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {/* Table / loading / error / empty */}
        {loading && students.length === 0 && !error ? (
          <LoadingState message="Loading students..." />
        ) : error ? (
          <ErrorState title="Could not load students" message={error} onRetry={reload} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found."
            description={
              hasFilters
                ? 'Try a different search or clear the filters.'
                : 'Add your first student to get started.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setFormStudent({})}>
                  <Plus className="h-4 w-4" />
                  Add Student
                </button>
              )
            }
          />
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th scope="col" className="table-head">
                      Name
                    </th>
                    <th scope="col" className="table-head">
                      Student ID
                    </th>
                    <th scope="col" className="table-head">
                      Branch
                    </th>
                    <th scope="col" className="table-head">
                      Semester
                    </th>
                    <th scope="col" className="table-head">
                      CGPA
                    </th>
                    <th scope="col" className="table-head">
                      City
                    </th>
                    <th scope="col" className="table-head">
                      Attendance
                    </th>
                    <th scope="col" className="table-head text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student._id} className="transition-colors hover:bg-slate-50/70">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.name} />
                          <div>
                            <p className="font-medium text-slate-900">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-xs">{student.studentId}</td>
                      <td className="table-cell">{student.branch}</td>
                      <td className="table-cell">{student.semester}</td>
                      <td className="table-cell font-medium text-slate-900 tabular-nums">
                        {formatCgpa(student.cgpa)}
                      </td>
                      <td className="table-cell">{student.city}</td>
                      <td className="table-cell">
                        <AttendanceBadge percentage={student.averageAttendance} />
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setViewStudentId(student._id)}
                            title="View"
                            aria-label={`View ${student.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setFormStudent(student)}
                            title="Edit"
                            aria-label={`Edit ${student.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:bg-red-50 hover:text-red-600"
                            onClick={() => setStudentToDelete(student)}
                            title="Delete"
                            aria-label={`Delete ${student.name}`}
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

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {loading && <Spinner className="h-4 w-4 text-brand-600" />}
                <p>
                  Showing{' '}
                  <span className="font-medium text-slate-900">
                    {firstShown}–{lastShown}
                  </span>{' '}
                  of <span className="font-medium text-slate-900">{pagination.total}</span> students
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary px-3"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="px-2 text-sm text-slate-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary px-3"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
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

      {viewStudentId && (
        <StudentDetailsModal
          studentId={viewStudentId}
          onClose={() => setViewStudentId(null)}
          onEdit={(student) => {
            setViewStudentId(null);
            setFormStudent(student);
          }}
        />
      )}

      {studentToDelete && (
        <ConfirmDialog
          title="Are you sure you want to delete this student?"
          loading={deleting}
          confirmLabel="Delete student"
          onConfirm={handleDelete}
          onCancel={() => setStudentToDelete(null)}
          message={
            <>
              <p>
                <span className="font-medium text-slate-900">{studentToDelete.name}</span> (
                <span className="font-mono text-xs">{studentToDelete.studentId}</span>) and their attendance
                records will be deleted from your database and from the professor database.
              </p>
              <p>This cannot be undone.</p>
            </>
          }
        />
      )}
    </>
  );
}
