export class QueryBuilder<TEntity> {
  private conditions: Array<keyof TEntity> = [];
  private parameters: unknown[] = [];
  private includes: Array<keyof TEntity> = [];
  private orderByFields: { [K in keyof TEntity]?: 'asc' | 'desc' } = {};
  private limitValue?: number;
  private offsetValue?: number;

  where(condition: keyof TEntity, value: unknown): this {
    this.conditions.push(condition);
    this.parameters.push(value);
    return this;
  }

  include(relation: keyof TEntity): this {
    this.includes.push(relation);
    return this;
  }

  orderBy(field: keyof TEntity, direction: 'asc' | 'desc'): this {
    this.orderByFields[field] = direction;
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  build(): {
    where: Record<keyof TEntity, unknown>;
    include?: Record<keyof TEntity, boolean>;
    orderBy?: Partial<Record<keyof TEntity, 'asc' | 'desc'>>;
    take?: number;
    skip?: number;
  } {
    const query: {
      where?: Record<keyof TEntity, unknown>;
      include?: Record<keyof TEntity, boolean>;
      orderBy?: Partial<Record<keyof TEntity, 'asc' | 'desc'>>;
      take?: number;
      skip?: number;
    } = {};

    // Build where conditions
    if (this.conditions.length > 0) {
      query.where = this.conditions.reduce<Record<keyof TEntity, unknown>>(
        (acc, condition, index) => {
          acc[condition] = this.parameters[index];
          return acc;
        },
        {} as Record<keyof TEntity, unknown>,
      );
    }

    // Build includes
    if (this.includes.length > 0) {
      query.include = this.includes.reduce<Record<keyof TEntity, boolean>>(
        (acc, include) => {
          acc[include] = true;
          return acc;
        },
        {} as Record<keyof TEntity, boolean>,
      );
    }

    // Build order by
    if (Object.keys(this.orderByFields).length > 0) {
      query.orderBy = this.orderByFields;
    }

    // Add pagination
    if (this.limitValue) {
      query.take = this.limitValue;
    }
    if (this.offsetValue) {
      query.skip = this.offsetValue;
    }

    return query as {
      where: Record<keyof TEntity, unknown>;
      include?: Record<keyof TEntity, boolean>;
      orderBy?: Partial<Record<keyof TEntity, 'asc' | 'desc'>>;
      take?: number;
      skip?: number;
    };
  }
}
