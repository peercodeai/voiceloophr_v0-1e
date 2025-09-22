# 🔑 AWS Permissions Setup for VoiceLoop HR

## 🚨 **Current Issue**
Your AWS user `cursor` doesn't have permissions to use Textract or access the S3 bucket.

## ✅ **Solution: Add IAM Policy**

### **Step 1: Go to AWS IAM Console**
1. Open [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Sign in with your AWS account
3. Navigate to **Users** → **cursor**

### **Step 2: Attach Policy**
1. Click on your **cursor** user
2. Click **Add permissions**
3. Choose **Attach policies directly**
4. Click **Create policy**
5. Click **JSON** tab
6. Copy and paste the policy from `iam-policy-voiceloop-hr.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:AnalyzeDocument",
        "textract:DetectDocumentText",
        "textract:GetDocumentAnalysis",
        "textract:StartDocumentAnalysis",
        "textract:AnalyzeExpense",
        "textract:AnalyzeId"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::voiceloophr-hr-documents-20241201",
        "arn:aws:s3:::voiceloophr-hr-documents-20241201/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation"
      ],
      "Resource": "*"
    }
  ]
}
```

7. Click **Next: Tags** (skip tags)
8. Click **Next: Review**
9. Name: `VoiceLoopHRTextractS3Access`
10. Description: `Access to Textract and S3 for VoiceLoop HR platform`
11. Click **Create policy**

### **Step 3: Attach Policy to User**
1. Go back to **Users** → **cursor**
2. Click **Add permissions**
3. Choose **Attach policies directly**
4. Search for `VoiceLoopHRTextractS3Access`
5. Check the box and click **Next: Review**
6. Click **Add permissions**

## 🧪 **Test the Setup**

After adding permissions, test with:

```bash
# Test Textract access
aws textract detect-document-text --document "S3Object={Bucket=voiceloophr-hr-documents-20241201,Name=test-document.txt}"

# Test S3 access
aws s3 ls s3://voiceloophr-hr-documents-20241201/
```

## 🔒 **Security Note**
This policy gives access to:
- **Textract**: All document analysis features
- **S3**: Only the `voiceloophr-hr-documents-20241201` bucket
- **Limited scope**: No access to other AWS services

## 🚀 **What You'll Be Able to Do**
- Process documents with Textract
- Upload/download files to/from S3
- Analyze forms, tables, and text
- Build the VoiceLoop HR platform

---

**After adding these permissions, you'll be able to use Textract and S3 for your VoiceLoop HR platform!** 🎉
