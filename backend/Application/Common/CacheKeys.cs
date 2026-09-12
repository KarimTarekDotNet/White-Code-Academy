namespace Application.Common
{
    public static class CacheKeys
    {
        public static string Idempotency(string id) => $"idempotency:{id}";
        public static string IdempotencyResponseKey(string id) => $"idempotency:response:{id}";
        public static string IdempotencyLockKey(string id) => $"idempotency:lock:{id}";

        // ── Courses ──────────────────────────────────────────────────────────
        public static string Course(Guid id) => $"course:{id}";
        public static string CoursesPrefix() => "courses";
        public static string SearchCourses(QueryParameters query)
            => $"courses:page{query.PageNumber}:size:{query.PageSize}:sort:" +
               $"{query.SortBy?.Trim().ToLowerInvariant()}:search:{query.WordForSearch?.Trim().ToLowerInvariant()}";

        // ── Departments ──────────────────────────────────────────────────────
        public static string Department(Guid id) => $"department:{id}";
        public static string DepartmentsPrefix() => "departments";
        public static string SearchDepartments(QueryParameters query)
            => $"departments:page{query.PageNumber}:size:{query.PageSize}:sort:" +
               $"{query.SortBy?.Trim().ToLowerInvariant()}:search:{query.WordForSearch?.Trim().ToLowerInvariant()}";

        // ── Instructors ──────────────────────────────────────────────────────
        public static string Instructor(Guid id) => $"instructor:{id}";
        public static string InstructorsPrefix() => "instructors";
        public static string SearchInstructors(QueryParameters query)
            => $"instructors:page{query.PageNumber}:size:{query.PageSize}:sort:" +
               $"{query.SortBy?.Trim().ToLowerInvariant()}:search:{query.WordForSearch?.Trim().ToLowerInvariant()}";

        // ── Students ─────────────────────────────────────────────────────────
        public static string Student(Guid id) => $"student:{id}";
        public static string StudentsPrefix() => "students";
        public static string SearchStudents(QueryParameters query)
            => $"students:page{query.PageNumber}:size:{query.PageSize}:sort:" +
               $"{query.SortBy?.Trim().ToLowerInvariant()}:search:{query.WordForSearch?.Trim().ToLowerInvariant()}";

        public static string StudentByUserId(string userId) => $"student:user:{userId}";

        // ── Sections ─────────────────────────────────────────────────────────
        public static string Section(Guid id) => $"section:{id}";
        public static string SectionsByCoursePrefix(Guid courseId) => $"sections:course:{courseId}";

        // ── Enrollments ──────────────────────────────────────────────────────
        public static string EnrollmentsByCoursePrefix(Guid courseId) => $"enrollments:course:{courseId}";
        public static string EnrollmentsByStudentPrefix(Guid studentId) => $"enrollments:student:{studentId}";

        // ── Profile ──────────────────────────────────────────────────────
        public static string Profile(string userId) => $"profile:{userId}";

        // ── Authentication / Email Verification ──────────────────────────────
        /// <summary>Guards against resend spam — key exists while cooldown is active.</summary>
        public static string EmailVerificationCooldown(string userId) => $"email:verification:cooldown:{userId}";
        public static string ResetPasswordCooldown(string userId) => $"email:reset:cooldown:{userId}";

        /// <summary>Guards against login-token spam — key exists while the active JWT has not expired yet.</summary>
        public static string AuthTokenActive(string userId) => $"auth:token:active:{userId}";

        /// <summary>Tracks the active refresh token hash per user — used to detect if a valid refresh token already exists.</summary>
        public static string RefreshTokenActive(string userId) => $"auth:refresh:active:{userId}";
    }
}