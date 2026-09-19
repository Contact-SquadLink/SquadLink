# API Security Test Plan

**Project:** Delivery System  
**Role:** Security & Integration Engineer — Member 3  
**Purpose:** Test the backend API for authentication, authorization, input validation, business-logic security, failure handling, and common API security weaknesses.

---

## 1. Authentication Testing

| Test | Expected Result | Actual Result | Status |
|---|---|---|---|
| Correct username and password | Login succeeds | Pending backend API | ⏳ |
| Incorrect password | Login rejected | Pending backend API | ⏳ |
| Missing username | Request rejected | Pending backend API | ⏳ |
| Missing password | Request rejected | Pending backend API | ⏳ |
| Missing authentication token | Protected endpoint rejects request | Pending backend API | ⏳ |
| Invalid JWT/token | Request rejected | Pending backend API | ⏳ |
| Expired JWT/token | Request rejected | Pending backend API | ⏳ |
| Malformed authentication token | Request rejected safely | Pending backend API | ⏳ |

---

## 2. Authorization & Access Control Testing

The purpose of these tests is to verify that authenticated users can only access resources and operations allowed for their role.

| Test | Expected Result | Actual Result | Status |
|---|---|---|---|
| Customer accesses customer endpoint | Access granted | Pending backend API | ⏳ |
| Customer accesses rider endpoint | Access denied | Pending backend API | ⏳ |
| Customer accesses admin endpoint | Access denied | Pending backend API | ⏳ |
| Rider accesses rider endpoint | Access granted | Pending backend API | ⏳ |
| Rider accesses customer-only endpoint | Access denied | Pending backend API | ⏳ |
| Rider accesses admin endpoint | Access denied | Pending backend API | ⏳ |
| Business accesses own catalogue | Access granted | Pending backend API | ⏳ |
| Business accesses another business catalogue | Access denied | Pending backend API | ⏳ |
| Normal user accesses admin functionality | Access denied | Pending backend API | ⏳ |

---

## 3. Resource Ownership Testing

These tests verify that users cannot access or modify another user's resources.

### Customer Orders

- [ ] Customer A can access Customer A's own order.
- [ ] Customer A cannot access Customer B's order.
- [ ] Customer A cannot modify Customer B's order.
- [ ] Customer A cannot cancel Customer B's order.

### Business Catalogue

- [ ] Business A can manage its own catalogue.
- [ ] Business A cannot modify Business B's catalogue.
- [ ] Business A cannot delete Business B's products.
- [ ] Business A cannot modify Business B's inventory.

### Rider Deliveries

- [ ] Rider A can view their assigned delivery.
- [ ] Rider A cannot access Rider B's delivery.
- [ ] Rider A cannot complete Rider B's delivery.
- [ ] Rider A cannot change another rider's availability.

---

## 4. Input Validation Testing

The API should reject invalid or unexpected input before processing it.

| Test | Expected Result | Actual Result | Status |
|---|---|---|---|
| Empty required field | Request rejected | Pending backend API | ⏳ |
| Invalid user ID | Request rejected | Pending backend API | ⏳ |
| Invalid order ID | Request rejected | Pending backend API | ⏳ |
| Negative quantity | Request rejected | Pending backend API | ⏳ |
| Quantity of zero | Request rejected | Pending backend API | ⏳ |
| Invalid OTP | Request rejected | Pending backend API | ⏳ |
| Missing OTP | Request rejected | Pending backend API | ⏳ |
| Malformed JSON | Request rejected safely | Pending backend API | ⏳ |
| Unexpected data type | Request rejected | Pending backend API | ⏳ |
| Unexpected/unsupported value | Request rejected | Pending backend API | ⏳ |

---

## 5. JWT & Session Security

For the current backend JWT authentication, verify:

