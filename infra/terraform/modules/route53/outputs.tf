output "hosted_zone_id" {
  description = "Route 53 Hosted Zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "Route 53 name servers - update these in GoDaddy"
  value       = aws_route53_zone.main.name_servers
}

output "certificate_arn" {
  description = "ACM Certificate ARN (if created)"
  value       = var.create_certificate ? aws_acm_certificate.main[0].arn : null
}

output "certificate_status" {
  description = "ACM Certificate status"
  value       = var.create_certificate ? aws_acm_certificate_validation.main[0].id : null
}
