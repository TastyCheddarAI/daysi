output "cluster_id" {
  description = "ID of the Aurora cluster"
  value       = aws_rds_cluster.aurora.id
}

output "cluster_arn" {
  description = "ARN of the Aurora cluster"
  value       = aws_rds_cluster.aurora.arn
}

output "cluster_endpoint" {
  description = "Writer endpoint of the Aurora cluster"
  value       = aws_rds_cluster.aurora.endpoint
}

output "cluster_reader_endpoint" {
  description = "Reader endpoint of the Aurora cluster"
  value       = aws_rds_cluster.aurora.reader_endpoint
}

output "database_name" {
  description = "Name of the default database"
  value       = aws_rds_cluster.aurora.database_name
}

output "master_username" {
  description = "Master database username"
  value       = aws_rds_cluster.aurora.master_username
}

output "master_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing master password"
  value       = aws_secretsmanager_secret.master_password.arn
}

output "database_url_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the full DATABASE_URL connection string"
  value       = aws_secretsmanager_secret.database_url.arn
}

output "security_group_id" {
  description = "ID of the Aurora security group"
  value       = aws_security_group.aurora.id
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.aurora.name
}

output "port" {
  description = "Database port"
  value       = 5432
}
