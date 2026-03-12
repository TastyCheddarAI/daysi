variable "environment" {
  description = "Environment name (nonprod or prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for naming resources"
  type        = string
  default     = "daysi"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "daysi.ca"
}

variable "alb_dns_name" {
  description = "ALB DNS name to point domain to"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
}

variable "manage_apex_records" {
  description = "When false, the apex and www A records are NOT created here — another module (e.g. cloudfront) manages them"
  type        = bool
  default     = true
}

variable "create_certificate" {
  description = "Whether to create ACM certificate"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
