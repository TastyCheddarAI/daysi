variable "environment" {
  description = "Environment name, for example nonprod or prod."
  type        = string
}

variable "project_name" {
  description = "Project name used for naming and tagging."
  type        = string
}

variable "monthly_budget_amount" {
  description = "Monthly AWS budget in USD for this environment."
  type        = number
}

variable "budget_alert_emails" {
  description = "Email recipients for budget alerts."
  type        = list(string)
  default     = []
}

variable "budget_thresholds" {
  description = "Threshold percentages for budget notifications."
  type        = list(number)
  default     = [50, 80, 100]
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
