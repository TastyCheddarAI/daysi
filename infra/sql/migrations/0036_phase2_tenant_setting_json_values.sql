alter table tenant_setting
  drop constraint if exists tenant_setting_value_type_check;

alter table tenant_setting
  add constraint tenant_setting_value_type_check
  check (value_type in ('boolean', 'number', 'string', 'string_array', 'json'));
