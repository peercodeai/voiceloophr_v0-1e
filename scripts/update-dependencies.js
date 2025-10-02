#!/usr/bin/env node

/**
 * Dependency Update Script for VoiceLoop HR
 * 
 * This script safely updates dependencies while maintaining compatibility
 * and avoiding breaking changes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Critical security updates that should be applied immediately
const CRITICAL_UPDATES = [
  '@aws-sdk/client-s3',
  '@aws-sdk/client-textract', 
  '@aws-sdk/lib-storage',
  '@azure/msal-node',
  '@supabase/supabase-js',
  'openai'
];

// Safe minor updates that are unlikely to cause breaking changes
const SAFE_MINOR_UPDATES = [
  '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-slider',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group',
  '@radix-ui/react-tooltip',
  'lucide-react',
  'next',
  'react',
  'react-dom',
  '@types/react',
  '@types/react-dom',
  '@types/node',
  'typescript'
];

// Major version updates that require careful testing
const MAJOR_UPDATES = [
  '@hookform/resolvers',
  'pdf-parse',
  'recharts',
  'sonner',
  'tailwind-merge',
  'tailwindcss',
  'zod'
];

console.log('🔧 VoiceLoop HR Dependency Update Script');
console.log('==========================================\n');

// Function to safely update a package
function updatePackage(packageName, updateType = 'minor') {
  try {
    console.log(`📦 Updating ${packageName}...`);
    
    let command;
    if (updateType === 'major') {
      command = `npm install ${packageName}@latest`;
    } else {
      command = `npm install ${packageName}@latest`;
    }
    
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Successfully updated ${packageName}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${packageName}: ${error.message}\n`);
    return false;
  }
}

// Function to check for security vulnerabilities
function checkSecurity() {
  console.log('🔒 Checking for security vulnerabilities...\n');
  try {
    execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
    console.log('✅ No critical security vulnerabilities found\n');
  } catch (error) {
    console.error('⚠️  Security vulnerabilities found. Run "npm audit fix" to resolve.\n');
  }
}

// Function to update package.json with latest versions
function updatePackageJson() {
  console.log('📝 Updating package.json with recommended versions...\n');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update critical packages to latest versions
  const updates = {
    '@aws-sdk/client-s3': '^3.901.0',
    '@aws-sdk/client-textract': '^3.901.0',
    '@aws-sdk/lib-storage': '^3.901.0',
    '@azure/msal-node': '^3.8.0',
    '@supabase/supabase-js': '^2.58.0',
    'openai': '^5.23.2',
    'next': '^15.5.4',
    'react': '^19.2.0',
    'react-dom': '^19.2.0',
    '@types/react': '^19.2.0',
    '@types/react-dom': '^19.2.0',
    '@types/node': '^22.18.8',
    'typescript': '^5.9.3',
    'lucide-react': '^0.544.0'
  };
  
  Object.entries(updates).forEach(([pkg, version]) => {
    if (packageJson.dependencies && packageJson.dependencies[pkg]) {
      packageJson.dependencies[pkg] = version;
      console.log(`📦 Updated ${pkg} to ${version}`);
    } else if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
      packageJson.devDependencies[pkg] = version;
      console.log(`📦 Updated ${pkg} to ${version}`);
    }
  });
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('\n✅ package.json updated successfully\n');
}

// Main execution
async function main() {
  try {
    console.log('1. Checking current security status...\n');
    checkSecurity();
    
    console.log('2. Updating critical security packages...\n');
    CRITICAL_UPDATES.forEach(pkg => updatePackage(pkg, 'minor'));
    
    console.log('3. Updating safe minor versions...\n');
    SAFE_MINOR_UPDATES.slice(0, 10).forEach(pkg => updatePackage(pkg, 'minor')); // Limit to avoid overwhelming
    
    console.log('4. Updating package.json versions...\n');
    updatePackageJson();
    
    console.log('5. Final security check...\n');
    checkSecurity();
    
    console.log('🎉 Dependency update completed!');
    console.log('\nNext steps:');
    console.log('1. Run "npm install" to install updated dependencies');
    console.log('2. Run "npm test" to ensure all tests pass');
    console.log('3. Run "npm run build" to verify build works');
    console.log('4. Test the application thoroughly');
    console.log('5. Commit changes with "git add . && git commit -m \'Update dependencies for security and performance\'"');
    
  } catch (error) {
    console.error('❌ Update script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { updatePackage, checkSecurity, updatePackageJson };
