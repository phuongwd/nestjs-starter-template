![CI](https://github.com/phuongwd/nestjs-starter-template/actions/workflows/ci.yml/badge.svg)

# 🔐 SAASQALI

A robust multi-tenant SAAS platform built with NestJS, providing secure organization management, custom domain handling, subscription management, and JWT-based authentication. This project implements best practices for modern SAAS platforms and follows clean architecture principles.

_By Phuong_

## ✨ Key Features

- 🏢 Multi-tenant Architecture

  - Organization-based data isolation
  - Custom domain support
  - Tenant-specific configurations
  - White-label capabilities

- 👥 Organization Management

  - Member invitation system
  - Role-based access control
  - Custom roles and permissions
  - Activity tracking

- 💳 Subscription & Billing

  - Multiple payment providers
  - Usage-based billing
  - Invoice generation
  - Subscription management

- 🔒 Enterprise Security

  - JWT authentication
  - Organization context isolation
  - Rate limiting
  - Health monitoring
  - Custom domain SSL

- 📧 Communication

  - Transactional emails
  - Multiple email providers
  - Template management
  - Email queue system

- ✅ Quality Assurance
  - Comprehensive test coverage
  - Unit & E2E tests
  - Performance monitoring
  - Error tracking

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose (recommended)
- Node.js (v18 or higher)
- npm/yarn
- PostgreSQL

### Quick Start

#### Using Docker (Recommended)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

#### Manual Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment: `cp .env.example .env`
4. Run migrations: `npm migrate:latest`
5. Start development: `npm run start:dev`

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## [Knex Migration Usage](http://knexjs.org/#Migrations)

To see list of commands of Knex

```bash
npx knex --help
```

### Migrating
To create a migration file, assume file name is **studentCreate**. Run command below:

```bash
npx knex migrate:make studentCreate ts
```

Migration file will be placed at `src/knexMigrations` folder.


### At local
To execute to latest manually
```bash
yarn run build-ts && npx knex migrate:latest --knexfile=./dev/knexfile.js
```

after run the migration files successfully, check on the `knex_migrations` table for the history.

To downgrade
```bash
node_modules/.bin/knex migrate:down --knexfile=./dev/knexfile.js
```

### At STAGING / UAT / PROD

Execute through API: `v1/administration/migration/:command`


There are 4 actions available for `:command` parameter:
- **up**:  Run the next migration that has not yet been run.
- **down**: Undo the last migration that was already run.
- **rollback**:  Rollback the last batch of migrations performed.
- **latest**:  Run all migrations that have not yet been run.
*Make sure you call the API with Administrator access token*


## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## ❤️ Support This Project

If you find this template helpful, please consider:

- Starring the repository ⭐
- Following Phuong on GitHub

Your support helps Phuong:

- 🎨 Develop intuitive user interfaces
- 🔄 Bridge frontend and backend development
- 📚 Learn and document backend development journey
- 🤝 Help other frontend developers explore backend development

Your support encourages:

- Continuous learning and improvement
- Better documentation
- More comprehensive examples
- Regular updates and maintenance
- Community engagement and support

## 👨‍💻 About the Developer

**Phuong** - Developer & Maintainer

- 👨‍💻 Frontend & Mobile Developer
- 📱 Specializing in React, React Native, and Mobile Development
- 🎓 Passionate about creating intuitive user experiences
- 🌟 Main maintainer of this template
- 💡 Learning and exploring backend development with NestJS

This project represents Phuong's journey from frontend to full-stack development, aiming to:

- Bridge the gap between frontend and backend development.
- Create comprehensive full-stack solutions.
- Learn and grow through this development process.
- Share knowledge and resources with the community.
- Document the learning process.
- Create resources for other frontend developers.
- Build a bridge between frontend and backend worlds.

## 📝 License

This project is [MIT licensed](LICENSE).

---

<p align="center">Built with ❤️ by Phuong</p>