- [ ] Protected endpoints require authentication.
- [ ] Invalid tokens are rejected.
- [ ] Expired tokens are rejected.
- [ ] Tokens cannot be modified to gain another user's privileges.
- [ ] User roles are not trusted solely from client-controlled data.
- [ ] Sensitive tokens are not exposed in API responses unnecessarily.
- [ ] Logout/token invalidation works where required.
- [ ] JWT secrets are stored through environment configuration.
- [ ] Authentication errors do not reveal sensitive information.

---

## 6. OTP Security

For pickup and delivery verification:

- [ ] Correct OTP is accepted.
- [ ] Incorrect OTP is rejected.
- [ ] Missing OTP is rejected.
- [ ] Expired OTP is rejected.
- [ ] OTP cannot be reused after successful verification.
- [ ] OTP attempts are protected against excessive guessing.
- [ ] OTP values are not unnecessarily exposed in API responses.
- [ ] OTPs are not stored or logged insecurely.

---

## 7. Order & Delivery Business Logic Testing

Verify that the delivery workflow follows the correct state transitions.

| Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|
| Complete order before pickup | Rejected | Pending backend API | ⏳ |
| Complete order with invalid OTP | Rejected | Pending backend API | ⏳ |
| Complete order with valid OTP | Allowed when state is correct | Pending backend API | ⏳ |
| Accept already assigned delivery | Rejected | Pending backend API | ⏳ |
| Unauthorized rider completes delivery | Rejected | Pending backend API | ⏳ |
| Failed delivery is settled immediately | Rejected/blocked | Pending backend API | ⏳ |
| Invalid order status transition | Rejected | Pending backend API | ⏳ |
| Repeat sensitive operation | Safely rejected/idempotent | Pending backend API | ⏳ |

---

## 8. Failure-Path Testing

### Item Unavailable

Expected behavior:

1. Rider reports item unavailable.
2. System records the incident.
3. Fulfillment process can be triggered again where appropriate.

- [ ] Incident is recorded.
- [ ] Unauthorized users cannot create/modify incidents.
- [ ] Order remains in a valid state.

### Rider Decline

Expected behavior:

1. Rider declines delivery.
2. System records the decline.
3. Another suitable rider can be considered.

- [ ] Decline is recorded.
- [ ] Dispatch can search for another rider.
- [ ] Unauthorized users cannot manipulate the assignment.

### Rider Timeout

Expected behavior:

1. Rider does not respond.
2. Request expires.
3. Another suitable rider can be considered.

- [ ] Timeout is handled.
- [ ] Delivery does not become incorrectly completed.
- [ ] Assignment state remains consistent.

### Invalid Pickup Code

- [ ] Invalid pickup code is rejected.
- [ ] Pickup is not marked as verified.
- [ ] Security event is logged where required.

### Invalid Delivery OTP

- [ ] Invalid OTP is rejected.
- [ ] Delivery remains incomplete.
- [ ] Settlement remains blocked.

### Failed Delivery

- [ ] Failed delivery is recorded.
- [ ] Settlement remains blocked where required.
- [ ] Admin/support can investigate.

---

## 9. API Rate-Limit & Abuse Testing

The backend currently includes rate-limiting support.

Test sensitive endpoints for excessive requests:

- [ ] Login requests are protected against excessive attempts.
- [ ] OTP verification is protected against excessive attempts.
- [ ] Sensitive operations cannot be repeatedly abused.
- [ ] API returns an appropriate response when the rate limit is exceeded.
- [ ] Rate limiting does not expose sensitive system information.

---

## 10. API Error Handling

Verify that errors are handled safely.

- [ ] Invalid requests return appropriate HTTP status codes.
- [ ] Unauthorized requests return an appropriate response.
- [ ] Forbidden requests return an appropriate response.
- [ ] Invalid IDs do not cause server crashes.
- [ ] Database errors do not expose database credentials.
- [ ] Errors do not expose stack traces in production.
- [ ] Errors do not reveal passwords, tokens, API keys, or other secrets.
- [ ] Error responses remain understandable without exposing internal implementation details.

---

## 11. Sensitive Data Exposure

Check API responses for unnecessary sensitive information.

