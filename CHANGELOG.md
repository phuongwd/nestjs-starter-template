# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2024-11-24 (afternoon and evening)

### Added

- Comprehensive documentation structure in `/docs` directory
- New guides:
  - Getting Started guide with complete setup instructions
  - Database migrations workflow
  - API versioning strategy
- Technical documentation:
  - Detailed project structure documentation
  - Architecture overview with Mermaid diagrams
  - Testing patterns and best practices
- API documentation:
  - Authentication endpoints
  - Resource endpoints
  - Response types
- Reference documentation:
  - Error codes
  - Response formats
  - API versioning

### Changed

- Reorganized documentation structure for better navigation
- Updated project structure to follow modular pattern
- Enhanced API documentation with more examples
- Improved architecture documentation with detailed diagrams
- Updated testing documentation with practical examples

### Fixed

- Broken documentation links
- Inconsistent documentation structure
- Missing cross-references between documents
- Outdated setup instructions

## 2024-11-24 (morning)

### Added

- Health monitoring system using @nestjs/terminus
- Course management features in database schema
- Enrollment system for student-course relationships
- Core module for cross-cutting concerns
- Improved API documentation with Swagger
- New dependencies:
  - @nestjs/terminus for health checks
  - @nestjs/axios for HTTP health checks
  - check-disk-space for system monitoring

### Changed

- Restructured entire project architecture to follow modular pattern
- Moved feature modules to dedicated `modules/` directory
- Enhanced authentication system with better token handling
- Updated Prisma schema with new entities and relationships
- Improved Swagger configuration with better organization and descriptions

### Removed

- Standalone auth, users, and courses modules (now under modules directory)
- Redundant interfaces and types (consolidated under feature modules)

### Security

- Enhanced JWT authentication implementation
- Added rate limiting for sensitive endpoints
- Improved role-based access control

## 2024-03-10

### Added

- Initial project setup
- Basic user authentication
- Role-based authorization
- Basic project structure
