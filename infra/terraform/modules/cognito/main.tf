locals {
  common_tags = merge(
    var.tags,
    {
      Module = "cognito"
    }
  )
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  # Username configuration
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Verification message template
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your verification code"
    email_message        = "Your verification code is {####}"
  }

  # Admin create user configuration
  admin_create_user_config {
    allow_admin_create_user_only = false

    invite_message_template {
      email_subject = "Welcome to Daysi"
      email_message = "Your username is {username} and temporary password is {####}"
      sms_message   = "Welcome to Daysi! Your username is {username} and temporary password is {####}"
    }
  }

  # Schema attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true
  }

  schema {
    name                = "given_name"
    attribute_data_type = "String"
    mutable             = true
    required            = false
  }

  schema {
    name                = "family_name"
    attribute_data_type = "String"
    mutable             = true
    required            = false
  }

  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}"
    }
  )
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-${random_id.domain.hex}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "random_id" "domain" {
  byte_length = 4
}

# Web Client
resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project_name}-${var.environment}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  # OAuth flows
  allowed_oauth_flows = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = ["openid", "email", "profile"]

  # Callback and logout URLs (placeholder - update with actual domain)
  callback_urls = ["http://localhost:8080/callback", "https://${var.domain_name}.ca/callback"]
  logout_urls   = ["http://localhost:8080", "https://${var.domain_name}.ca"]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Token validity
  refresh_token_validity = 30
  access_token_validity  = 1
  id_token_validity      = 1

  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
    id_token      = "hours"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Generate secret
  generate_secret = false

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

# API Client (for machine-to-machine)
resource "aws_cognito_user_pool_client" "api" {
  name         = "${var.project_name}-${var.environment}-api"
  user_pool_id = aws_cognito_user_pool.main.id

  # No OAuth for API client
  allowed_oauth_flows  = []
  allowed_oauth_scopes = []

  # Token validity
  refresh_token_validity = 30
  access_token_validity  = 1

  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Generate secret for API client
  generate_secret = true

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# Admin Group
resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrators with full access"
  precedence   = 1
}

# Provider Group
resource "aws_cognito_user_group" "provider" {
  name         = "provider"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Service providers"
  precedence   = 2
}

# Customer Group
resource "aws_cognito_user_group" "customer" {
  name         = "customer"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Customers"
  precedence   = 3
}

# Resource Server for custom scopes
resource "aws_cognito_resource_server" "api" {
  identifier = "${var.project_name}-${var.environment}-api"
  name       = "${var.project_name}-${var.environment}-api"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read access"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access"
  }

  scope {
    scope_name        = "admin"
    scope_description = "Admin access"
  }
}
