output "assets_bucket_id" {
  description = "Assets S3 bucket ID"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "Assets S3 bucket ARN"
  value       = aws_s3_bucket.assets.arn
}

output "archives_bucket_id" {
  description = "Archives S3 bucket ID"
  value       = aws_s3_bucket.archives.id
}

output "archives_bucket_arn" {
  description = "Archives S3 bucket ARN"
  value       = aws_s3_bucket.archives.arn
}

output "exports_bucket_id" {
  description = "Exports S3 bucket ID"
  value       = aws_s3_bucket.exports.id
}

output "exports_bucket_arn" {
  description = "Exports S3 bucket ARN"
  value       = aws_s3_bucket.exports.arn
}
