#!/bin/sh
set -eu
umask 077

# Values are checked by env_config.py before Compose runs. Do not enable tracing.
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
for bucket in "$S3_BUCKET_BRONZE" "$S3_BUCKET_SILVER" "$S3_BUCKET_GOLD" "$S3_BUCKET_UPLOADS" "$S3_BUCKET_DOCUMENT_SHARE"; do
  mc mb --ignore-existing "local/$bucket" >/dev/null
done

cat > /tmp/plainledger-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation", "s3:GetBucketCors", "s3:PutBucketCors"],
      "Resource": ["arn:aws:s3:::$S3_BUCKET_BRONZE", "arn:aws:s3:::$S3_BUCKET_SILVER", "arn:aws:s3:::$S3_BUCKET_GOLD", "arn:aws:s3:::$S3_BUCKET_UPLOADS", "arn:aws:s3:::$S3_BUCKET_DOCUMENT_SHARE"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"],
      "Resource": ["arn:aws:s3:::$S3_BUCKET_BRONZE/*", "arn:aws:s3:::$S3_BUCKET_SILVER/*", "arn:aws:s3:::$S3_BUCKET_GOLD/*", "arn:aws:s3:::$S3_BUCKET_UPLOADS/*", "arn:aws:s3:::$S3_BUCKET_DOCUMENT_SHARE/*"]
    }
  ]
}
EOF

mc admin policy create local plainledger-application /tmp/plainledger-policy.json >/dev/null
mc admin user add local "$MINIO_APP_ACCESS_KEY" "$MINIO_APP_SECRET_KEY" >/dev/null
mc admin policy attach local plainledger-application --user "$MINIO_APP_ACCESS_KEY" >/dev/null

# Financial datasets and shared documents stay private. The application's
# uploads bucket is for public logos/avatars and returns unsigned public URLs.
for bucket in "$S3_BUCKET_BRONZE" "$S3_BUCKET_SILVER" "$S3_BUCKET_GOLD" "$S3_BUCKET_DOCUMENT_SHARE"; do
  mc anonymous set none "local/$bucket" >/dev/null
done
mc anonymous set download "local/$S3_BUCKET_UPLOADS" >/dev/null
rm -f /tmp/plainledger-policy.json
printf '%s\n' 'Storage buckets and application policy initialized.'
