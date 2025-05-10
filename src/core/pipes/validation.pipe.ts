import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Type,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { ValidationError } from '../types/validation.types';

@Injectable()
export class ValidationPipe
  implements PipeTransform<unknown, Promise<unknown>>
{
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Handle non-object values
    if (!this.isObject(value)) {
      throw new BadRequestException(
        'Validation failed - value must be an object',
      );
    }

    // Transform plain object to class instance
    const object = plainToInstance(metatype as ClassConstructor<object>, value);

    // Validate the object using class-validator
    const errors = await validate(object as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages: ValidationError[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }

  private toValidate(metatype: Type): boolean {
    const types: Type[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
