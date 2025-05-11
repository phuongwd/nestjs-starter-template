jest.mock('nodemailer'); // This MUST be the first line

import nodemailer from 'nodemailer'; // This will now import the mocked version

// Set a reasonable timeout for tests
jest.setTimeout(10000);

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

// Skip database initialization to avoid hanging in CI
// This is a temporary measure until we can properly debug the issue
// Tests will use the test database configured in the CI workflow
console.log('Using simplified E2E test setup for CI');
