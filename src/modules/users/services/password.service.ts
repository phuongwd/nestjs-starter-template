import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '../constants/user.constants';

@Injectable()
export class PasswordService {
  /**
   * Hash a plain text password
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare plain text password with hashed password
   * @param plainPassword - Plain text password
   * @param hashedPassword - Hashed password to compare against
   * @returns Boolean indicating if passwords match
   */
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
