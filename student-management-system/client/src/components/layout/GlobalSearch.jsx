import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Search, User } from 'lucide-react';

import useDebounce from '../../hooks/useDebounce.js';
import { getStudents } from '../../services/studentService.js';
import { getCourses } from '../../services/courseService.js';

/*
 * Search across students and courses using the existing list endpoints.
 * Results are grouped, keyboard navigable, and limited to a handful of rows so
 * the panel never becomes a second page.
 */
const MAX_PER_GROUP = 4;

export default function GlobalSearch({ className = '' }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ students: [], courses: [] });
  const [activeIndex, setActiveIndex] = useState(0);

  const debouncedQuery = useDebounce(query, 250);

  // Flat list so the arrow keys can walk across both groups
  const flatResults = [
    ...results.students.map((student) => ({
      key: `student-${student._id}`,
      type: 'student',
      title: student.name,
      subtitle: `${student.studentId} · ${student.branch}`,
      to: `/students/${student._id}`,
    })),
    ...results.courses.map((course) => ({
      key: `course-${course._id}`,
      type: 'course',
      title: course.courseName,
      subtitle: `${course.courseCode} · Semester ${course.semester}`,
      to: `/courses?focus=${encodeURIComponent(course.courseId)}`,
    })),
  ];

  useEffect(() => {
    const term = debouncedQuery.trim();

    if (term.length < 2) {
      setResults({ students: [], courses: [] });
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);

    Promise.all([
      getStudents({ search: term, limit: MAX_PER_GROUP, sortBy: 'name', order: 'asc' }).catch(() => null),
      getCourses({ search: term }).catch(() => null),
    ])
      .then(([studentResponse, courseResponse]) => {
        if (ignore) return;
        setResults({
          students: studentResponse?.data ?? [],
          courses: (courseResponse?.data ?? []).slice(0, MAX_PER_GROUP),
        });
        setActiveIndex(0);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedQuery]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // "/" focuses the search box from anywhere outside a field
  useEffect(() => {
    function handleKeyDown(event) {
      const tag = event.target.tagName;
      if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function choose(result) {
    if (!result) return;
    setOpen(false);
    setQuery('');
    navigate(result.to);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (flatResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flatResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flatResults.length) % flatResults.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(flatResults[activeIndex]);
    }
  }

  const term = debouncedQuery.trim();
  const showPanel = open && term.length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="input pr-10 pl-9"
        placeholder="Search students and courses..."
        aria-label="Search students and courses"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
      />
      {loading ? (
        <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
          /
        </kbd>
      )}

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[22rem] animate-rise overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
        >
          {flatResults.length === 0 && !loading && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No students or courses match “{term}”.
            </p>
          )}

          {results.students.length > 0 && (
            <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Students
            </p>
          )}
          {flatResults.map((result, index) => (
            <div key={result.key}>
              {result.type === 'course' && index > 0 && flatResults[index - 1].type === 'student' && (
                <p className="mt-1 border-t border-slate-100 px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Courses
                </p>
              )}
              {result.type === 'course' && index === 0 && (
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Courses
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(result)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === activeIndex ? 'bg-slate-50' : ''
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {result.type === 'student' ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <BookOpen className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-900">{result.title}</span>
                  <span className="block truncate text-[11px] text-slate-500">{result.subtitle}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
