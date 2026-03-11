alter table learning_entitlement
  add column if not exists customer_name text not null default '';

alter table learning_entitlement
  add column if not exists granted_by_user_id uuid references app_user(id) on delete set null;

create index if not exists learning_entitlement_source_order_idx
  on learning_entitlement (source_sales_order_id)
  where source_sales_order_id is not null;

create index if not exists learning_entitlement_membership_idx
  on learning_entitlement (membership_subscription_id)
  where membership_subscription_id is not null;
