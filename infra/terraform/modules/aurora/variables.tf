variable "environment" {
  description = "Environment name (nonprod or prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for naming resources"
  type        = string
  default     = "daysi"
}

variable "vpc_id" {
  description = "VPC ID where Aurora cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for Aurora cluster"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "List of security group IDs allowed to connect to Aurora"
  type        = list(string)
  default     = []
}

variable "database_name" {
  description = "Name of the default database"
  type        = string
  default     = "daysi"
}

variable "master_username" {
  description = "Master database username"
  type        = string
  default     = "daysi_admin"
}

variable "min_capacity" {
  description = "Minimum Aurora capacity units (ACU)"
  type        = number
  default     = 0.5
}

variable "max_capacity" {
  description = "Maximum Aurora capacity units (ACU)"
  type        = number
  default     = 4
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "preferred_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "preferred_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when destroying (dev only)"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
