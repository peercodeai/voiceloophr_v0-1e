# 🔒 Security Guide - VoiceLoop HR Platform

## Overview

This document outlines security practices, scanning procedures, and best practices for the VoiceLoop HR platform. Security is a top priority, especially when handling sensitive HR documents and AWS credentials.

## 🚨 Security Requirements

### **Before Every Push to Main Branch**
- [ ] Run local security scan: `npm run security:scan`
- [ ] Ensure all tests pass: `npm run test`
- [ ] Verify linting passes: `npm run lint`
- [ ] Check for hardcoded credentials
- [ ] Validate environment variables

### **Before Every Commit**
- [ ] Pre-commit hooks will run automatically
- [ ] Security scan, tests, and linting must pass
- [ ] No hardcoded credentials allowed

## 🔍 Security Scanning

### **Local Security Scanner**

Run the comprehensive security scanner before pushing:

```bash
# Full security scan
npm run security:scan

# Quick security check
npm run security:check

# Pre-push validation (runs all checks)
npm run pre-push
```

### **What the Scanner Checks**

1. **Hardcoded Credentials**
   - AWS Access Keys (AKIA...)
   - AWS Secret Keys
   - OpenAI API Keys
   - Database URLs with credentials
   - Private/SSH Keys

2. **Environment Variables**
   - Proper usage of `process.env.*`
   - No real credentials in `.env` files
   - Environment file configuration

3. **Dependencies**
   - Known vulnerabilities
   - Outdated packages
   - Duplicate packages
   - Lockfile integrity

4. **Configuration**
   - Package.json security settings
   - Dangerous scripts
   - Sensitive file exposure

5. **Git Configuration**
   - `.gitignore` completeness
   - Large file detection
   - Sensitive file tracking

6. **TypeScript Security**
   - Compilation errors
   - ESLint security rules
   - Type safety

7. **AWS Configuration**
   - SDK usage patterns
   - Environment variable usage
   - IAM policy documentation

## 🚀 GitHub Actions Security Workflow

### **Automated Security Checks**

The `.github/workflows/security-scan.yml` workflow runs:

- **On every push** to main/develop branches
- **On every pull request** to main branch
- **Weekly** for ongoing monitoring

### **Workflow Jobs**

1. **Security & Quality Scan**
   - Dependency vulnerability audit
   - Snyk security scan
   - Gitleaks secret detection
   - CodeQL analysis
   - Hardcoded credential detection

2. **Dependency Security Check**
   - Outdated package detection
   - Duplicate package check
   - Lockfile integrity verification

3. **AWS Security Configuration Check**
   - Hardcoded AWS credential detection
   - Environment variable usage validation
   - IAM policy documentation check

4. **Quality Gates**
   - All security checks must pass
   - Blocks merge if any critical issues found

## 🔑 Credential Management

### **Never Commit These**

```bash
# ❌ NEVER commit these files
.env.local
.env.production
secrets.json
credentials.json
*.pem
*.key
*.p12
*.pfx
```

### **Always Use Environment Variables**

```typescript
// ✅ CORRECT - Use environment variables
const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}

// ❌ WRONG - Hardcoded credentials
const awsConfig = {
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
}
```

### **Environment File Template**

```bash
# .env.example (safe to commit)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=your-bucket-name
OPENAI_API_KEY=your_openai_api_key_here

# .env.local (NEVER commit - add to .gitignore)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=voiceloop-hr-documents-20241201
OPENAI_API_KEY=sk-proj-1234567890abcdef
```

## 🛡️ AWS Security Best Practices

### **IAM Policies**

- **Principle of Least Privilege**: Only grant necessary permissions
- **No Wildcard Resources**: Avoid `"Resource": "*"` when possible
- **Regular Access Reviews**: Review and rotate credentials regularly

### **S3 Bucket Security**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::your-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": "o-1234567890"
        }
      }
    }
  ]
}
```

### **Environment Variable Security**

```typescript
// ✅ Secure configuration
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}

// Validate required environment variables
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
```

## 🔒 Pre-commit Hooks

### **Automatic Security Checks**

The `.husky/pre-commit` hook runs automatically:

```bash
# Pre-commit hook runs:
npm run security:scan  # Security scan
npm run lint           # Code quality
npm run test           # Test suite
```

### **Manual Pre-commit Check**

```bash
# Run manually if needed
npx husky run .husky/pre-commit
```

## 📊 Security Monitoring

### **Weekly Security Scans**

- GitHub Actions runs weekly security scans
- Monitor Snyk vulnerability reports
- Review CodeQL analysis results
- Check for new security advisories

### **Dependency Updates**

```bash
# Check for outdated packages
npm outdated

# Update packages (review changes first)
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

## 🚨 Incident Response

### **If Credentials Are Exposed**

1. **Immediate Actions**
   - Revoke exposed credentials immediately
   - Rotate all related credentials
   - Check for unauthorized access

2. **Investigation**
   - Review Git history for exposure
   - Check for unauthorized commits
   - Monitor AWS CloudTrail logs

3. **Recovery**
   - Generate new credentials
   - Update all environment variables
   - Verify no credentials remain in code

### **Security Contact**

- **GitHub Issues**: Report security issues privately
- **Security Alerts**: Monitor GitHub security alerts
- **Dependency Alerts**: Review npm security advisories

## 📚 Security Resources

### **Tools & Services**

- **Snyk**: Dependency vulnerability scanning
- **CodeQL**: GitHub's semantic code analysis
- **Gitleaks**: Secret detection in Git repositories
- **npm audit**: Node.js security auditing

### **Documentation**

- [AWS Security Best Practices](https://aws.amazon.com/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [GitHub Security Features](https://github.com/features/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### **Regular Security Tasks**

- [ ] Weekly: Review security scan results
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Review IAM policies
- [ ] Annually: Security audit and penetration testing

---

## 🎯 Security Checklist

### **Before Every Push**

- [ ] `npm run security:scan` passes
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] No hardcoded credentials
- [ ] Environment variables properly configured
- [ ] Dependencies up to date
- [ ] No security vulnerabilities

### **Before Every Release**

- [ ] Full security audit completed
- [ ] All known vulnerabilities resolved
- [ ] Credentials rotated and secured
- [ ] Security documentation updated
- [ ] Team security training completed

---

**🔒 Remember: Security is everyone's responsibility. When in doubt, ask before committing!**
