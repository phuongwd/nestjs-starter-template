jest.mock('nodemailer'); // This MUST be the first line

import { TestUtils } from '../src/test/db-test-utils';
import nodemailer from 'nodemailer'; // This will now import the mocked version

jest.setTimeout(30000); // Increase timeout to 30 seconds

// Configure the mock for nodemailer.createTransport
const mockCreateTransport = nodemailer.createTransport as jest.Mock;
mockCreateTransport.mockReturnValue({
  sendMail: jest
    .fn()
    .mockResolvedValue({ messageId: 'mock-message-id-' + Date.now() }),
  verify: jest.fn().mockResolvedValue(true), // Ensure verify returns a resolved promise
  use: jest.fn(), // Added mock for the 'use' method
  // Add other methods if MailerService uses them, e.g., for event handling on the transporter
  once: jest.fn(),
  on: jest.fn(),
});

beforeAll(async () => {
  // Initialize the test database
  // This ensures the DB is set up after mocks but before tests that might use it.
  await TestUtils.initializeTestDatabase();
});

afterAll(async () => {
  // Cleanup the test database
  await TestUtils.cleanupTestDatabase();
});
