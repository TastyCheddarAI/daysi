alter table credit_entry
  drop constraint if exists credit_entry_entry_type_check;

alter table credit_entry
  add constraint credit_entry_entry_type_check
  check (entry_type in ('grant', 'redeem', 'adjustment', 'refund', 'restore'));

alter table credit_entry
  add column if not exists granted_by_user_id uuid references app_user(id) on delete set null;
