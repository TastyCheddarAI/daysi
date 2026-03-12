variable "environment" {
  description = "Environment name (nonprod or prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for naming resources"
  type        = string
  default     = "daysi"
}

variable "alb_dns_name" {
  description = "ALB DNS name used as the API origin"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID (e.g. Z35SXDOTRQ7X7K for us-east-1)"
  type        = string
  default     = "Z35SXDOTRQ7X7K"
}

variable "domain_name" {
  description = "Apex domain (e.g. daysi.ca). When set, apex + www + api Route53 records are created."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID. Required when domain_name is set."
  type        = string
  default     = null
}

variable "certificate_arn" {
  description = "ACM certificate ARN for the custom domain (must be in us-east-1)"
  type        = string
  default     = null
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
