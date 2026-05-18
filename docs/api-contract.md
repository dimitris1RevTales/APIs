# PMS Sync API Contract (v1)

This file translates the PRD into an implementation-ready API contract for engineering.

Scope: HTTP Cloud Function (`pms_sync_api`) for PMS pull sync.

## Base

- Base path: `/api/v1`
- Host: `https://travelagents-pms-integration-670805103288.europe-west1.run.app`
- Auth header: `Authorization: Bearer <API_KEY>`
- Content type: `application/json`

## Auth and Authorization Rules

- API key must exist and be `active`.
- API key maps to one PMS-hotel scope.
- Requested `hotel_id` must match key `hotel_id`.
- Event queries must always filter by key `pms_id`.
- Never log raw API keys.

## Endpoint 1: List Pending Reservations

- Method: `GET`
- Path: `/api/v1/reservations/pending`
- Query params:
  - `hotel_id` (required, string)
  - `limit` (optional, int, default `100`, max `500`)
  - `page_token` (optional, string)

### Success Response (200)

```json
{
  "api_version": "v1",
  "hotel_id": "9b767697-4f60-4b78-b387-b6f69ccdb7bc",
  "next_page_token": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNS0xN1QxMDozMDo0MloiLCJldmVudF9pZCI6ImU0ZTQifQ==",
  "reservations": [
    {
      "event_id": "e4e4b3bc-4d2a-4b41-b8b8-69f4f5f51309",
      "booking_id": "d2f0ee30-f7aa-4d39-9df9-f181ec4cf5f9",
      "sync_type": "NEW",
      "updated_at": "2026-05-17T10:30:42Z"
    }
  ]
}
```

### Query Behavior

- Filter by:
  - `pms_id = api_key.pms_id`
  - `hotel_id = query.hotel_id`
  - `sync_status = PENDING`
- Sort by `created_at ASC`.
- Use cursor pagination based on `created_at` + `event_id`.

## Endpoint 1b: List Pending Reservations (Full Payload)

- Method: `GET`
- Path: `/api/v1/reservations/pending/full`
- Query params:
  - `hotel_id` (required, string)
  - `limit` (optional, int, default `50`, max `200`)
  - `page_token` (optional, string)

### Success Response (200)

```json
{
  "api_version": "v1",
  "hotel_id": "9b767697-4f60-4b78-b387-b6f69ccdb7bc",
  "next_page_token": "eyJkb2NfaWQiOiIuLi4ifQ==",
  "meta": {
    "missing_reservations": 0,
    "returned_count": 1
  },
  "items": [
    {
      "event_id": "e4e4b3bc-4d2a-4b41-b8b8-69f4f5f51309",
      "booking_id": "d2f0ee30-f7aa-4d39-9df9-f181ec4cf5f9",
      "sync_type": "NEW",
      "event_created_at": "2026-05-17T10:30:42Z",
      "reservation": {
        "booking_id": "d2f0ee30-f7aa-4d39-9df9-f181ec4cf5f9",
        "external_booking_id": "AGENCY-9988",
        "hotel_name": "ABC",
        "hotel_id": "9b767697-4f60-4b78-b387-b6f69ccdb7bc",
        "room_name": "Double Room",
        "room_id": "DBL",
        "board_name": "Bed & Breakfast",
        "board_id": 3,
        "rate": "500",
        "currency": "EUR",
        "guest_name": "John Smith",
        "number_of_pax": 3,
        "number_of_adults": 2,
        "number_of_kids": 1,
        "number_of_infants": 0,
        "booking_date": "2026-05-16T10:00:00Z",
        "check_in_date": "2026-06-01",
        "check_out_date": "2026-06-05",
        "source": "Travel Agency ABC",
        "status": "CONFIRMED",
        "special_requests": "",
        "cancellation_reason": null,
        "updated_at": "2026-05-16T10:00:00Z"
      }
    }
  ]
}
```

## Endpoint 2: Get Reservation Details

- Method: `GET`
- Path: `/api/v1/reservations/{booking_id}`
- Query params:
  - `hotel_id` (required, string)

### Success Response (200)

```json
{
  "booking_id": "d2f0ee30-f7aa-4d39-9df9-f181ec4cf5f9",
  "external_booking_id": "AGENCY-9988",
  "hotel_name": "ABC",
  "hotel_id": "9b767697-4f60-4b78-b387-b6f69ccdb7bc",
  "room_name": "Double Room",
  "room_id": "DBL",
  "board_name": "Bed & Breakfast",
  "board_id": 3,
  "rate": 500,
  "currency": "EUR",
  "guest_name": "John Smith",
  "number_of_pax": 3,
  "number_of_adults": 2,
  "number_of_kids": 1,
  "number_of_infants": 0,
  "booking_date": "2026-05-16T10:00:00Z",
  "check_in_date": "2026-06-01",
  "check_out_date": "2026-06-05",
  "source": "Travel Agency ABC",
  "status": "CONFIRMED",
  "special_requests": "Late arrival",
  "cancellation_reason": null,
  "updated_at": "2026-05-16T10:00:00Z"
}
```

### Mapping Rules

- Preserve source fields where available.
- Normalize board data:
  - map `board_type`/`board_name` from ingestion into output `board_name`.
  - derive `board_id` from fixed mapping table.
- Keep naming consistent for tour operator/source fields.

## Endpoint 3: Confirm Reservation Sync

- Method: `POST`
- Path: `/api/v1/reservations/{booking_id}/sync`
- Body:

```json
{
  "event_id": "e4e4b3bc-4d2a-4b41-b8b8-69f4f5f51309",
  "status": "success",
  "pms_reference": "THEOVA-55521"
}
```

### Success Response (200)

```json
{
  "api_version": "v1",
  "booking_id": "d2f0ee30-f7aa-4d39-9df9-f181ec4cf5f9",
  "event_id": "e4e4b3bc-4d2a-4b41-b8b8-69f4f5f51309",
  "sync_status": "ACKNOWLEDGED",
  "synced_at": "2026-05-17T10:35:11Z",
  "idempotent": true
}
```

### Idempotency Contract

- If event already `ACKNOWLEDGED`, return `200` with current state.
- Otherwise:
  - update event: `sync_status=ACKNOWLEDGED`, `synced_at`, `pms_reference`
  - update reservation: `last_synced_at`, `pms_references[pms_id]=pms_reference` (if provided)

## Error Contract

Standard error response:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid API key",
    "request_id": "req_01J0Y8Q0M9AF2W6ZV4M0X4GQ6T"
  }
}
```

HTTP status mapping:

- `401`: missing/invalid key
- `403`: hotel unauthorized for key
- `404`: booking/event not found
- `409`: invalid state transition
- `422`: validation error
- `500`: internal error

## Logging Contract

Log fields per request:

- `request_id`
- `api_key_id` (never raw key)
- `pms_id`
- `hotel_id`
- `endpoint`
- `booking_id` (if applicable)
- `event_id` (if applicable)
- `status_code`
- `latency_ms`
- `error`

## Firestore Queries and Indexes

Required composite indexes:

1. `pms_sync_events`
   - `pms_id` ASC
   - `hotel_id` ASC
   - `sync_status` ASC
   - `created_at` ASC

2. `reservations`
   - `booking_id` ASC
   - `hotel_id` ASC

## Current vs Target Notes

- Current ingestion writes `NEW`/`MOD`/`CL` `PENDING` events based on lifecycle detection.
- Contract is implemented in `cloud-function/pms_api.py` and should be validated end-to-end after deployment.
- Current auth model uses plaintext `api_key` lookup in Firestore; PRD hash/secret migration is pending.
