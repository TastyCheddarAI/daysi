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
  vpc_cidr           = "10.1.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  tags               = local.common_tags
}

module "aurora" {
  source = "../../modules/aurora"

  environment              = local.environment
  project_name             = var.project_name
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  min_capacity             = 1
  max_capacity             = 8
  backup_retention_period  = 30
  skip_final_snapshot      = false
  deletion_protection      = true
  tags                     = local.common_tags
}

module "ecs" {
  source = "../../modules/ecs"

  environment        = local.environment
  project_name       = var.project_name
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  task_cpu           = "512"
  task_memory        = "1024"
  desired_count      = 2
  enable_deletion_protection = true
  tags               = local.common_tags
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

module "route53" {
  source = "../../modules/route53"

  environment      = local.environment
  project_name     = var.project_name
  domain_name      = "daysi.ca"
  alb_dns_name     = module.ecs.alb_dns_name
  alb_zone_id      = "Z35SXDOTRQ7X7K"  # us-east-1 ALB zone ID
  create_certificate = true
  tags             = local.common_tags
}
