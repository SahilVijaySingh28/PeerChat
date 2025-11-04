#!/usr/bin/env node

/**
 * Script to verify the FlashChat application structure after restructuring
 */

import fs from 'fs';
import path from 'path';

// Define expected directory structure
const expectedStructure = {
  'src': {
    'app': {
      'routes': {}
    },
    'features': {
      'auth': {
        'components': {},
        'services': {},
        'hooks': {}
      },
      'chat': {
        'components': {},
        'services': {},
        'hooks': {}
      },
      'call': {
        'components': {},
        'services': {},
        'hooks': {}
      },
      'user': {
        'components': {},
        'services': {},
        'hooks': {}
      }
    },
    'shared': {
      'components': {},
      'hooks': {},
      'services': {},
      'utils': {},
      'constants': {}
    },
    'assets': {
      'images': {},
      'icons': {},
      'styles': {}
    },
    'config': {}
  },
  'tests': {
    'unit': {},
    'integration': {},
    'e2e': {}
  },
  'docs': {},
  'scripts': {},
  'public': {},
  'backend': {}
};

// Function to check if a directory exists
function directoryExists(dirPath) {
  return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
}

// Function to recursively check directory structure
function checkStructure(basePath, structure, currentPath = '') {
  let allExist = true;
  
  for (const [dirName, subStructure] of Object.entries(structure)) {
    const fullPath = path.join(basePath, dirName);
    const relativePath = path.join(currentPath, dirName);
    
    if (!directoryExists(fullPath)) {
      console.error(`❌ Missing directory: ${relativePath}`);
      allExist = false;
    } else {
      console.log(`✅ Found directory: ${relativePath}`);
      
      // Recursively check subdirectories
      if (Object.keys(subStructure).length > 0) {
        const subResult = checkStructure(fullPath, subStructure, relativePath);
        allExist = allExist && subResult;
      }
    }
  }
  
  return allExist;
}

// Function to check for key files
function checkKeyFiles() {
  const keyFiles = [
    'src/config/firebase.js',
    'src/shared/components/avatar.jsx',
    'src/shared/components/online-status.jsx',
    'src/features/auth/services/authService.js',
    'src/features/chat/services/chatService.js',
    'src/features/user/services/userService.js',
    'src/features/call/services/callService.js',
    'src/features/chat/hooks/useChat.js',
    'src/features/user/hooks/useUser.js',
    'src/features/call/hooks/useCall.js',
    'src/shared/hooks/useTheme.js',
    'src/shared/utils/timeUtils.js',
    'src/shared/utils/mediaUtils.js',
    'src/shared/utils/errorUtils.js'
  ];
  
  let allExist = true;
  
  for (const file of keyFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing file: ${file}`);
      allExist = false;
    } else {
      console.log(`✅ Found file: ${file}`);
    }
  }
  
  return allExist;
}

// Function to check that old directories are removed
function checkOldStructureRemoved() {
  const oldDirectories = [
    'src/components',
    'src/lib'
  ];
  
  let allRemoved = true;
  
  for (const dir of oldDirectories) {
    const fullPath = path.join(__dirname, '..', dir);
    if (directoryExists(fullPath)) {
      console.error(`❌ Old directory still exists: ${dir}`);
      allRemoved = false;
    } else {
      console.log(`✅ Old directory removed: ${dir}`);
    }
  }
  
  return allRemoved;
}

// Main verification function
function verifyStructure() {
  console.log('🔍 Verifying FlashChat application structure...\n');
  
  // Check directory structure
  console.log('📂 Checking directory structure:');
  const structureValid = checkStructure(__dirname, expectedStructure, '');
  
  console.log('\n📄 Checking key files:');
  const filesValid = checkKeyFiles();
  
  console.log('\n🧹 Checking old structure removal:');
  const oldStructureRemoved = checkOldStructureRemoved();
  
  console.log('\n📊 Verification Results:');
  if (structureValid && filesValid && oldStructureRemoved) {
    console.log('🎉 All checks passed! Structure verification successful.');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run verification
verifyStructure();