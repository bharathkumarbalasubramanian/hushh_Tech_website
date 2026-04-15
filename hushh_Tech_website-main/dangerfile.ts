/**
 * Danger.js - Automated PR Review Rules
 * 
 * This file defines custom rules for automatically reviewing PRs.
 * Danger will comment on PRs with feedback based on these rules.
 * 
 * @see https://danger.systems/js/
 */

import { danger, warn, fail, message, markdown } from 'danger';

// =================================================================
// CONFIGURATION
// =================================================================

const CONFIG = {
  // PR title must follow conventional commits
  titlePattern: /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{3,}/,
  
  // Minimum description length
  minDescriptionLength: 50,
  
  
  // Source directories that should have tests
  sourceDirectories: ['src/'],
  
  // Test file patterns
  testPatterns: ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'],
  
  // Sensitive patterns to check for
  sensitivePatterns: [
    /api[_-]?key\s*[:=]/i,
    /secret[_-]?key\s*[:=]/i,
    /password\s*[:=]/i,
    /private[_-]?key\s*[:=]/i,
    /access[_-]?token\s*[:=]/i,
    /auth[_-]?token\s*[:=]/i,
    /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/,
    /sk_live_[A-Za-z0-9]+/,  // Stripe live key
    /sk_test_[A-Za-z0-9]+/,  // Stripe test key
    /AKIA[A-Z0-9]{16}/,       // AWS Access Key
  ],
  
  // Files that should trigger extra review
  criticalFiles: [
    'package.json',
    'package-lock.json',
    'supabase/migrations/',
    '.env',
    'vite.config.ts',
    'tsconfig.json',
  ],
};

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Get all modified, created, and deleted files
 */
function getAllChangedFiles(): string[] {
  return [
    ...danger.git.modified_files,
    ...danger.git.created_files,
    ...danger.git.deleted_files,
  ];
}

/**
 * Check if a file matches any of the given patterns
 */
function matchesPattern(file: string, patterns: string[]): boolean {
  return patterns.some(pattern => file.includes(pattern));
}

/**
 * Check if any source files were modified
 */
function hasSourceChanges(): boolean {
  const changedFiles = getAllChangedFiles();
  return changedFiles.some(file => 
    CONFIG.sourceDirectories.some(dir => file.startsWith(dir))
  );
}

/**
 * Check if any test files were modified
 */
function hasTestChanges(): boolean {
  const changedFiles = getAllChangedFiles();
  return changedFiles.some(file => 
    CONFIG.testPatterns.some(pattern => file.includes(pattern))
  );
}

// =================================================================
// REVIEW RULES
// =================================================================

/**
 * Rule 1: Check PR Title Format
 * PR title must follow conventional commits format
 */
function checkPRTitle(): void {
  const title = danger.github.pr.title;
  
  if (!CONFIG.titlePattern.test(title)) {
    fail(`🚫 **PR Title Error**
    
PR title must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

\`\`\`
<type>(<scope>): <description>
\`\`\`

**Valid types:** \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`perf\`, \`test\`, \`build\`, \`ci\`, \`chore\`, \`revert\`

**Examples:**
- ✅ \`feat(auth): add Google sign-in\`
- ✅ \`fix: resolve navigation bug\`
- ✅ \`docs: update README\`
- ❌ \`Update stuff\`
- ❌ \`Fixed bug\``);
  }
}

/**
 * Rule 2: Check PR Description
 * PRs must have a meaningful description
 */
function checkPRDescription(): void {
  const body = danger.github.pr.body || '';
  
  if (body.length < CONFIG.minDescriptionLength) {
    warn(`⚠️ **PR Description Too Short**

Please provide a more detailed description of your changes (at least ${CONFIG.minDescriptionLength} characters).

A good description should include:
- What changes were made
- Why these changes were necessary
- Any testing performed
- Screenshots (if UI changes)`);
  }
}

/**
 * Rule 3: Check for Tests
 * Source changes should include tests
 */
function checkForTests(): void {
  if (hasSourceChanges() && !hasTestChanges()) {
    warn(`🧪 **Missing Tests**

This PR modifies source files but doesn't include any test changes.

Consider adding tests for:
- New features
- Bug fixes
- Edge cases

Files like \`*.test.ts\` or \`*.spec.ts\` should be included.`);
  }
}

