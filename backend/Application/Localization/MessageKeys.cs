namespace Application.Localization
{
    /// <summary>
    /// Message key constants used in Application Layer (Validators, Handlers).
    /// These must match the keys defined in the .resx resource files exactly.
    /// </summary>
    public static class MessageKeys
    {
        public static class Validation
        {
            public const string Field_Required = "Field_Required";
            public const string Field_MaxLength = "Field_MaxLength";
            public const string Field_MinLength = "Field_MinLength";
            public const string Field_InvalidEmail = "Field_InvalidEmail";
            public const string Field_PasswordsMustMatch = "Field_PasswordsMustMatch";
            public const string Field_InvalidPassword = "Field_InvalidPassword";
            public const string Field_InvalidUsername = "Field_InvalidUsername";
            public const string Field_InvalidNameFormat = "Field_InvalidNameFormat";
            public const string Field_InvalidDescriptionFormat = "Field_InvalidDescriptionFormat";
            public const string Field_InvalidImageExtension = "Field_InvalidImageExtension";
            public const string Field_ImageSizeExceeded = "Field_ImageSizeExceeded";
            public const string Field_InvalidPdfExtension = "Field_InvalidPdfExtension";
            public const string Field_PdfSizeExceeded = "Field_PdfSizeExceeded";
            public const string Field_InvalidImageFileType = "Field_InvalidImageFileType";
            public const string Field_ProfileImageSizeExceeded = "Field_ProfileImageSizeExceeded";
            public const string Field_UserId_Required = "Field_UserId_Required";
            public const string Field_CourseId_Required = "Field_CourseId_Required";
            public const string Field_DepartmentId_Invalid = "Field_DepartmentId_Invalid";
            public const string Field_SectionName_MaxLength = "Field_SectionName_MaxLength";
            public const string Field_SectionDescription_MaxLength = "Field_SectionDescription_MaxLength";
            public const string Field_DepartmentName_MaxLength = "Field_DepartmentName_MaxLength";
            public const string Field_DepartmentDescription_MaxLength = "Field_DepartmentDescription_MaxLength";
        }

        public static class Common
        {
            public const string Course_NotFound = "Course_NotFound";
            public const string Course_InstructorNotFound = "Course_InstructorNotFound";
            public const string Course_InstructorIdRequired = "Course_InstructorIdRequired";
            public const string Course_InstructorWithIdNotFound = "Course_InstructorWithIdNotFound";
            public const string Course_InstructorDepartmentMismatch = "Course_InstructorDepartmentMismatch";
            public const string Course_HasActiveEnrollments = "Course_HasActiveEnrollments";
            public const string Course_AccessDenied = "Course_AccessDenied";
            public const string Department_NotFound = "Department_NotFound";
            public const string Department_HasActiveDependencies = "Department_HasActiveDependencies";
            public const string Instructor_NotFound = "Instructor_NotFound";
            public const string Instructor_AlreadyExists = "Instructor_AlreadyExists";
            public const string Instructor_HasActiveCourses = "Instructor_HasActiveCourses";
            public const string Instructor_UserNotFound = "Instructor_UserNotFound";
            public const string Section_NotFound = "Section_NotFound";
            public const string Section_AccessDenied = "Section_AccessDenied";
            public const string Student_NotFound = "Student_NotFound";
            public const string Students_NotFound = "Students_NotFound";
            public const string Student_AlreadyExists = "Student_AlreadyExists";
            public const string Enrollment_AlreadyExists = "Enrollment_AlreadyExists";
            public const string Enrollment_NotFound = "Enrollment_NotFound";
            public const string Auth_InvalidCredentials = "Auth_InvalidCredentials";
            public const string Auth_EmailNotConfirmed = "Auth_EmailNotConfirmed";
            public const string Auth_AccountCreated = "Auth_AccountCreated";
            public const string Auth_EmailConfirmed = "Auth_EmailConfirmed";
            public const string Auth_EmailAlreadySent = "Auth_EmailAlreadySent";
            public const string Auth_EmailSent = "Auth_EmailSent";
            public const string Auth_LoginSuccess = "Auth_LoginSuccess";
            public const string Auth_TokenRefreshed = "Auth_TokenRefreshed";
            public const string Auth_LoggedOut = "Auth_LoggedOut";
            public const string Auth_LoggedOutAll = "Auth_LoggedOutAll";
            public const string Auth_InvalidRefreshToken = "Auth_InvalidRefreshToken";
            public const string Auth_UserNotFound = "Auth_UserNotFound";
            public const string Auth_EmailNotConfigured = "Auth_EmailNotConfigured";
            public const string Auth_EmailAlreadyConfirmed = "Auth_EmailAlreadyConfirmed";
            public const string Auth_InvalidConfirmationToken = "Auth_InvalidConfirmationToken";
            public const string Auth_EmailRequired = "Auth_EmailRequired";
            public const string Auth_EmailNotFoundPrivacy = "Auth_EmailNotFoundPrivacy";
            public const string Auth_UserAlreadyExists = "Auth_UserAlreadyExists";
            public const string Auth_RegistrationError = "Auth_RegistrationError";
            public const string Auth_PasswordResetSuccess = "Auth_PasswordResetSuccess";
            public const string Auth_SessionExpired = "Auth_SessionExpired";
            public const string Profile_UserNotFound = "Profile_UserNotFound";
            public const string Profile_UsersNotFound = "Profile_UsersNotFound";
        }
        
        public static class Exception
        {
            public const string NotFound = "Exception_NotFound_Generic";
            public const string Unauthorized = "Exception_Unauthorized";
            public const string InvalidInput = "Exception_InvalidInput";
            public const string Concurrency = "Exception_Concurrency";
            public const string DatabaseUpdate = "Exception_DatabaseUpdate";
            public const string Database = "Exception_Database";
            public const string InvalidOperation = "Exception_InvalidOperation";
            public const string Unexpected = "Exception_Unexpected";
        }
    }
}
