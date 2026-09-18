/*
 * ACADEMIC INTELLIGENCE
 * ---------------------
 * Rule-based insights derived from the records in the database.
 *
 * There is no external model and no prediction here: each rule reads figures
 * that were already computed from real documents and states what they mean in
 * plain language. A rule that has no data to stand on simply produces nothing,
 * which is why the list is short when the database is small.
 */

const SEVERITY_ORDER = { critical: 0, warning: 1, neutral: 2, good: 3 };

const percent = (value) => `${Number(Number(value).toFixed(1))}%`;
const plural = (count, singular, pluralWord = `${singular}s`) => (count === 1 ? singular : pluralWord);

export function buildInsights({ overview, students, atRisk, courseStats, byBranch, threshold }) {
  const insights = [];
  const add = (insight) => insights.push(insight);

  // -- Nothing to analyse yet ------------------------------------------------
  if (overview.totalStudents === 0) {
    return [
      {
        id: 'no-students',
        severity: 'neutral',
        title: 'No student records yet',
        detail: 'Add students to start generating attendance and academic performance insights.',
        link: { label: 'Add a student', to: '/students' },
      },
    ];
  }

  // -- Attendance ------------------------------------------------------------
  if (overview.studentsAtRisk > 0) {
    add({
      id: 'attendance-at-risk',
      severity: 'critical',
      title: `${overview.studentsAtRisk} ${plural(overview.studentsAtRisk, 'student')} below the ${threshold}% attendance threshold`,
      detail:
        overview.studentsAtRisk === 1
          ? `${atRisk[0].name} is averaging ${percent(atRisk[0].averageAttendance)} across ${atRisk[0].coursesTracked} ${plural(atRisk[0].coursesTracked, 'course')}.`
          : `Lowest is ${atRisk[0].name} at ${percent(atRisk[0].averageAttendance)}. These students may become ineligible if attendance does not improve.`,
      metric: `${overview.studentsAtRisk} of ${overview.studentsTracked}`,
      link: { label: 'Review attendance', to: '/attendance' },
    });
  } else if (overview.studentsTracked > 0) {
    add({
      id: 'attendance-clear',
      severity: 'good',
      title: 'Every tracked student meets the attendance requirement',
      detail: `All ${overview.studentsTracked} ${plural(overview.studentsTracked, 'student with attendance records is', 'students with attendance records are')} at or above ${threshold}%.`,
      metric: percent(overview.averageAttendance),
    });
  }

  if (overview.averageAttendance != null) {
    add({
      id: 'attendance-average',
      severity: overview.averageAttendance < threshold ? 'warning' : 'neutral',
      title: `Average attendance is ${percent(overview.averageAttendance)}`,
      detail: `Measured across ${overview.totalRecords} ${plural(overview.totalRecords, 'enrolment record')} in ${overview.coursesWithAttendance} ${plural(overview.coursesWithAttendance, 'course')}.`,
      metric: percent(overview.averageAttendance),
    });
  }

  // Weakest and strongest course — only meaningful once two courses have data
  if (courseStats.length >= 2) {
    const ranked = [...courseStats].sort((a, b) => a.averageAttendance - b.averageAttendance);
    const weakest = ranked[0];
    const strongest = ranked[ranked.length - 1];

    add({
      id: 'course-weakest',
      severity: weakest.averageAttendance < threshold ? 'warning' : 'neutral',
      title: `${weakest.courseName} has the lowest average attendance`,
      detail: `${percent(weakest.averageAttendance)} across ${weakest.enrolled} ${plural(weakest.enrolled, 'student')}${weakest.atRisk > 0 ? `, with ${weakest.atRisk} below ${threshold}%` : ''}.`,
      metric: percent(weakest.averageAttendance),
      link: { label: 'Open course', to: '/courses' },
    });

    if (strongest.courseId !== weakest.courseId) {
      add({
        id: 'course-strongest',
        severity: 'good',
        title: `${strongest.courseName} has the strongest attendance`,
        detail: `${percent(strongest.averageAttendance)} across ${strongest.enrolled} ${plural(strongest.enrolled, 'student')}.`,
        metric: percent(strongest.averageAttendance),
      });
    }
  }

  // Students below the threshold in every course they are enrolled in
  const consistentlyLow = students.filter(
    (student) => student.coursesTracked >= 2 && student.averageAttendance != null && student.averageAttendance < threshold
  );
  if (consistentlyLow.length > 0) {
    add({
      id: 'attendance-persistent',
      severity: 'warning',
      title: `${consistentlyLow.length} ${plural(consistentlyLow.length, 'student has', 'students have')} low attendance across multiple courses`,
      detail: 'A shortfall spread over several courses usually points to disengagement rather than a clash in one subject.',
      metric: String(consistentlyLow.length),
      link: { label: 'View students', to: '/attendance' },
    });
  }

  // -- Academic performance --------------------------------------------------
  const combinedRisk = students.filter(
    (student) => student.cgpa < 7 && student.averageAttendance != null && student.averageAttendance < threshold
  );
  if (combinedRisk.length > 0) {
    add({
      id: 'academic-attention',
      severity: 'critical',
      title: `${combinedRisk.length} ${plural(combinedRisk.length, 'student')} may require academic attention`,
      detail: `Below 7.0 CGPA and under ${threshold}% attendance — the combination that most often precedes a failed semester.`,
      metric: String(combinedRisk.length),
      link: { label: 'Open performance', to: '/performance' },
    });
  }

  if (overview.averageCgpa != null) {
    const highAchievers = students.filter((student) => student.cgpa >= 8).length;
    add({
      id: 'performance-average',
      severity: 'neutral',
      title: `Average academic performance is ${overview.averageCgpa.toFixed(2)} CGPA`,
      detail: `${highAchievers} of ${overview.totalStudents} ${plural(overview.totalStudents, 'student')} (${percent((highAchievers / overview.totalStudents) * 100)}) are at 8.0 or above.`,
      metric: overview.averageCgpa.toFixed(2),
    });
  }

  if (byBranch.length >= 2) {
    const ranked = [...byBranch].sort((a, b) => b.averageCgpa - a.averageCgpa);
    add({
      id: 'branch-leader',
      severity: 'good',
      title: `${ranked[0].branch} leads on academic performance`,
      detail: `${ranked[0].averageCgpa.toFixed(2)} average CGPA across ${ranked[0].students} ${plural(ranked[0].students, 'student')}, ahead of ${ranked[1].branch} at ${ranked[1].averageCgpa.toFixed(2)}.`,
      metric: ranked[0].averageCgpa.toFixed(2),
    });
  }

  // -- Data coverage ---------------------------------------------------------
  const untracked = overview.totalStudents - overview.studentsTracked;
  if (untracked > 0) {
    add({
      id: 'coverage-gap',
      severity: 'neutral',
      title: `${untracked} ${plural(untracked, 'student has', 'students have')} no attendance on record`,
      detail: 'Attendance and risk figures only cover students with at least one enrolment record.',
      metric: `${overview.studentsTracked}/${overview.totalStudents}`,
      link: { label: 'Record attendance', to: '/attendance' },
    });
  }

  if (overview.totalCourses === 0) {
    add({
      id: 'no-courses',
      severity: 'neutral',
      title: 'No courses have been created yet',
      detail: 'Courses are needed before attendance can be recorded against them.',
      link: { label: 'Add a course', to: '/courses' },
    });
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
