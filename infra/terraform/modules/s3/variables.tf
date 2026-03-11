variable "environment" {
  description = "Environment name (nonprod or prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for naming resources"
  type        = string
  default     = "daysi"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