/**
 * Rule 5: Check for Sensitive Data
 * Prevent accidental commit of secrets
 */
async function checkForSensitiveData(): Promise<void> {
  const changedFiles = [...danger.git.modified_files, ...danger.git.created_files];
  
  for (const file of changedFiles) {
    // Skip node_modules, dist, and lock files
    if (file.includes('node_modules') || file.includes('dist') || file.includes('lock.')) {
      continue;
    }
    
    try {
      const diff = await danger.git.diffForFile(file);
      if (!diff) continue;
      
      const addedContent = diff.added;
      
      for (const pattern of CONFIG.sensitivePatterns) {
        if (pattern.test(addedContent)) {
          fail(`🔒 **Potential Secret Detected in \`${file}\`**

A pattern matching a potential secret or API key was found in this file.

Please ensure you're not committing sensitive data. Use environment variables instead.

If this is a false positive, please confirm in the PR description.`);
          break;
        }
      }
    } catch (e) {
      // File might be binary or inaccessible
      console.warn(`Could not check file: ${file}`);
    }
  }
}

/**
 * Rule 6: Check for Critical File Changes
 * Alert when important files are modified
 */
function checkCriticalFiles(): void {
  const changedFiles = getAllChangedFiles();
  const criticalChanges = changedFiles.filter(file => 
    CONFIG.criticalFiles.some(critical => file.includes(critical))
  );
  
  if (criticalChanges.length > 0) {
    markdown(`## ⚠️ Critical Files Modified

The following critical files were modified in this PR:

${criticalChanges.map(f => `- \`${f}\``).join('\n')}

Please ensure these changes are intentional and have been thoroughly tested.`);
  }
}

/**
 * Rule 7: Check for Console Logs
 * Warn about console.log statements in production code
 */
async function checkConsoleLogs(): Promise<void> {
  const sourceFiles = [...danger.git.modified_files, ...danger.git.created_files]
    .filter(file => file.startsWith('src/') && (file.endsWith('.ts') || file.endsWith('.tsx')));
  
  for (const file of sourceFiles) {
    try {
      const diff = await danger.git.diffForFile(file);
      if (!diff) continue;
      
      if (diff.added.includes('console.log')) {
        warn(`📝 **Console.log Found in \`${file}\`**

Consider removing \`console.log\` statements before merging to production.`);
      }
    } catch (e) {
      console.warn(`Could not check file: ${file}`);
    }
  }
}

/**
 * Rule 8: Database Migration Check
 * Warn about new database migrations
 */
function checkDatabaseMigrations(): void {
  const changedFiles = getAllChangedFiles();
  const migrations = changedFiles.filter(file => file.includes('supabase/migrations/'));
  
  if (migrations.length > 0) {
    markdown(`## 🗄️ Database Migrations

This PR includes database migrations:

${migrations.map(f => `- \`${f}\``).join('\n')}

**Checklist:**
- [ ] Migration has been tested locally
- [ ] Migration is reversible or has been discussed
- [ ] Production data has been considered
- [ ] RLS policies are properly configured`);
  }
}

// =================================================================
// SUMMARY
// =================================================================

/**
 * Generate a summary of the PR
 */
function generateSummary(): void {
  const changedFiles = getAllChangedFiles();
  const additions = danger.github.pr.additions || 0;
  const deletions = danger.github.pr.deletions || 0;
  
  markdown(`## 📊 PR Summary

| Metric | Value |
|--------|-------|
| Files Changed | ${changedFiles.length} |
| Lines Added | +${additions} |
| Lines Deleted | -${deletions} |
| Net Change | ${additions - deletions >= 0 ? '+' : ''}${additions - deletions} |
`);
}

// =================================================================
// RUN ALL CHECKS
// =================================================================

async function runAllChecks(): Promise<void> {
  // Generate summary first
  generateSummary();
  
  // Run synchronous checks
  checkPRTitle();
  checkPRDescription();
  checkForTests();
  checkCriticalFiles();
  checkDatabaseMigrations();
  
  // Run async checks
  await checkForSensitiveData();
  await checkConsoleLogs();
  
  // Final message
  message('🤖 **Automated Review Complete**\n\nThis review was generated automatically by Danger.js');
}

// Execute all checks
runAllChecks().catch(console.error);