- [ ] Password hashes are never returned.
- [ ] JWT secrets are never returned.
- [ ] API keys are never returned.
- [ ] Database credentials are never returned.
- [ ] Internal database details are not unnecessarily exposed.
- [ ] Sensitive user information is only returned to authorized users.
- [ ] Notification responses do not unnecessarily expose sensitive information.

---

## 12. Security Headers & CORS

Verify the backend security configuration:

- [ ] Helmet/security headers are enabled.
- [ ] CORS allows only appropriate origins.
- [ ] Unauthorized origins are handled appropriately.
- [ ] Production configuration does not allow unnecessarily broad access.

---

## 13. Logging & Audit Testing

The system includes database structures for audit logs and security-related events.

Verify:

- [ ] Failed authentication attempts can be logged.
- [ ] Unauthorized access attempts can be logged.
- [ ] Invalid OTP attempts can be logged.
- [ ] Important order/delivery security events are logged.
- [ ] Logs do not contain passwords.
- [ ] Logs do not contain authentication tokens.
- [ ] Logs do not contain API secrets.
- [ ] Audit records cannot be modified by unauthorized users.

---

## 14. Notification Security

Verify:

- [ ] Notifications are delivered to the intended user.
- [ ] A user cannot access another user's notifications.
- [ ] Sensitive information is not unnecessarily included.
- [ ] Notification events are correctly identified.
- [ ] Failed notification attempts are handled safely.
- [ ] Duplicate sensitive notifications are controlled where required.

---

## 15. Dependency & Configuration Review

Before deployment:

- [ ] Backend dependencies reviewed for known vulnerabilities.
- [ ] `.env` is excluded from Git.
- [ ] Secrets are stored through environment variables.
- [ ] Production secrets are not committed to GitHub.
- [ ] Development credentials are not reused in production.
- [ ] Production configuration is reviewed.

---

# 16. Vulnerability Reporting

When a security issue is discovered, record it using the following format:

### Issue Title
Brief description of the vulnerability.

### Endpoint
Example:

`POST /api/orders`

### Severity
Low / Medium / High / Critical

### Description
Explain what went wrong.

### Steps to Reproduce

1. Authenticate as the test user.
2. Send the request.
3. Modify the relevant ID/parameter.
4. Observe the response.

### Expected Result
Explain what the system should have done.

### Actual Result
Explain what the system actually did.

### Security Impact
Explain what an attacker could potentially access or modify.

### Recommendation
Explain how the backend should prevent the issue.

### Retest Result
Record the result after the backend developer fixes the issue.

---

# 17. Final Security Review

Before deployment, all applicable tests must be reviewed.

- [ ] Authentication security verified.
- [ ] Authorization verified.
- [ ] Resource ownership verified.
- [ ] Input validation verified.
- [ ] JWT/session security verified.
- [ ] OTP security verified.
- [ ] Order workflow security verified.
- [ ] Delivery workflow security verified.
- [ ] Failure paths verified.
- [ ] Rate limiting verified.
- [ ] API error handling verified.
- [ ] Sensitive data exposure reviewed.
- [ ] Security headers reviewed.
- [ ] CORS reviewed.
- [ ] Logging/audit controls reviewed.
- [ ] Notification security reviewed.
- [ ] Dependencies reviewed.
- [ ] Deployment configuration reviewed.
- [ ] Final security checklist reviewed.

---

## Security Test Status

**Current Status:** Static/security test preparation completed.

**Syntax Status:** `api-security-tests.js` syntax verified.

**Live API Status:** BLOCKED — PostgreSQL is not currently available. The API test suite has not been executed, and no live API tests are marked as passed.

**Role:** Security & Integration Engineer — Member 3

**Project:** Delivery System

**Note:** Tests marked as pending will be executed against the real backend API once PostgreSQL and the backend endpoints are available. Standalone authentication, authorization, input-validation, failure-path, and notification scenarios are prepared in this security module; their presence is not evidence of live API success.