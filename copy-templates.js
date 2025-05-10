const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Check if email feature is enabled
const isEmailEnabled = process.env.EMAIL_ENABLED === 'true';
console.log(`Email feature is ${isEmailEnabled ? 'enabled' : 'disabled'}`);

if (!isEmailEnabled) {
  console.log('Skipping email template copying as email feature is disabled');
  process.exit(0);
}

const sourceDir = path.join(__dirname, 'src/modules/email/templates');
const destDir = path.join(__dirname, 'dist/modules/email/templates');

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
  console.error(`Source directory does not exist: ${sourceDir}`);
  process.exit(1);
}

// Create destination directory and all parent directories if they don't exist
console.log(`Creating destination directory: ${destDir}`);
fs.mkdirSync(destDir, { recursive: true });

// Copy template files
try {
  const files = fs.readdirSync(sourceDir);
  console.log(`Found ${files.length} template files to copy`);

  files.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);

    // Only copy files, not directories
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied: ${file}`);
    }
  });

  console.log('Email templates copied successfully');
} catch (error) {
  console.error('Error copying email templates:', error);
  process.exit(1);
}
