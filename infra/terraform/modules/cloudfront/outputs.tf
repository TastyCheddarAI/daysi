output "distribution_id" {
  description = "CloudFront distribution ID (use as CLOUDFRONT_DISTRIBUTION_ID_PROD secret)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name (e.g. d1234.cloudfront.net)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route 53 ALIAS records (always Z2FDTNDATAQYW2)"
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
}

output "frontend_bucket_name" {
  description = "Name of the S3 bucket serving the frontend"
  value       = aws_s3_bucket.frontend.bucket
}
