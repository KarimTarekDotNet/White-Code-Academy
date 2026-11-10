# WhiteCodeAcademy

WhiteCodeAcademy is a modern educational platform designed to provide a clear, focused learning experience for programming education. The platform offers structured courses, progress tracking, and a clean interface optimized for learning.

## Features

- **Clear Curriculum**: Structured learning paths with progressive difficulty
- **Focused Learning**: Minimal distractions, maximum concentration on learning content
- **Visible Progress**: Track your advancement through courses and lessons
- **Multi-role Support**: Students, instructors, and administrators each have tailored experiences
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Bilingual Interface**: Full support for both Arabic and English languages
- **Secure Authentication**: Email verification, password reset, and role-based access control

## Technology Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and development server
- **CSS3** - Custom styling with CSS variables for theming
- **Lucide React** - Beautiful, consistent icons

### Backend
- **.NET 10** - Robust, high-performance framework
- **ASP.NET Core Web API** - RESTful API development
- **Clean Architecture** - Separation of concerns with CQRS pattern
- **MediatR** - Mediator pattern implementation
- **Entity Framework Core** - ORM for data access
- **Redis** - Caching and session management
- **SQL Server** - Primary database
- **Hangfire** - Background job processing
- **ClamAV** - Antivirus scanning for file uploads
- **FFMpegCore** - Video processing and thumbnail generation

## Getting Started

### Prerequisites
- Node.js 18+ (for frontend)
- .NET 10 SDK (for backend)
- SQL Server 2019+
- Redis 6+
- ClamAV (for file scanning)
- FFmpeg (for video processing)

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Restore NuGet packages
dotnet restore

# Apply database migrations
dotnet ef database update --startup-project API --project Infrastructure

# Run the application
dotnet run --project API --launch-profile https
```

## API Documentation

The backend API is fully documented using Swagger/OpenAPI. Once the backend is running, access the API documentation at:
- **Local**: `https://localhost:7045/swagger`
- **Documentation File**: See `backend/DOCUMENTATION.md` for comprehensive API reference

## Key API Endpoints

### Authentication
- `POST /api/authentication/login` - User login
- `POST /api/authentication/register` - User registration
- `POST /api/authentication/refresh` - Token refresh
- `POST /api/authentication/logout` - User logout
- `POST /api/authentication/logout-all` - Logout from all devices

### Email Verification
- `GET /api/emailverification/confirm-email` - Confirm email with token
- `POST /api/emailverification/resend-email-confirmation` - Resend confirmation email

### Password Management
- `POST /api/password/reset-password` - Request password reset
- `GET /api/password/confirm-reset-password` - Confirm password reset
- `POST /api/password/resend-reset-password` - Resend password reset email

### Course Management
- `GET /api/course` - Get paginated course list
- `GET /api/course/{id}` - Get course by ID
- `POST /api/course` - Create new course (Admin/Instructor)
- `PUT /api/course/{id}` - Update course (Admin/Instructor)
- `DELETE /api/course/{id}` - Delete course (Admin/Instructor)

### Department Management
- `GET /api/department` - Get paginated department list
- `GET /api/department/{id}` - Get department by ID
- `POST /api/department` - Create department (Admin only)
- `PUT /api/department/{id}` - Update department (Admin only)
- `DELETE /api/department/{id}` - Delete department (Admin only)

### Section/Lesson Management
- `GET /api/section/by-course/{courseId}` - Get sections for a course
- `POST /api/section` - Create new section (Admin/Instructor)
- `PUT /api/section/{id}` - Update section (Admin/Instructor)
- `DELETE /api/section/{id}` - Delete section (Admin/Instructor)

### Enrollment
- `GET /api/enrollment/by-course/{courseId}` - Get enrollments for course
- `GET /api/enrollment/by-student/{studentId}` - Get enrollments for student
- `POST /api/enrollment/{courseId}` - Enroll in course (Student)
- `DELETE /api/enrollment` - Remove enrollment (Admin)

### User Management
- `GET /api/profile` - Get current user profile
- `PATCH /api/profile` - Update user profile
- `GET /api/student/me` - Get current student profile
- `POST /api/student` - Register as student (User role)
- `GET /api/instructor` - Get instructors (Admin only)
- `POST /api/instructor` - Assign instructor role (Admin only)
- `DELETE /api/instructor/{id}` - Remove instructor (Admin only)

## Architecture Overview

```
API Layer          →  Controllers (thin, dispatch via MediatR)
Application Layer  →  Handlers (CQRS Commands/Queries), DTOs, Validators, Interfaces
Infrastructure     →  EF Core, Redis, Identity, File Storage, Email, ClamAV
Domain             →  Entities, Enums, Exceptions
```

### Key Libraries
- MediatR · CQRS pattern implementation
- AutoMapper · Object-object mapping
- FluentValidation · Validation pipeline
- StackExchange.Redis · Redis caching
- FFMpegCore · Video processing
- ClamAV · Antivirus scanning
- Serilog · Structured logging
- Hangfire · Background job processing

## Design Principles

### 1. Clarity Over Cleverness
Every interface element serves a clear educational purpose. Decorative elements are minimized to reduce cognitive load.

### 2. Progressive Disclosure
Advanced features are available but not overwhelming. Users discover functionality as they need it.

### 3. Consistent Feedback
All user actions provide clear, immediate feedback through visual cues, notifications, or status updates.

### 4. Accessibility First
The platform follows WCAG guidelines ensuring usability for people with diverse abilities.

### 5. Performance Conscious
Assets are optimized, lazy loading is implemented, and animations are performant.

## Localization

The platform supports both Arabic (ar) and English (en) languages through the `Accept-Language` HTTP header. All user-facing text, validation messages, and date formats are automatically localized.

### Supported Languages
- `ar` - Arabic (Right-to-left layout supported)
- `en` - English (Default)

## Security Features

### Authentication
- JWT Bearer tokens for API authentication
- HttpOnly cookies for refresh tokens
- Automatic token rotation on refresh
- Immediate token revocation on logout

### Authorization
- Role-based access control (Admin, Instructor, User)
- Resource ownership verification
- Policy-based endpoint protection

### Data Protection
- HTTPS enforced in production
- Secure password hashing
- Input validation and sanitization
- Protection against common web vulnerabilities (XSS, CSRF, SQL Injection)

### File Security
- Antivirus scanning of all uploaded files
- File type validation (extension + MIME type)
- Secure file storage with randomized names
- Limited file type acceptance (images, videos, PDFs only)

## Development Guidelines

### Code Style
- Frontend: Follow ESLint and Prettier configurations
- Backend: Follow .NET coding conventions with stylecop analyzers

### Commit Messages
Use conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code restructuring
- `test:` for test additions/modifications
- `chore:` for build process or tool changes

### Branching Strategy
- `main` - Production-ready stable code
- `develop` - Integration branch for features
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `release/*` - Release preparation branches

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

**NOTICE**: This source code is the proprietary property of WhiteCodeAcademy and is provided for review purposes only. 

© 2026 WhiteCodeAcademy. All rights reserved.

This source code is **READ-ONLY** and may not be:
- Copied or duplicated
- Modified or altered
- Distributed or shared
- Used to create derivative works
- Used for commercial purposes
- Used to compete with WhiteCodeAcademy

Any unauthorized use, reproduction, or distribution of this code is strictly prohibited and may result in legal action.

For licensing inquiries, please contact: licensing@whitecodeacademy.com