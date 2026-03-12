variable "aws_region" {
  description = "AWS region for the environment."
  type        = string
  default     = "ca-central-1"
}

variable "project_name" {
  description = "Project name."
  type        = string
  default     = "daysi"
}

variable "billing_alert_emails" {
  description = "Budget alert recipients."
  type        = list(string)
  default     = []
}

variable "monthly_budget_amount" {
  description = "Prod monthly budget in USD."
  type        = number
  default     = 1500
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications."
  type        = string
  default     = null
}
