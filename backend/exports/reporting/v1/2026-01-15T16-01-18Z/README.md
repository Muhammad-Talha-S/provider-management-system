# Reporting Data Export (CSV)

Generated at (UTC): 2026-01-15T16-01-18Z
Schema version: v1

## Files
- providers.csv
- users.csv
- contracts.csv
- contract_awards.csv
- contract_offers.csv
- service_requests.csv
- service_offers.csv
- service_orders.csv
- service_order_change_requests.csv
- activity_logs.csv
- data_dictionary.csv
- README.md

## Join keys (recommended)
- provider_id appears on most tables for easy joins
- contracts: contract_id
- procurement: service_request_id, service_offer_id, service_order_id

## Notes
- JSON fields are flattened:
  - lists -> "a | b | c"
  - dicts -> JSON string
- This is a full snapshot export.
