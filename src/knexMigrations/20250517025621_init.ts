import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // users
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.text('email').notNullable().unique();
    table.text('password');
    table.text('firstName').notNullable();
    table.text('lastName').notNullable();
    table.text('provider');
    table.text('providerId');
    table.text('picture');
    table.text('resetToken');
    table.timestamp('resetTokenExpiresAt', { useTz: false });
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.index(['provider', 'providerId']);
  });

  // organizations
  await knex.schema.createTable('organizations', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('slug').notNullable().unique();
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.text('description');
  });

  // roles
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('description');
    table
      .integer('organizationId')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.boolean('isSystemRole').notNullable().defaultTo(false);
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.unique(['name', 'organizationId']);
    table.index(['organizationId']);
  });

  // permissions
  await knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable().unique();
    table.text('description');
    table.text('resourceType').notNullable();
    table.text('action').notNullable();
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['resourceType', 'action']);
  });

  // role_permissions
  await knex.schema.createTable('role_permissions', (table) => {
    table
      .integer('roleId')
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .integer('permissionId')
      .notNullable()
      .references('id')
      .inTable('permissions')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.primary(['roleId', 'permissionId']);
    table.index(['roleId']);
    table.index(['permissionId']);
  });

  // organization_members
  await knex.schema.createTable('organization_members', (table) => {
    table.increments('id').primary();
    table
      .integer('organizationId')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .integer('userId')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.text('status').notNullable().defaultTo('INVITED');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.text('invitationToken').unique();
    table.text('email').notNullable();
    table.unique(['organizationId', 'userId']);
    table.unique(['organizationId', 'email']);
    table.index(['organizationId']);
    table.index(['userId']);
    table.index(['email']);
    table.index(['status']);
    table.index(['organizationId', 'status']);
  });

  // member_roles
  await knex.schema.createTable('member_roles', (table) => {
    table
      .integer('memberId')
      .notNullable()
      .references('id')
      .inTable('organization_members')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .integer('roleId')
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.primary(['memberId', 'roleId']);
    table.index(['memberId']);
    table.index(['roleId']);
    table.index(['memberId', 'roleId']);
  });

  // plans
  await knex.schema.createTable('plans', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('description');
    table.jsonb('features');
    table.decimal('price', 10, 2).notNullable();
    table.boolean('isActive').notNullable().defaultTo(true);
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.text('interval').notNullable().defaultTo('month');
    table.integer('memberLimit').notNullable().defaultTo(5);
  });

  // subscriptions
  await knex.schema.createTable('subscriptions', (table) => {
    table.increments('id').primary();
    table
      .integer('organizationId')
      .notNullable()
      .unique()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.integer('planId').notNullable().references('id').inTable('plans');
    table.text('status').notNullable();
    table.timestamp('startDate', { useTz: false }).notNullable();
    table.timestamp('endDate', { useTz: false });
    table.timestamp('trialEndsAt', { useTz: false });
    table.timestamp('canceledAt', { useTz: false });
    table.timestamp('currentPeriodStart', { useTz: false }).notNullable();
    table.timestamp('currentPeriodEnd', { useTz: false }).notNullable();
    table.text('paymentMethodId');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.timestamp('lastPaymentDate', { useTz: false });
    table.timestamp('nextPaymentDate', { useTz: false });
    table.text('paymentMethod');
    table.text('paymentReference');
    table.index(['planId']);
  });

  // subscription_admin_notes
  await knex.schema.createTable('subscription_admin_notes', (table) => {
    table.increments('id').primary();
    table
      .integer('subscriptionId')
      .notNullable()
      .references('id')
      .inTable('subscriptions')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.text('note').notNullable();
    table.text('type').notNullable();
    table.integer('createdBy').notNullable().references('id').inTable('users');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.index(['subscriptionId']);
    table.index(['createdBy']);
  });

  // billing_history
  await knex.schema.createTable('billing_history', (table) => {
    table.increments('id').primary();
    table
      .integer('subscriptionId')
      .notNullable()
      .references('id')
      .inTable('subscriptions')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.decimal('amount', 10, 2).notNullable();
    table.text('currency').notNullable().defaultTo('USD');
    table.text('status').notNullable();
    table.text('paymentMethod');
    table.text('paymentIntentId');
    table.text('invoiceUrl');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.index(['subscriptionId']);
  });

  // member_activities
  await knex.schema.createTable('member_activities', (table) => {
    table.increments('id').primary();
    table
      .integer('organizationId')
      .notNullable()
      .references('id')
      .inTable('organizations');
    table
      .integer('memberId')
      .notNullable()
      .references('id')
      .inTable('organization_members');
    table.text('action').notNullable();
    table.jsonb('metadata');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.index(['organizationId']);
    table.index(['memberId']);
    table.index(['createdAt']);
    table.index(['organizationId', 'memberId']);
    table.index(['organizationId', 'action']);
  });

  // pending_registrations
  await knex.schema.createTable('pending_registrations', (table) => {
    table.increments('id').primary();
    table.text('email').notNullable();
    table
      .integer('organizationId')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.text('invitationToken').notNullable().unique();
    table.specificType('roleNames', 'text[]');
    table.timestamp('expiresAt', { useTz: false }).notNullable();
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.index(['email']);
    table.index(['organizationId']);
    table.index(['invitationToken']);
  });

  // custom_domains
  await knex.schema.createTable('custom_domains', (table) => {
    table.increments('id').primary();
    table.text('domain').notNullable().unique();
    table
      .integer('organizationId')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .enu('status', ['PENDING', 'VERIFIED', 'FAILED', 'DNS_CONFIGURING'], {
        useNative: true,
        enumName: 'DomainStatus',
      })
      .notNullable()
      .defaultTo('PENDING');
    table.text('verificationToken');
    table.timestamp('verifiedAt', { useTz: false });
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.index(['domain']);
    table.index(['organizationId']);
  });

  // ssl_certificates
  await knex.schema.createTable('ssl_certificates', (table) => {
    table.increments('id').primary();
    table
      .integer('domainId')
      .notNullable()
      .unique()
      .references('id')
      .inTable('custom_domains');
    table.text('certificate').notNullable();
    table.text('privateKey').notNullable();
    table
      .timestamp('issuedAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('expiresAt', { useTz: false }).notNullable();
    table.text('provider').notNullable().defaultTo('letsencrypt');
    table
      .enu('status', ['ACTIVE', 'EXPIRED', 'REVOKED'], {
        useNative: true,
        enumName: 'CertStatus',
      })
      .notNullable()
      .defaultTo('ACTIVE');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
  });

  // system_roles
  await knex.schema.createTable('system_roles', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable().unique();
    table.text('description');
    table.jsonb('permissions').notNullable();
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
  });

  // admin_sessions
  await knex.schema.createTable('admin_sessions', (table) => {
    table.increments('id').primary();
    table
      .integer('userId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.text('token').notNullable().unique();
    table.text('ipAddress');
    table.text('userAgent');
    table
      .timestamp('lastActivity', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('expiresAt', { useTz: false }).notNullable();
    table.timestamp('revokedAt', { useTz: false });
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false }).notNullable();
    table.index(['userId']);
    table.index(['token']);
    table.index(['expiresAt']);
  });

  // admin_audit_logs
  await knex.schema.createTable('admin_audit_logs', (table) => {
    table.increments('id').primary();
    table
      .integer('userId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.text('action').notNullable();
    table.text('resource').notNullable();
    table.text('resourceId');
    table.jsonb('metadata');
    table.text('ipAddress');
    table.text('userAgent');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['userId']);
    table.index(['action']);
    table.index(['resource']);
    table.index(['createdAt']);
  });

  // security_alerts
  await knex.schema.createTable('security_alerts', (table) => {
    table.increments('id').primary();
    table.text('type').notNullable();
    table.jsonb('details').notNullable();
    table.text('status').notNullable().defaultTo('PENDING');
    table
      .timestamp('created_at', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: false }).notNullable();
  });

  // audit_logs
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users');
    table.text('action').notNullable();
    table.text('resource').notNullable();
    table.jsonb('details').notNullable();
    table.text('ip_address').notNullable();
    table
      .timestamp('timestamp', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['action']);
    table.index(['timestamp']);
    table.index(['user_id']);
  });

  // setup_tokens
  await knex.schema.createTable('setup_tokens', (table) => {
    table.text('id').primary();
    table.text('token').notNullable().unique();
    table.timestamp('expiresAt', { useTz: false }).notNullable();
    table.boolean('isUsed').notNullable().defaultTo(false);
    table.timestamp('usedAt', { useTz: false });
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.text('createdByIp').notNullable();
    table.text('usedByIp');
    table.text('fingerprint');
    table.text('environment').notNullable();
    table.jsonb('metadata');
    table.index(['token']);
    table.index(['isUsed']);
    table.index(['environment']);
  });

  // setup_audit
  await knex.schema.createTable('setup_audit', (table) => {
    table.text('id').primary();
    table
      .text('tokenId')
      .notNullable()
      .references('id')
      .inTable('setup_tokens');
    table.text('action').notNullable();
    table.text('ip').notNullable();
    table
      .timestamp('timestamp', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.jsonb('metadata');
    table.boolean('success').notNullable();
    table.text('error');
    table.index(['action']);
    table.index(['timestamp']);
    table.index(['tokenId']);
  });

  // access_tokens
  await knex.schema.createTable('access_tokens', (table) => {
    table.text('id').primary();
    table.text('name').notNullable();
    table.text('token').notNullable().unique();
    table
      .integer('userId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.text('description');
    table
      .timestamp('createdAt', { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('expiresAt', { useTz: false });
    table.timestamp('lastUsedAt', { useTz: false });
    table
      .specificType('scope', 'text[]')
      .defaultTo(knex.raw("ARRAY['all']::text[]"));
    table.unique(['userId', 'name']);
    table.index(['token']);
  });

  // _UserSystemRoles
  await knex.schema.createTable('_UserSystemRoles', (table) => {
    table
      .integer('A')
      .notNullable()
      .references('id')
      .inTable('system_roles')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .integer('B')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.primary(['A', 'B']);
    table.index(['B']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('_UserSystemRoles');
  await knex.schema.dropTableIfExists('access_tokens');
  await knex.schema.dropTableIfExists('setup_audit');
  await knex.schema.dropTableIfExists('setup_tokens');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('security_alerts');
  await knex.schema.dropTableIfExists('admin_audit_logs');
  await knex.schema.dropTableIfExists('admin_sessions');
  await knex.schema.dropTableIfExists('system_roles');
  await knex.schema.dropTableIfExists('ssl_certificates');
  await knex.schema.dropTableIfExists('custom_domains');
  await knex.schema.dropTableIfExists('pending_registrations');
  await knex.schema.dropTableIfExists('member_activities');
  await knex.schema.dropTableIfExists('billing_history');
  await knex.schema.dropTableIfExists('subscription_admin_notes');
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('plans');
  await knex.schema.dropTableIfExists('member_roles');
  await knex.schema.dropTableIfExists('organization_members');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('organizations');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.raw('DROP TYPE IF EXISTS "CertStatus"');
  await knex.schema.raw('DROP TYPE IF EXISTS "DomainStatus"');
}
