module "cost_guardrails" {
  source = "../../modules/cost-guardrails"

  environment           = local.environment
  project_name          = var.project_name
  monthly_budget_amount = var.monthly_budget_amount
  budget_alert_emails   = var.billing_alert_emails
  tags                  = local.common_tags
}

module "vpc" {
  source = "../../modules/vpc"

  environment        = local.environment
  project_name       = var.project_name
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  tags               = local.common_tags
}

module "aurora" {
  source = "../../modules/aurora"

  environment              = local.environment
  project_name             = var.project_name
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  min_capacity             = 0.5
  max_capacity             = 4
  backup_retention_period  = 7
  skip_final_snapshot      = true
  deletion_protection      = false
  tags                     = local.common_tags
}

module "ecs" {
  source = "../../modules/ecs"

  environment             = local.environment
  project_name            = var.project_name
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  public_subnet_ids       = module.vpc.public_subnet_ids
  task_cpu                = "256"
  task_memory             = "512"
  desired_count           = 1
  min_capacity            = 1
  max_capacity            = 4
  alarm_email             = var.alarm_email
  database_url_secret_arn = module.aurora.database_url_secret_arn
  tags                    = local.common_tags
}

module "cognito" {
  source = "../../modules/cognito"

  environment  = local.environment
  project_name = var.project_name
  domain_name  = "daysi"
  tags         = local.common_tags
}

module "s3" {
  source = "../../modules/s3"

  environment  = local.environment
  project_name = var.project_name
  tags         = local.common_tags
}
