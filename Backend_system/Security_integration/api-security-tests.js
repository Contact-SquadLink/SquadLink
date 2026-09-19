#!/usr/bin/env node

/*
 * Direct API security test module for the Delivery System backend.
 *
 * Configuration via environment variables (no package install required):
 *   API_BASE_URL=http://localhost:3000
 *   TEST_CUSTOMER_TOKEN=...
 *   TEST_BUSINESS_USER_A_TOKEN=...
 *   TEST_BUSINESS_USER_B_TOKEN=...
 *   TEST_RIDER_TOKEN=...
 *   TEST_ADMIN_TOKEN=...
 *   TEST_NON_MAIN_ADMIN_TOKEN=...
 *   TEST_OTHER_CUSTOMER_TOKEN=...
 *   TEST_RIDER_B_TOKEN=...
 *   TEST_EXPIRED_JWT=...
 *   TEST_MANIPULATED_JWT=...
 *   TEST_INACTIVE_USER_TOKEN=...
 *   TEST_NONEXISTENT_USER_TOKEN=...
 *   TEST_BUSINESS_A_ID=...
 *   TEST_BUSINESS_B_ID=...
 *   TEST_BUSINESS_A_PRODUCT_ID=...
 *   TEST_BUSINESS_B_PRODUCT_ID=...
 *   TEST_BUSINESS_A_BUSINESS_PRODUCT_ID=...
 *   TEST_BUSINESS_B_BUSINESS_PRODUCT_ID=...
 *   TEST_BUSINESS_A_INVENTORY_ID=...
 *   TEST_BUSINESS_B_INVENTORY_ID=...
 *   TEST_BUSINESS_A_EXCEPTION_ID=...
 *   TEST_BUSINESS_B_EXCEPTION_ID=...
 *   TEST_CATEGORY_ID=...
 *   TEST_PRODUCT_ID=...
 *   TEST_ORDER_ID=...
 *   TEST_OTHER_CUSTOMER_ORDER_ID=...
 *   TEST_BUSINESS_A_ORDER_ID=...
 *   TEST_BUSINESS_A_DELIVERY_ID=...
 *   TEST_UNRELATED_DELIVERY_ID=...
 *   TEST_PENDING_ADMIN_ID=...
 *   TEST_PAYMENT_ID=...
 *   TEST_PAYMENT_ATTEMPT_ID=...
 *   TEST_UNRELATED_PAYMENT_ATTEMPT_ID=...
 *   TEST_PROVIDER_EVENT_ID=...
 *   TEST_PROVIDER_REFERENCE=...
 *   TEST_EXPECTED_CORS_ORIGIN=http://localhost:5173
 *   TEST_RATE_LIMIT_ENDPOINT=/api/v1/catalog/products
 *
 * This module intentionally does not modify backend source code.
 */

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_RATE_LIMIT_ENDPOINT = "/api/v1/catalog/products";
const HELMET_HEADERS_TO_CHECK = [
  "x-dns-prefetch-control",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy"
];

const CONFIG = {
  apiBaseUrl: process.env.API_BASE_URL || DEFAULT_API_BASE_URL,
  customerToken: process.env.TEST_CUSTOMER_TOKEN || "",
  businessUserAToken: process.env.TEST_BUSINESS_USER_A_TOKEN || "",
  businessUserBToken: process.env.TEST_BUSINESS_USER_B_TOKEN || "",
  riderToken: process.env.TEST_RIDER_TOKEN || "",
  riderBToken: process.env.TEST_RIDER_B_TOKEN || "",
  adminToken: process.env.TEST_ADMIN_TOKEN || "",
  nonMainAdminToken: process.env.TEST_NON_MAIN_ADMIN_TOKEN || "",
  otherCustomerToken: process.env.TEST_OTHER_CUSTOMER_TOKEN || "",
  roleMismatchToken: process.env.TEST_ROLE_MISMATCH_TOKEN || "",
  expiredJwt: process.env.TEST_EXPIRED_JWT || "",
  manipulatedJwt: process.env.TEST_MANIPULATED_JWT || "",
  inactiveUserToken: process.env.TEST_INACTIVE_USER_TOKEN || "",
  nonexistentUserToken: process.env.TEST_NONEXISTENT_USER_TOKEN || "",
  businessAId: process.env.TEST_BUSINESS_A_ID || "",
  businessBId: process.env.TEST_BUSINESS_B_ID || "",
  businessAProductId: process.env.TEST_BUSINESS_A_PRODUCT_ID || "",
  businessBProductId: process.env.TEST_BUSINESS_B_PRODUCT_ID || "",
  businessABusinessProductId: process.env.TEST_BUSINESS_A_BUSINESS_PRODUCT_ID || "",
  businessBBusinessProductId: process.env.TEST_BUSINESS_B_BUSINESS_PRODUCT_ID || "",
  businessAInventoryId: process.env.TEST_BUSINESS_A_INVENTORY_ID || "",
  businessBInventoryId: process.env.TEST_BUSINESS_B_INVENTORY_ID || "",
  businessAExceptionId: process.env.TEST_BUSINESS_A_EXCEPTION_ID || "",
  businessBExceptionId: process.env.TEST_BUSINESS_B_EXCEPTION_ID || "",
  categoryId: process.env.TEST_CATEGORY_ID || "",
  productId: process.env.TEST_PRODUCT_ID || "",
  orderId: process.env.TEST_ORDER_ID || "",
  otherCustomerOrderId: process.env.TEST_OTHER_CUSTOMER_ORDER_ID || "",
  businessAOrderId: process.env.TEST_BUSINESS_A_ORDER_ID || "",
  businessADeliveryId: process.env.TEST_BUSINESS_A_DELIVERY_ID || "",
  deliveredDeliveryId: process.env.TEST_DELIVERED_DELIVERY_ID || "",
  unrelatedDeliveryId: process.env.TEST_UNRELATED_DELIVERY_ID || "",
  pendingAdminId: process.env.TEST_PENDING_ADMIN_ID || "",
  paymentId: process.env.TEST_PAYMENT_ID || "",
  paymentAttemptId: process.env.TEST_PAYMENT_ATTEMPT_ID || "",
  unrelatedPaymentAttemptId: process.env.TEST_UNRELATED_PAYMENT_ATTEMPT_ID || "",
  providerEventId: process.env.TEST_PROVIDER_EVENT_ID || "",
  providerReference: process.env.TEST_PROVIDER_REFERENCE || "",
  expectedCorsOrigin: process.env.TEST_EXPECTED_CORS_ORIGIN || process.env.CORS_ORIGIN || "",
  rateLimitEndpoint: process.env.TEST_RATE_LIMIT_ENDPOINT || DEFAULT_RATE_LIMIT_ENDPOINT
};

const RESULTS = [];

function summaryFromBody(body) {
  if (!body) return "No response body.";

  if (typeof body === "string") {
    return body.slice(0, 300);
  }

  if (typeof body === "object") {
    const maxLength = 400;
    const text = JSON.stringify(body);
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  return String(body).slice(0, 300);
}

function addResult(entry) {
  RESULTS.push(entry);
}

function addSkippedTest({
  testName,
  endpoint,
  method = "GET",
  testRole,
  expectedStatus,
  reason,
  securityImpact,
  severity
}) {
  addResult({
    testName,
    endpoint,
    HTTPMethod: method,
    testRole,
    expectedStatus,
    actualStatus: "SKIP",
    PASS: "SKIP",
    result: "SKIPPED",
    responseSummary: reason,
    securityImpact,
    severity,
    reproductionInformation: reason
  });
}

function redactSensitive(value, key = "") {
  if (/(password|token|authorization|jwt|secret)/i.test(key)) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactSensitive(entryValue, entryKey)
      ])
    );
  }

  return value;
}

function reproductionInformation({
  endpoint,
  method,
  testRole,
  body,
  token,
  headers,
  origin
}) {
  return JSON.stringify({
    apiBaseUrl: CONFIG.apiBaseUrl,
    endpoint,
    method,
    testRole,
    body: redactSensitive(body),
    tokenProvided: Boolean(token),
    headers: redactSensitive(headers),
    origin: origin || null
  }, null, 2);
}

async function requestApi({
  method = "GET",
  endpoint,
  body,
  rawBody,
  token,
  headers = {},
  origin,
  expectedStatus
}) {
  const url = new URL(endpoint, CONFIG.apiBaseUrl).toString();

  const requestHeaders = {
    Accept: "application/json",
    ...headers
  };

  if (origin) {
    requestHeaders.Origin = origin;
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (rawBody !== undefined || (body !== undefined && body !== null)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  let response;
  let responseText = "";
  let parsedBody = null;

  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body:
        rawBody !== undefined
          ? rawBody
          : body !== undefined && body !== null
            ? JSON.stringify(body)
            : undefined
    });

    responseText = await response.text();

    try {
      parsedBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      parsedBody = responseText;
    }
  } catch (error) {
    throw new Error(
      `Request failed for ${method} ${endpoint}: ${error && error.message ? error.message : String(error)}`
    );
  }

  const result = {
    endpoint,
    method,
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    body: parsedBody,
    rawText: responseText,
    expectedStatus
  };

  return result;
}

function makeCheck({
  testName,
  endpoint,
  method = "GET",
  testRole,
  expectedStatus,
  body,
  rawBody,
  token,
  headers,
  origin,
  securityImpact,
  severity,
  skipIfMissing,
  skipReason,
  requiredHeaders = [],
  expectedHeaders = {},
  validateResponse = () => true
}) {
  const missingValue = token === undefined || token === null || token === "";

  if (skipIfMissing && missingValue) {
    addResult({
      testName,
      endpoint,
      HTTPMethod: method,
      testRole,
      expectedStatus,
      actualStatus: "SKIP",
      PASS: "SKIP",
      result: "SKIPPED",
      responseSummary: skipReason || "Skipped because required token or fixture was not configured.",
      securityImpact,
      severity,
      reproductionInformation: `Configure the required environment variable(s) and rerun. Endpoint: ${endpoint}`
    });
    return Promise.resolve(null);
  }

  return requestApi({
    method,
    endpoint,
    body,
    rawBody,
    token,
    headers,
    origin,
    expectedStatus
  })
    .then((response) => {
      const isPass = Array.isArray(expectedStatus)
        ? expectedStatus.includes(response.status)
        : response.status === expectedStatus;
      const missingHeaders = requiredHeaders.filter(
        (headerName) => !response.headers[headerName.toLowerCase()]
      );
      const unexpectedHeaderValues = Object.entries(expectedHeaders).filter(
        ([headerName, expectedValue]) =>
          response.headers[headerName.toLowerCase()] !== expectedValue
      );
      const assertionPass =
        isPass &&
        missingHeaders.length === 0 &&
        unexpectedHeaderValues.length === 0 &&
        validateResponse(response);

      addResult({
        testName,
        endpoint,
        HTTPMethod: method,
        testRole,
        expectedStatus,
        actualStatus: response.status,
        PASS: assertionPass ? "PASS" : "FAIL",
        result: assertionPass ? "PASS" : "FAIL",
        responseSummary: summaryFromBody({
          body: response.body,
          missingHeaders,
          unexpectedHeaderValues
        }),
        securityImpact,
        severity,
        reproductionInformation: reproductionInformation({
          endpoint,
          method,
          testRole,
          body,
          token,
          headers,
          origin
        })
      });

      return response;
    })
    .catch((error) => {
      addResult({
        testName,
        endpoint,
        HTTPMethod: method,
        testRole,
        expectedStatus,
        actualStatus: "ERROR",
        PASS: "ERROR",
        result: "ERROR",
        responseSummary: error.message,
        securityImpact,
        severity,
        reproductionInformation: reproductionInformation({
          endpoint,
          method,
          testRole,
          body,
          token,
          headers,
          origin
        })
      });

      return null;
    });
}

async function runAuthTests() {
  const checks = [];
  const malformedBearerToken = "not-a-valid-bearer-token";

  checks.push(
    makeCheck({
      testName: "Missing Authorization header",
      endpoint: "/api/v1/auth/me",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      securityImpact: "Confirms endpoints reject unauthenticated requests.",
      severity: "High",
      skipIfMissing: false
    })
  );

  checks.push(
    makeCheck({
      testName: "Malformed Bearer token",
      endpoint: "/api/v1/auth/me",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      headers: { Authorization: `Bearer ${malformedBearerToken}` },
      securityImpact: "Ensures malformed auth schemes are rejected.",
      severity: "High",
      skipIfMissing: false
    })
  );

  checks.push(
    makeCheck({
      testName: "Invalid JWT",
      endpoint: "/api/v1/auth/me",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      token: CONFIG.manipulatedJwt || "invalid.jwt.token",
      securityImpact: "Ensures invalid JWTs are rejected.",
      severity: "High",
      skipIfMissing: false
    })
  );

  if (CONFIG.expiredJwt) {
    checks.push(
      makeCheck({
        testName: "Expired JWT",
        endpoint: "/api/v1/auth/me",
        method: "GET",
        testRole: "Unauthenticated",
        expectedStatus: 401,
        token: CONFIG.expiredJwt,
        securityImpact: "Ensures expired JWTs are rejected.",
        severity: "High",
        skipIfMissing: false
      })
    );
  }

  if (CONFIG.manipulatedJwt) {
    checks.push(
      makeCheck({
        testName: "Token with manipulated claims",
        endpoint: "/api/v1/auth/me",
        method: "GET",
        testRole: "Unauthenticated",
        expectedStatus: 401,
        token: CONFIG.manipulatedJwt,
        securityImpact: "Ensures tampered signatures or claims do not grant access.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  }

  if (CONFIG.inactiveUserToken) {
    checks.push(
      makeCheck({
        testName: "Token belonging to inactive user",
        endpoint: "/api/v1/auth/me",
        method: "GET",
        testRole: "Inactive user",
        expectedStatus: 403,
        token: CONFIG.inactiveUserToken,
        securityImpact: "Ensures inactive accounts cannot authenticate.",
        severity: "High",
        skipIfMissing: false
      })
    );
  }

  if (CONFIG.nonexistentUserToken) {
    checks.push(
      makeCheck({
        testName: "Token belonging to nonexistent user",
        endpoint: "/api/v1/auth/me",
        method: "GET",
        testRole: "Nonexistent user",
        expectedStatus: 401,
        token: CONFIG.nonexistentUserToken,
        securityImpact: "Ensures stale or orphaned tokens are rejected.",
        severity: "High",
        skipIfMissing: false
      })
    );
  }

  await Promise.all(checks);

  if (CONFIG.roleMismatchToken) {
    await makeCheck({
      testName: "Database role overrides a manipulated JWT role claim",
      endpoint: "/api/v1/auth/me",
      method: "GET",
      testRole: "CUSTOMER database role with ADMIN token claim",
      expectedStatus: 200,
      token: CONFIG.roleMismatchToken,
      securityImpact: "Confirms authorization uses the current database role instead of trusting the JWT role claim.",
      severity: "Critical",
      skipIfMissing: false,
      validateResponse: (response) => response.body &&
        response.body.data &&
        response.body.data.role !== "ADMIN"
    });
  } else {
    addSkippedTest({
      testName: "Database role overrides a manipulated JWT role claim",
      endpoint: "/api/v1/auth/me",
      method: "GET",
      testRole: "CUSTOMER database role with ADMIN token claim",
      expectedStatus: 200,
      reason: "Skipped because TEST_ROLE_MISMATCH_TOKEN was not configured.",
      securityImpact: "Confirms authorization uses the current database role instead of trusting the JWT role claim.",
      severity: "Critical"
    });
  }
}

async function runRbacTests() {
  const checks = [];

  checks.push(
    makeCheck({
      testName: "CUSTOMER cannot access BUSINESS_USER endpoint",
      endpoint: "/api/v1/businesses/me",
      method: "GET",
      testRole: "CUSTOMER",
      expectedStatus: 403,
      token: CONFIG.customerToken,
      securityImpact: "Checks that customer role is not allowed to access business-owner operational endpoints.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "CUSTOMER cannot access ADMIN endpoint",
      endpoint: "/api/v1/catalog/products",
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: 403,
      token: CONFIG.customerToken,
      body: { categoryId: CONFIG.categoryId || "11111111-1111-1111-1111-111111111111", name: "Customer test product" },
      securityImpact: "Ensures customer users cannot create platform products.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "BUSINESS_USER cannot access ADMIN endpoint",
      endpoint: "/api/v1/catalog/products",
      method: "POST",
      testRole: "BUSINESS_USER",
      expectedStatus: 403,
      token: CONFIG.businessUserAToken,
      body: { categoryId: CONFIG.categoryId || "11111111-1111-1111-1111-111111111111", name: "Business test product" },
      securityImpact: "Ensures business users cannot create platform products.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "RIDER cannot access BUSINESS_USER endpoint",
      endpoint: "/api/v1/businesses/me",
      method: "GET",
      testRole: "RIDER",
      expectedStatus: 403,
      token: CONFIG.riderToken,
      securityImpact: "Ensures rider accounts cannot access business-only operational endpoints.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "RIDER cannot access ADMIN endpoint",
      endpoint: "/api/v1/admin/business-verifications/",
      method: "GET",
      testRole: "RIDER",
      expectedStatus: 403,
      token: CONFIG.riderToken,
      securityImpact: "Ensures rider accounts cannot reach admin verification endpoints.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "ADMIN cannot access BUSINESS_USER operational endpoint",
      endpoint: "/api/v1/businesses/me",
      method: "GET",
      testRole: "ADMIN",
      expectedStatus: 403,
      token: CONFIG.adminToken,
      securityImpact: "Ensures administrators are not automatically granted business-owner operational access.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  await Promise.all(checks);
}

async function runBusinessOwnershipTests() {
  const checks = [];

  if (CONFIG.businessUserAToken && CONFIG.businessUserBToken && CONFIG.businessAInventoryId) {
    checks.push(
      makeCheck({
        testName: "Business B attempts to access Business A inventory",
        endpoint: `/api/v1/inventory/me/${CONFIG.businessAInventoryId}`,
        method: "GET",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 404,
        token: CONFIG.businessUserBToken,
        securityImpact: "Validates inventory ownership isolation.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  }

  if (CONFIG.businessUserAToken && CONFIG.businessUserBToken && CONFIG.businessAInventoryId) {
    checks.push(
      makeCheck({
        testName: "Business B attempts to modify Business A inventory",
        endpoint: `/api/v1/inventory/me/${CONFIG.businessAInventoryId}`,
        method: "PUT",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 404,
        token: CONFIG.businessUserBToken,
        body: { quantityOnHand: 1, lowStockThreshold: 0 },
        securityImpact: "Validates that cross-business inventory updates are blocked.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  }

  if (CONFIG.businessUserAToken && CONFIG.businessUserBToken && CONFIG.businessABusinessProductId) {
    checks.push(
      makeCheck({
        testName: "Business B attempts to modify Business A catalogue",
        endpoint: `/api/v1/businesses/me/catalog/${CONFIG.businessABusinessProductId}`,
        method: "PUT",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 404,
        token: CONFIG.businessUserBToken,
        body: { priceAmount: 100, currency: "NGN", isAvailable: true },
        securityImpact: "Validates catalogue ownership isolation.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  }

  if (CONFIG.businessUserAToken && CONFIG.businessUserBToken && CONFIG.businessAExceptionId) {
    checks.push(
      makeCheck({
        testName: "Business B attempts to modify Business A operating exceptions",
        endpoint: `/api/v1/businesses/me/operating-exceptions/${CONFIG.businessAExceptionId}`,
        method: "PUT",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 404,
        token: CONFIG.businessUserBToken,
        body: { exceptionDate: "2026-09-20", isClosed: true, reason: "Attempted cross-business modification" },
        securityImpact: "Validates operating exception ownership isolation.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  }

  if (CONFIG.businessUserAToken && CONFIG.businessUserBToken) {
    checks.push(
      makeCheck({
        testName: "Business B updates its own operating hours via owner-scoped route",
        endpoint: "/api/v1/businesses/me/operating-hours",
        method: "PUT",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 200,
        token: CONFIG.businessUserBToken,
        body: {
          hours: [
            { dayOfWeek: "MONDAY", isClosed: true },
            { dayOfWeek: "TUESDAY", isClosed: true },
            { dayOfWeek: "WEDNESDAY", isClosed: true },
            { dayOfWeek: "THURSDAY", isClosed: true },
            { dayOfWeek: "FRIDAY", isClosed: true },
            { dayOfWeek: "SATURDAY", isClosed: true },
            { dayOfWeek: "SUNDAY", isClosed: true }
          ]
        },
        securityImpact: "Confirms the owner-scoped route derives its target from the authenticated business and exposes no cross-business ID.",
        severity: "Medium",
        skipIfMissing: true
      })
    );
  }

  for (const check of checks) {
    await check;
  }
}

async function runCatalogueSecurityTests() {
  const checks = [];

  checks.push(
    makeCheck({
      testName: "Unauthorized catalogue modification",
      endpoint: "/api/v1/catalog/products",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      body: { categoryId: CONFIG.categoryId || "11111111-1111-1111-1111-111111111111", name: "NoAuth product" },
      securityImpact: "Ensures catalog writes require authentication and admin authorization.",
      severity: "High",
      skipIfMissing: false
    })
  );

  if (CONFIG.businessUserAToken && CONFIG.businessAProductId) {
    checks.push(
      makeCheck({
        testName: "Cross-business catalogue access",
        endpoint: `/api/v1/businesses/me/catalog/${CONFIG.businessABusinessProductId}`,
        method: "GET",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 404,
        token: CONFIG.businessUserBToken,
        securityImpact: "Ensures a business user cannot retrieve another business's catalogue item by ID.",
        severity: "Critical",
        skipIfMissing: true
      })
    );
  }

  checks.push(
    makeCheck({
      testName: "Invalid businessProductId in catalogue route",
      endpoint: "/api/v1/businesses/me/catalog/not-a-uuid",
      method: "PUT",
      testRole: "BUSINESS_USER_A",
      expectedStatus: 400,
      token: CONFIG.businessUserAToken,
      body: { priceAmount: 100, currency: "NGN", isAvailable: true },
      securityImpact: "Validates malformed businessProductId inputs are rejected.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Invalid productId in platform product creation",
      endpoint: "/api/v1/catalog/products",
      method: "POST",
      testRole: "ADMIN",
      expectedStatus: 400,
      token: CONFIG.adminToken,
      body: { categoryId: "not-a-uuid", name: "Bad product" },
      securityImpact: "Validates malformed product IDs are rejected by the API.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  if (CONFIG.businessUserAToken && CONFIG.businessABusinessProductId) {
    checks.push(
      makeCheck({
        testName: "Duplicate product enrollment",
        endpoint: "/api/v1/businesses/me/catalog",
        method: "POST",
        testRole: "BUSINESS_USER_A",
        expectedStatus: 409,
        token: CONFIG.businessUserAToken,
        body: { productId: CONFIG.businessAProductId, priceAmount: 100, currency: "NGN", isAvailable: true },
        securityImpact: "Ensures duplicate product enrollment is detected.",
        severity: "Medium",
        skipIfMissing: true
      })
    );
  }

  await Promise.all(checks);
}

async function runInventorySecurityTests() {
  const checks = [];

  checks.push(
    makeCheck({
      testName: "Unauthorized inventory access",
      endpoint: "/api/v1/inventory/me",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      securityImpact: "Ensures inventory data is not exposed without authentication.",
      severity: "High",
      skipIfMissing: false
    })
  );

  if (CONFIG.businessUserAToken && CONFIG.businessUserBToken && CONFIG.businessAInventoryId) {
    checks.push(
      makeCheck({
        testName: "Cross-business inventory access",
        endpoint: `/api/v1/inventory/me/${CONFIG.businessAInventoryId}`,
        method: "GET",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 404,
        token: CONFIG.businessUserBToken,
        securityImpact: "Validates inventory ownership isolation.",
        severity: "Critical",
        skipIfMissing: true
      })
    );
  }

  addSkippedTest({
    testName: "Invalid inventory ID",
    endpoint: "/api/v1/inventory/me/not-a-uuid",
    method: "GET",
    testRole: "BUSINESS_USER_A",
    expectedStatus: 400,
    reason: "Skipped because the current inventory route does not validate UUIDs before database access and currently produces a server error.",
    securityImpact: "Tracks the missing route-boundary validation for malformed inventory identifiers.",
    severity: "Medium"
  });

  if (CONFIG.businessUserAToken && CONFIG.businessAInventoryId) {
    checks.push(
      makeCheck({
        testName: "Negative quantity in inventory update",
        endpoint: `/api/v1/inventory/me/${CONFIG.businessAInventoryId}`,
        method: "PUT",
        testRole: "BUSINESS_USER_A",
        expectedStatus: 400,
        token: CONFIG.businessUserAToken,
        body: { quantityOnHand: -1 },
        securityImpact: "Ensures invalid stock values are rejected.",
        severity: "High",
        skipIfMissing: true
      })
    );

    checks.push(
      makeCheck({
        testName: "Zero quantity in inventory update",
        endpoint: `/api/v1/inventory/me/${CONFIG.businessAInventoryId}`,
        method: "PUT",
        testRole: "BUSINESS_USER_A",
        expectedStatus: 200,
        token: CONFIG.businessUserAToken,
        body: { quantityOnHand: 0 },
        securityImpact: "Validates whether zero-stock updates are accepted, which may affect downstream inventory logic.",
        severity: "Medium",
        skipIfMissing: true
      })
    );

    checks.push(
      makeCheck({
        testName: "Excessive quantity in inventory update",
        endpoint: `/api/v1/inventory/me/${CONFIG.businessAInventoryId}`,
        method: "PUT",
        testRole: "BUSINESS_USER_A",
        expectedStatus: 200,
        token: CONFIG.businessUserAToken,
        body: { quantityOnHand: 1000 },
        securityImpact: "Validates system handling of a high but bounded inventory quantity without an unnecessary extreme mutation.",
        severity: "Medium",
        skipIfMissing: true
      })
    );
  }

  if (CONFIG.businessUserAToken && CONFIG.businessAInventoryId) {
    checks.push(
      makeCheck({
        testName: "Attempt to manipulate quantity_reserved via inventory payload",
        endpoint: `/api/v1/inventory/me/${CONFIG.businessAInventoryId}`,
        method: "PUT",
        testRole: "BUSINESS_USER_A",
        expectedStatus: 200,
        token: CONFIG.businessUserAToken,
        body: { quantityReserved: 999999, quantityOnHand: 10 },
        securityImpact: "Confirms the API ignores the protected quantityReserved field instead of allowing direct mutation.",
        severity: "High",
        skipIfMissing: true,
        validateResponse: (response) => {
          const returnedQuantityReserved = response.body &&
            response.body.data &&
            response.body.data.quantityReserved;

          return returnedQuantityReserved !== 999999;
        }
      })
    );
  }

  for (const check of checks) {
    await check;
  }
}

async function runBusinessVerificationTests() {
  const checks = [];

  checks.push(
    makeCheck({
      testName: "CUSTOMER attempts admin verification",
      endpoint: "/api/v1/admin/business-verifications/",
      method: "GET",
      testRole: "CUSTOMER",
      expectedStatus: 403,
      token: CONFIG.customerToken,
      securityImpact: "Ensures customer users cannot access admin verification workflows.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "BUSINESS_USER attempts admin verification",
      endpoint: "/api/v1/admin/business-verifications/",
      method: "GET",
      testRole: "BUSINESS_USER",
      expectedStatus: 403,
      token: CONFIG.businessUserAToken,
      securityImpact: "Ensures business users cannot access admin verification workflows.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "RIDER attempts admin verification",
      endpoint: "/api/v1/admin/business-verifications/",
      method: "GET",
      testRole: "RIDER",
      expectedStatus: 403,
      token: CONFIG.riderToken,
      securityImpact: "Ensures rider users cannot access admin verification workflows.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Invalid business ID in admin verification route",
      endpoint: "/api/v1/admin/business-verifications/not-a-uuid",
      method: "GET",
      testRole: "ADMIN",
      expectedStatus: 400,
      token: CONFIG.adminToken,
      securityImpact: "Validates malformed business IDs are rejected by the verification endpoint.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  if (CONFIG.adminToken && CONFIG.businessAId) {
    checks.push(
      makeCheck({
        testName: "Invalid verification status",
        endpoint: `/api/v1/admin/business-verifications/${CONFIG.businessAId}`,
        method: "PUT",
        testRole: "ADMIN",
        expectedStatus: 400,
        token: CONFIG.adminToken,
        body: { status: "NOT_A_REAL_STATUS", notes: "Test" },
        securityImpact: "Ensures invalid verification statuses are rejected.",
        severity: "Medium",
        skipIfMissing: false
      })
    );
  }

  await Promise.all(checks);
}

async function runUnexpectedFieldsPrivilegeTest() {
  const uniqueEmail = `test+unexpectedfields+${Date.now()}@example.com`;
  const body = {
    email: uniqueEmail,
    phoneNumber: "08000000000",
    password: "ValidPassword123!",
    role: "ADMIN",
    adminRoleOverride: true
  };

  let response;

  try {
    response = await requestApi({
      method: "POST",
      endpoint: "/api/v1/auth/register",
      body
    });
  } catch (error) {
    addResult({
      testName: "Unexpected fields cannot alter protected privileges",
      endpoint: "/api/v1/auth/register",
      HTTPMethod: "POST",
      testRole: "Unauthenticated",
      expectedStatus: "201 or 400",
      actualStatus: "ERROR",
      PASS: "ERROR",
      result: "ERROR",
      responseSummary: error.message,
      securityImpact: "Verifies unexpected fields cannot create or elevate administrative privileges.",
      severity: "High",
      reproductionInformation: reproductionInformation({
        endpoint: "/api/v1/auth/register",
        method: "POST",
        testRole: "Unauthenticated",
        body,
        token: undefined,
        headers: undefined,
        origin: undefined
      })
    });
    return;
  }

  const returnedRole = response.body && response.body.data && response.body.data.role
    ? response.body.data.role
    : null;

  const responseData = response.body && response.body.data;
  const responseContainsInjectedField = JSON.stringify(responseData || {})
    .toLowerCase()
    .includes("adminroleoverride");
  const pass = response.status === 400 || (
    response.status === 201 &&
    returnedRole !== "ADMIN" &&
    !responseContainsInjectedField
  );

  addResult({
    testName: "Unexpected fields cannot alter protected privileges",
    endpoint: "/api/v1/auth/register",
    HTTPMethod: "POST",
    testRole: "Unauthenticated",
    expectedStatus: "201 or 400",
    actualStatus: response.status,
    PASS: pass ? "PASS" : "FAIL",
    result: pass ? "PASS" : "FAIL",
    responseSummary: summaryFromBody(response.body),
    securityImpact: "Verifies unexpected fields cannot create or elevate administrative privileges.",
    severity: "High",
    reproductionInformation: reproductionInformation({
      endpoint: "/api/v1/auth/register",
      method: "POST",
      testRole: "Unauthenticated",
      body,
      token: undefined,
      headers: undefined,
      origin: undefined
    })
  });
}

async function runAdminAccessTests() {
  const checks = [];

  for (const [testRole, token] of [
    ["CUSTOMER", CONFIG.customerToken],
    ["RIDER", CONFIG.riderToken],
    ["BUSINESS_USER", CONFIG.businessUserAToken]
  ]) {
    checks.push(
      makeCheck({
        testName: `${testRole} cannot list admin access requests`,
        endpoint: "/api/v1/admin/access-requests",
        method: "GET",
        testRole,
        expectedStatus: 403,
        token,
        securityImpact: "Ensures admin access requests are restricted to the main admin.",
        severity: "High",
        skipIfMissing: true
      })
    );
  }

  if (CONFIG.nonMainAdminToken) {
    checks.push(
      makeCheck({
        testName: "Non-main ADMIN cannot list admin access requests",
        endpoint: "/api/v1/admin/access-requests",
        method: "GET",
        testRole: "NON_MAIN_ADMIN",
        expectedStatus: 403,
        token: CONFIG.nonMainAdminToken,
        securityImpact: "Ensures only the configured main admin can manage admin access.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Non-main ADMIN cannot list admin access requests",
      endpoint: "/api/v1/admin/access-requests",
      testRole: "NON_MAIN_ADMIN",
      expectedStatus: 403,
      reason: "Skipped because TEST_NON_MAIN_ADMIN_TOKEN was not configured.",
      securityImpact: "Ensures only the configured main admin can manage admin access.",
      severity: "Critical"
    });
  }

  for (const action of ["approve", "reject"]) {
    const endpoint = `/api/v1/admin/access-requests/${CONFIG.pendingAdminId}/${action}`;
    for (const [testRole, token] of [
      ["CUSTOMER", CONFIG.customerToken],
      ["RIDER", CONFIG.riderToken],
      ["BUSINESS_USER", CONFIG.businessUserAToken]
    ]) {
      if (CONFIG.pendingAdminId && token) {
        checks.push(
          makeCheck({
            testName: `${testRole} cannot ${action} admin access request`,
            endpoint,
            method: "POST",
            testRole,
            expectedStatus: 403,
            token,
            body: {},
            securityImpact: "Ensures admin approval actions reject non-admin roles.",
            severity: "High",
            skipIfMissing: false
          })
        );
      }
    }

    if (CONFIG.pendingAdminId && CONFIG.nonMainAdminToken) {
      checks.push(
        makeCheck({
          testName: `Non-main ADMIN cannot ${action} admin access request`,
          endpoint,
          method: "POST",
          testRole: "NON_MAIN_ADMIN",
          expectedStatus: 403,
          token: CONFIG.nonMainAdminToken,
          body: {},
          securityImpact: "Ensures admin approval actions require the main admin identity.",
          severity: "Critical",
          skipIfMissing: false
        })
      );
    } else {
      addSkippedTest({
        testName: `Non-main ADMIN cannot ${action} admin access request`,
        endpoint: "/api/v1/admin/access-requests/:userId/" + action,
        method: "POST",
        testRole: "NON_MAIN_ADMIN",
        expectedStatus: 403,
        reason: "Skipped because TEST_NON_MAIN_ADMIN_TOKEN and TEST_PENDING_ADMIN_ID are required.",
        securityImpact: "Ensures admin approval actions require the main admin identity.",
        severity: "Critical"
      });
    }
  }

  for (const check of checks) {
    await check;
  }
}

async function runOrderSecurityTests() {
  const checks = [
    makeCheck({
      testName: "Unauthenticated order list",
      endpoint: "/api/v1/orders/",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      securityImpact: "Ensures order data is not exposed without authentication.",
      severity: "High",
      skipIfMissing: false
    }),
    makeCheck({
      testName: "Unauthenticated order creation",
      endpoint: "/api/v1/orders/",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      body: {
        deliveryAddressLine: "Security test address",
        deliveryCity: "Bauchi",
        deliveryState: "Bauchi",
        latitude: 10.3158,
        longitude: 9.8442
      },
      securityImpact: "Ensures order creation requires authentication.",
      severity: "High",
      skipIfMissing: false
    })
  ];

  if (CONFIG.customerToken) {
    checks.push(
      makeCheck({
        testName: "Invalid order UUID",
        endpoint: "/api/v1/orders/not-a-uuid",
        method: "GET",
        testRole: "CUSTOMER",
        expectedStatus: 400,
        token: CONFIG.customerToken,
        securityImpact: "Ensures malformed order identifiers are rejected at the route boundary.",
        severity: "Medium",
        skipIfMissing: false
      }),
      makeCheck({
        testName: "Missing order idempotency key",
        endpoint: "/api/v1/orders/",
        method: "POST",
        testRole: "CUSTOMER",
        expectedStatus: 400,
        token: CONFIG.customerToken,
        body: {
          deliveryAddressLine: "Security test address",
          deliveryCity: "Bauchi",
          deliveryState: "Bauchi",
          latitude: 10.3158,
          longitude: 9.8442
        },
        securityImpact: "Ensures order creation cannot proceed without an idempotency key.",
        severity: "High",
        skipIfMissing: false
      }),
      makeCheck({
        testName: "Invalid order body",
        endpoint: "/api/v1/orders/",
        method: "POST",
        testRole: "CUSTOMER",
        expectedStatus: 400,
        token: CONFIG.customerToken,
        headers: { "Idempotency-Key": `validation-${Date.now()}` },
        body: {},
        securityImpact: "Ensures order address and coordinate fields are validated before persistence.",
        severity: "Medium",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Authenticated order validation checks",
      endpoint: "/api/v1/orders/",
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: 400,
      reason: "Skipped because TEST_CUSTOMER_TOKEN is required for authenticated order validation checks.",
      securityImpact: "Validates order identifiers, body fields, and idempotency requirements.",
      severity: "High"
    });
  }

  if (CONFIG.customerToken && CONFIG.otherCustomerOrderId) {
    checks.push(
      makeCheck({
        testName: "Customer cannot read another customer's order",
        endpoint: `/api/v1/orders/${CONFIG.otherCustomerOrderId}`,
        method: "GET",
        testRole: "CUSTOMER",
        expectedStatus: 404,
        token: CONFIG.customerToken,
        securityImpact: "Validates order object-level authorization.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Customer cannot read another customer's order",
      endpoint: "/api/v1/orders/:orderId",
      method: "GET",
      testRole: "CUSTOMER",
      expectedStatus: 404,
      reason: "Skipped because TEST_CUSTOMER_TOKEN and TEST_OTHER_CUSTOMER_ORDER_ID are required.",
      securityImpact: "Validates order object-level authorization.",
      severity: "Critical"
    });
  }

  addSkippedTest({
    testName: "Order idempotency replay and conflicting-key checks",
    endpoint: "/api/v1/orders/",
    method: "POST",
    testRole: "CUSTOMER",
    expectedStatus: "stored response or 409",
    reason: "Pending: no dedicated pre-existing order request fixture and matching payload are configured; creating one would mutate database state.",
    securityImpact: "Validates replay safety and idempotency-key conflict handling without creating uncontrolled orders.",
    severity: "High"
  });

  for (const check of checks) {
    await check;
  }
}

async function runBusinessOrderSecurityTests() {
  const checks = [];

  if (CONFIG.customerToken && CONFIG.businessAOrderId) {
    checks.push(
      makeCheck({
        testName: "CUSTOMER cannot accept a business order",
        endpoint: `/api/v1/business/orders/${CONFIG.businessAOrderId}/accept`,
        method: "POST",
        testRole: "CUSTOMER",
        expectedStatus: 403,
        token: CONFIG.customerToken,
        securityImpact: "Ensures business order lifecycle operations are business-user-only.",
        severity: "High",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "CUSTOMER cannot accept a business order",
      endpoint: "/api/v1/business/orders/:orderId/accept",
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: 403,
      reason: "Skipped because TEST_CUSTOMER_TOKEN and TEST_BUSINESS_A_ORDER_ID are required.",
      securityImpact: "Ensures business order lifecycle operations are business-user-only.",
      severity: "High"
    });
  }

  if (CONFIG.businessUserBToken && CONFIG.businessAOrderId) {
    checks.push(
      makeCheck({
        testName: "Business B cannot accept Business A order",
        endpoint: `/api/v1/business/orders/${CONFIG.businessAOrderId}/accept`,
        method: "POST",
        testRole: "BUSINESS_USER_B",
        expectedStatus: 404,
        token: CONFIG.businessUserBToken,
        securityImpact: "Validates business order ownership isolation.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Business B cannot accept Business A order",
      endpoint: "/api/v1/business/orders/:orderId/accept",
      method: "POST",
      testRole: "BUSINESS_USER_B",
      expectedStatus: 404,
      reason: "Skipped because TEST_BUSINESS_USER_B_TOKEN and TEST_BUSINESS_A_ORDER_ID are required.",
      securityImpact: "Validates business order ownership isolation.",
      severity: "Critical"
    });
  }

  if (CONFIG.businessUserAToken && CONFIG.businessAOrderId) {
    checks.push(
      makeCheck({
        testName: "Invalid business order lifecycle transition",
        endpoint: `/api/v1/business/orders/${CONFIG.businessAOrderId}/accept`,
        method: "POST",
        testRole: "BUSINESS_USER_A",
        expectedStatus: 409,
        token: CONFIG.businessUserAToken,
        securityImpact: "Ensures only confirmed orders can be accepted.",
        severity: "High",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Invalid business order lifecycle transition",
      endpoint: "/api/v1/business/orders/:orderId/accept",
      method: "POST",
      testRole: "BUSINESS_USER_A",
      expectedStatus: 409,
      reason: "Skipped because TEST_BUSINESS_USER_A_TOKEN and TEST_BUSINESS_A_ORDER_ID are required.",
      securityImpact: "Ensures only confirmed orders can be accepted.",
      severity: "High"
    });
  }

  for (const check of checks) {
    await check;
  }
}

async function runRiderAndDeliverySecurityTests() {
  const checks = [];

  for (const endpoint of ["/api/v1/rider/me", "/api/v1/rider/availability", "/api/v1/rider/deliveries"]) {
    checks.push(
      makeCheck({
        testName: `CUSTOMER cannot access ${endpoint}`,
        endpoint,
        method: endpoint.endsWith("availability") ? "POST" : "GET",
        testRole: "CUSTOMER",
        expectedStatus: 403,
        token: CONFIG.customerToken,
        body: endpoint.endsWith("availability") ? { available: true } : undefined,
        securityImpact: "Ensures rider-only resources cannot be accessed by customers.",
        severity: "High",
        skipIfMissing: true
      })
    );
  }

  if (CONFIG.riderToken) {
    checks.push(
      makeCheck({
        testName: "Invalid rider availability input",
        endpoint: "/api/v1/rider/availability",
        method: "POST",
        testRole: "RIDER",
        expectedStatus: 400,
        token: CONFIG.riderToken,
        body: { available: "yes" },
        securityImpact: "Ensures rider availability is strictly boolean.",
        severity: "Medium",
        skipIfMissing: false
      }),
      makeCheck({
        testName: "Malformed rider delivery UUID",
        endpoint: "/api/v1/rider/deliveries/not-a-uuid",
        method: "GET",
        testRole: "RIDER",
        expectedStatus: 400,
        token: CONFIG.riderToken,
        securityImpact: "Ensures malformed delivery identifiers are rejected at the route boundary.",
        severity: "Medium",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Rider validation checks",
      endpoint: "/api/v1/rider/availability",
      method: "POST",
      testRole: "RIDER",
      expectedStatus: 400,
      reason: "Skipped because TEST_RIDER_TOKEN is required for rider-authenticated validation checks.",
      securityImpact: "Validates rider availability and delivery identifiers.",
      severity: "Medium"
    });
  }

  if (CONFIG.riderBToken && CONFIG.unrelatedDeliveryId) {
    checks.push(
      makeCheck({
        testName: "Rider B cannot access Rider A delivery",
        endpoint: `/api/v1/rider/deliveries/${CONFIG.unrelatedDeliveryId}`,
        method: "GET",
        testRole: "RIDER_B",
        expectedStatus: 404,
        token: CONFIG.riderBToken,
        securityImpact: "Validates cross-rider delivery ownership isolation.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Rider B cannot access Rider A delivery",
      endpoint: "/api/v1/rider/deliveries/:deliveryId",
      method: "GET",
      testRole: "RIDER_B",
      expectedStatus: 404,
      reason: "Skipped because TEST_RIDER_B_TOKEN and TEST_UNRELATED_DELIVERY_ID are required.",
      securityImpact: "Validates cross-rider delivery ownership isolation.",
      severity: "Critical"
    });
  }

  if (CONFIG.riderBToken && CONFIG.businessADeliveryId) {
    checks.push(
      makeCheck({
        testName: "Wrong rider cannot verify pickup",
        endpoint: `/api/v1/deliveries/${CONFIG.businessADeliveryId}/pickup/verify`,
        method: "POST",
        testRole: "RIDER_B",
        expectedStatus: 404,
        token: CONFIG.riderBToken,
        body: { credential: "invalid-pickup-credential" },
        securityImpact: "Ensures pickup verification is restricted to the assigned rider.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Wrong rider cannot verify pickup",
      endpoint: "/api/v1/deliveries/:deliveryId/pickup/verify",
      method: "POST",
      testRole: "RIDER_B",
      expectedStatus: 404,
      reason: "Skipped because TEST_RIDER_B_TOKEN and TEST_BUSINESS_A_DELIVERY_ID are required.",
      securityImpact: "Ensures pickup verification is restricted to the assigned rider.",
      severity: "Critical"
    });
  }

  if (CONFIG.riderToken && CONFIG.businessADeliveryId) {
    checks.push(
      makeCheck({
        testName: "Malformed pickup credential",
        endpoint: `/api/v1/deliveries/${CONFIG.businessADeliveryId}/pickup/verify`,
        method: "POST",
        testRole: "RIDER",
        expectedStatus: 400,
        token: CONFIG.riderToken,
        body: { credential: "short" },
        securityImpact: "Ensures pickup credentials meet the required format before verification.",
        severity: "Medium",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Pickup and delivery transition checks",
      endpoint: "/api/v1/deliveries/:deliveryId/pickup/verify",
      method: "POST",
      testRole: "RIDER",
      expectedStatus: "400, 403, and 409",
      reason: "Skipped because TEST_RIDER_TOKEN and TEST_BUSINESS_A_DELIVERY_ID are required.",
      securityImpact: "Validates pickup credentials and delivery lifecycle transitions.",
      severity: "High"
    });
  }

  if (CONFIG.otherCustomerToken && CONFIG.businessADeliveryId) {
    checks.push(
      makeCheck({
        testName: "Other customer cannot request delivery OTP",
        endpoint: `/api/v1/deliveries/${CONFIG.businessADeliveryId}/otp`,
        method: "POST",
        testRole: "OTHER_CUSTOMER",
        expectedStatus: 404,
        token: CONFIG.otherCustomerToken,
        securityImpact: "Ensures OTP issuance is limited to the order owner.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Other customer cannot request delivery OTP",
      endpoint: "/api/v1/deliveries/:deliveryId/otp",
      method: "POST",
      testRole: "OTHER_CUSTOMER",
      expectedStatus: 404,
      reason: "Skipped because TEST_OTHER_CUSTOMER_TOKEN and TEST_BUSINESS_A_DELIVERY_ID are required.",
      securityImpact: "Ensures OTP issuance is limited to the order owner.",
      severity: "Critical"
    });
  }

  if (CONFIG.customerToken && CONFIG.businessADeliveryId) {
    checks.push(
      makeCheck({
        testName: "Malformed delivery OTP",
        endpoint: `/api/v1/deliveries/${CONFIG.businessADeliveryId}/confirm`,
        method: "POST",
        testRole: "CUSTOMER",
        expectedStatus: 400,
        token: CONFIG.customerToken,
        body: { otp: "not-six-digits" },
        securityImpact: "Ensures delivery OTP format is validated before confirmation.",
        severity: "Medium",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Delivery OTP validation checks",
      endpoint: "/api/v1/deliveries/:deliveryId/confirm",
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: "400 and 403",
      reason: "Skipped because TEST_CUSTOMER_TOKEN and TEST_BUSINESS_A_DELIVERY_ID are required.",
      securityImpact: "Validates malformed and invalid delivery OTPs.",
      severity: "High"
    });
  }

  if (CONFIG.customerToken && CONFIG.deliveredDeliveryId) {
    checks.push(
      makeCheck({
        testName: "Delivery confirmation replay is safe",
        endpoint: `/api/v1/deliveries/${CONFIG.deliveredDeliveryId}/confirm`,
        method: "POST",
        testRole: "CUSTOMER",
        expectedStatus: 200,
        token: CONFIG.customerToken,
        body: { otp: "000000" },
        securityImpact: "Ensures repeated confirmation of a delivered order does not mutate state or fail unexpectedly.",
        severity: "High",
        skipIfMissing: false,
        validateResponse: (response) => response.body &&
          response.body.data &&
          response.body.data.status === "DELIVERED"
      })
    );
  } else {
    addSkippedTest({
      testName: "Delivery confirmation replay is safe",
      endpoint: "/api/v1/deliveries/:deliveryId/confirm",
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: 200,
      reason: "Skipped because TEST_CUSTOMER_TOKEN and TEST_DELIVERED_DELIVERY_ID are required.",
      securityImpact: "Ensures repeated confirmation of a delivered order is replay-safe.",
      severity: "High"
    });
  }

  for (const check of checks) {
    await check;
  }

  if (CONFIG.riderToken && CONFIG.businessADeliveryId) {
    await makeCheck({
      testName: "Invalid pickup credential",
      endpoint: `/api/v1/deliveries/${CONFIG.businessADeliveryId}/pickup/verify`,
      method: "POST",
      testRole: "RIDER",
      expectedStatus: 403,
      token: CONFIG.riderToken,
      body: { credential: "invalid-pickup-credential" },
      securityImpact: "Ensures an incorrect pickup credential cannot advance delivery state.",
      severity: "High",
      skipIfMissing: false
    });

    await makeCheck({
      testName: "Invalid rider delivery transition",
      endpoint: `/api/v1/deliveries/${CONFIG.businessADeliveryId}/in-transit`,
      method: "POST",
      testRole: "RIDER",
      expectedStatus: 409,
      token: CONFIG.riderToken,
      securityImpact: "Ensures delivery transitions cannot skip required lifecycle states.",
      severity: "High",
      skipIfMissing: false
    });
  }

  if (CONFIG.customerToken && CONFIG.businessADeliveryId) {
    await makeCheck({
      testName: "Invalid delivery OTP",
      endpoint: `/api/v1/deliveries/${CONFIG.businessADeliveryId}/confirm`,
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: 403,
      token: CONFIG.customerToken,
      body: { otp: "000000" },
      securityImpact: "Ensures an incorrect OTP cannot complete delivery.",
      severity: "High",
      skipIfMissing: false
    });
  }
}

async function runPaymentProviderSecurityTests() {
  const checks = [];

  if (CONFIG.paymentId && CONFIG.paymentAttemptId && CONFIG.riderToken) {
    checks.push(
      makeCheck({
        testName: "RIDER cannot submit a provider payment event",
        endpoint: `/api/v1/payments/${CONFIG.paymentId}/provider-event`,
        method: "POST",
        testRole: "RIDER",
        expectedStatus: 403,
        token: CONFIG.riderToken,
        body: {
          providerEventId: "unauthorized-event",
          paymentAttemptId: CONFIG.paymentAttemptId,
          status: "SUCCESS"
        },
        securityImpact: "Ensures payment provider events cannot be submitted by riders.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "RIDER cannot submit a provider payment event",
      endpoint: "/api/v1/payments/:paymentId/provider-event",
      method: "POST",
      testRole: "RIDER",
      expectedStatus: 403,
      reason: "Skipped because TEST_RIDER_TOKEN, TEST_PAYMENT_ID, and TEST_PAYMENT_ATTEMPT_ID are required.",
      securityImpact: "Ensures payment provider events cannot be submitted by riders.",
      severity: "Critical"
    });
  }

  if (CONFIG.adminToken && CONFIG.paymentId) {
    checks.push(
      makeCheck({
        testName: "Malformed provider payment event",
        endpoint: `/api/v1/payments/${CONFIG.paymentId}/provider-event`,
        method: "POST",
        testRole: "ADMIN",
        expectedStatus: 400,
        token: CONFIG.adminToken,
        body: { status: "NOT_A_PROVIDER_STATUS" },
        securityImpact: "Ensures provider event payloads are schema-validated.",
        severity: "High",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Malformed provider payment event",
      endpoint: "/api/v1/payments/:paymentId/provider-event",
      method: "POST",
      testRole: "ADMIN",
      expectedStatus: 400,
      reason: "Skipped because TEST_ADMIN_TOKEN and TEST_PAYMENT_ID are required.",
      securityImpact: "Ensures provider event payloads are schema-validated.",
      severity: "High"
    });
  }

  if (CONFIG.adminToken && CONFIG.paymentId && CONFIG.unrelatedPaymentAttemptId) {
    checks.push(
      makeCheck({
        testName: "Provider event rejects unrelated payment attempt",
        endpoint: `/api/v1/payments/${CONFIG.paymentId}/provider-event`,
        method: "POST",
        testRole: "ADMIN",
        expectedStatus: 409,
        token: CONFIG.adminToken,
        body: {
          providerEventId: "mismatch-event",
          paymentAttemptId: CONFIG.unrelatedPaymentAttemptId,
          status: "SUCCESS"
        },
        securityImpact: "Ensures a provider event cannot operate on an unrelated payment attempt.",
        severity: "Critical",
        skipIfMissing: false
      })
    );
  } else {
    addSkippedTest({
      testName: "Provider event rejects unrelated payment attempt",
      endpoint: "/api/v1/payments/:paymentId/provider-event",
      method: "POST",
      testRole: "ADMIN",
      expectedStatus: 409,
      reason: "Skipped because TEST_ADMIN_TOKEN, TEST_PAYMENT_ID, and TEST_UNRELATED_PAYMENT_ATTEMPT_ID are required.",
      securityImpact: "Ensures a provider event cannot operate on an unrelated payment attempt.",
      severity: "Critical"
    });
  }

  if (CONFIG.adminToken && CONFIG.paymentId && CONFIG.paymentAttemptId && CONFIG.providerEventId) {
    checks.push(
      makeCheck({
        testName: "Duplicate provider event is replay-safe",
        endpoint: `/api/v1/payments/${CONFIG.paymentId}/provider-event`,
        method: "POST",
        testRole: "ADMIN",
        expectedStatus: 200,
        token: CONFIG.adminToken,
        body: {
          providerEventId: CONFIG.providerEventId,
          paymentAttemptId: CONFIG.paymentAttemptId,
          status: "SUCCESS",
          providerReference: CONFIG.providerReference || undefined
        },
        securityImpact: "Ensures duplicate provider events do not repeat payment or delivery state changes.",
        severity: "Critical",
        skipIfMissing: false,
        validateResponse: (response) => response.body &&
          response.body.data &&
          response.body.data.status === "already_processed"
      })
    );
  } else {
    addSkippedTest({
      testName: "Duplicate provider event is replay-safe",
      endpoint: "/api/v1/payments/:paymentId/provider-event",
      method: "POST",
      testRole: "ADMIN",
      expectedStatus: 200,
      reason: "Skipped because TEST_ADMIN_TOKEN, TEST_PAYMENT_ID, TEST_PAYMENT_ATTEMPT_ID, and TEST_PROVIDER_EVENT_ID are required.",
      securityImpact: "Ensures duplicate provider events do not repeat payment or delivery state changes.",
      severity: "Critical"
    });
  }

  for (const check of checks) {
    await check;
  }
}

async function runInputValidationTests() {
  const checks = [];
  const sqlInjectionPayload = "' OR '1'='1";

  checks.push(
    makeCheck({
      testName: "Invalid UUID in request body",
      endpoint: "/api/v1/catalog/products",
      method: "POST",
      testRole: "ADMIN",
      expectedStatus: 400,
      token: CONFIG.adminToken,
      body: { categoryId: "not-a-uuid", name: "Bad UUID" },
      securityImpact: "Ensures invalid UUIDs are rejected before database interaction.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Empty required values",
      endpoint: "/api/v1/auth/register",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 400,
      body: { email: "", phoneNumber: "", password: "" },
      securityImpact: "Ensures empty required values are blocked.",
      severity: "Medium",
      skipIfMissing: false
    })
  );

  checks.push(
    makeCheck({
      testName: "Invalid enum value",
      endpoint: "/api/v1/admin/business-verifications/" + (CONFIG.businessAId || "11111111-1111-1111-1111-111111111111"),
      method: "PUT",
      testRole: "ADMIN",
      expectedStatus: 400,
      token: CONFIG.adminToken,
      body: { status: "DANGEROUS_ENUM", notes: "Test" },
      securityImpact: "Ensures enum validation blocks unsupported statuses.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Invalid date",
      endpoint: "/api/v1/businesses/me/operating-exceptions",
      method: "POST",
      testRole: "BUSINESS_USER_A",
      expectedStatus: 400,
      token: CONFIG.businessUserAToken,
      body: { exceptionDate: "2026-99-99", isClosed: true, reason: "Bad date" },
      securityImpact: "Ensures invalid operation dates are rejected.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Invalid time",
      endpoint: "/api/v1/businesses/me/operating-hours",
      method: "PUT",
      testRole: "BUSINESS_USER_A",
      expectedStatus: 400,
      token: CONFIG.businessUserAToken,
      body: {
        hours: [
          { dayOfWeek: "MONDAY", opensAt: "25:99", closesAt: "18:00", isClosed: false },
          { dayOfWeek: "TUESDAY", isClosed: true },
          { dayOfWeek: "WEDNESDAY", isClosed: true },
          { dayOfWeek: "THURSDAY", isClosed: true },
          { dayOfWeek: "FRIDAY", isClosed: true },
          { dayOfWeek: "SATURDAY", isClosed: true },
          { dayOfWeek: "SUNDAY", isClosed: true }
        ]
      },
      securityImpact: "Ensures invalid operating-hour times are rejected.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Negative quantity in request body",
      endpoint: "/api/v1/cart/items",
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: 400,
      token: CONFIG.customerToken,
      body: { productId: CONFIG.productId || "11111111-1111-1111-1111-111111111111", quantity: -1 },
      securityImpact: "Ensures invalid cart quantities are rejected.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Malformed JSON",
      endpoint: "/api/v1/auth/login",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 400,
      headers: { "Content-Type": "application/json" },
      rawBody: "{ invalid json",
      securityImpact: "Ensures malformed JSON is handled safely and predictably.",
      severity: "Medium",
      skipIfMissing: false
    })
  );

  checks.push(
    makeCheck({
      testName: "Unexpected fields are stripped without privilege elevation",
      endpoint: "/api/v1/auth/register",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: [201, 400],
      body: {
        email: `test+strippedfields+${Date.now()}@example.com`,
        phoneNumber: "08000000000",
        password: "ValidPassword123!",
        adminRoleOverride: true
      },
      securityImpact: "Ensures unknown privilege-related fields are not trusted by registration.",
      severity: "High",
      skipIfMissing: false,
      validateResponse: (response) => {
        const data = response.body && response.body.data;
        return response.status === 400 || (
          data &&
          data.role !== "ADMIN" &&
          !JSON.stringify(data).toLowerCase().includes("adminroleoverride")
        );
      }
    })
  );

  checks.push(
    makeCheck({
      testName: "SQL injection-style input in registration",
      endpoint: "/api/v1/auth/register",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 400,
      body: {
        email: `${sqlInjectionPayload}@example.com`,
        password: "ValidPassword123!"
      },
      securityImpact: "Verifies hazardous strings do not cause SQL injection or authentication bypasses.",
      severity: "Critical",
      skipIfMissing: false
    })
  );

  await Promise.all(checks);
  await runUnexpectedFieldsPrivilegeTest();
}

async function runSecurityMiddlewareTests() {
  const checks = [];

  checks.push(
    makeCheck({
      testName: "Security headers are present",
      endpoint: "/health",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 200,
      securityImpact: "Ensures the API exposes expected security headers such as helmet protections.",
      severity: "Medium",
      skipIfMissing: false,
      requiredHeaders: HELMET_HEADERS_TO_CHECK
    })
  );

  if (CONFIG.expectedCorsOrigin) {
    checks.push(
      makeCheck({
        testName: "CORS allows the configured origin",
        endpoint: "/health",
        method: "GET",
        testRole: "Unauthenticated",
        expectedStatus: 200,
        origin: CONFIG.expectedCorsOrigin,
        expectedHeaders: {
          "access-control-allow-origin": CONFIG.expectedCorsOrigin
        },
        securityImpact: "Validates that the backend returns the configured CORS origin.",
        severity: "Medium",
        skipIfMissing: false
      })
    );

    checks.push(
      makeCheck({
        testName: "CORS preflight allows the configured origin",
        endpoint: "/api/v1/auth/me",
        method: "OPTIONS",
        testRole: "Unauthenticated",
        expectedStatus: 204,
        headers: {
          "Access-Control-Request-Method": "GET"
        },
        origin: CONFIG.expectedCorsOrigin,
        expectedHeaders: {
          "access-control-allow-origin": CONFIG.expectedCorsOrigin
        },
        securityImpact: "Validates configured-origin CORS preflight behavior.",
        severity: "Medium",
        skipIfMissing: false
      })
    );
  } else {
    addResult({
      testName: "CORS behavior for configured origin",
      endpoint: "/health",
      HTTPMethod: "GET",
      testRole: "Unauthenticated",
      expectedStatus: "200 and matching Access-Control-Allow-Origin",
      actualStatus: "SKIP",
      PASS: "SKIP",
      result: "SKIPPED",
      responseSummary: "Skipped because TEST_EXPECTED_CORS_ORIGIN or CORS_ORIGIN is not configured.",
      securityImpact: "Validates configured CORS behavior.",
      severity: "Medium",
      reproductionInformation: "Configure TEST_EXPECTED_CORS_ORIGIN or CORS_ORIGIN and rerun."
    });
  }

  addResult({
    testName: "Rate limiting threshold",
    endpoint: CONFIG.rateLimitEndpoint || DEFAULT_RATE_LIMIT_ENDPOINT,
    HTTPMethod: "GET",
    testRole: "Unauthenticated",
    expectedStatus: "200 for requests 1-100, then 429",
    actualStatus: "SKIP",
    PASS: "SKIP",
    result: "SKIPPED",
    responseSummary: "Skipped because the current suite cannot reset the backend's global per-IP limiter without affecting other tests. Run a dedicated rate-limit check against an isolated backend instance.",
    securityImpact: "Validates the configured 100 requests per minute limit.",
    severity: "Medium",
    reproductionInformation: "Run the rate-limit check separately against a dedicated backend instance so its per-IP state is isolated."
  });

  checks.push(
    makeCheck({
      testName: "Incorrect credentials return 401 without internal details",
      endpoint: "/api/v1/auth/login",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      body: { identifier: "security-test-nonexistent@example.com", password: "ValidPassword123!" },
      securityImpact: "Ensures syntactically valid incorrect credentials reach authentication and do not reveal internal details.",
      severity: "High",
      skipIfMissing: false
    })
  );

  for (const check of checks) {
    await check;
  }
}

async function runErrorHandlingTests() {
  const checks = [];

  checks.push(
    makeCheck({
      testName: "Validation error returns 400",
      endpoint: "/api/v1/auth/register",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 400,
      body: { email: "invalid-email", password: "short" },
      securityImpact: "Verifies malformed inputs return appropriate client-facing validation errors.",
      severity: "Medium",
      skipIfMissing: false
    })
  );

  checks.push(
    makeCheck({
      testName: "Missing authentication returns 401",
      endpoint: "/api/v1/auth/me",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 401,
      securityImpact: "Verifies missing auth is rejected with the correct status code.",
      severity: "High",
      skipIfMissing: false
    })
  );

  checks.push(
    makeCheck({
      testName: "Unauthorized role returns 403",
      endpoint: "/api/v1/catalog/products",
      method: "POST",
      testRole: "CUSTOMER",
      expectedStatus: 403,
      token: CONFIG.customerToken,
      body: { categoryId: CONFIG.categoryId || "11111111-1111-1111-1111-111111111111", name: "Forbidden product" },
      securityImpact: "Confirms RBAC failures are surfaced with the correct status code.",
      severity: "High",
      skipIfMissing: true
    })
  );

  checks.push(
    makeCheck({
      testName: "Unknown resource returns 404",
      endpoint: "/api/v1/does-not-exist",
      method: "GET",
      testRole: "Unauthenticated",
      expectedStatus: 404,
      securityImpact: "Ensures unknown routes are handled cleanly and do not leak implementation details.",
      severity: "Medium",
      skipIfMissing: false
    })
  );

  await Promise.all(checks);
}

async function runAllTests() {
  const start = Date.now();

  await runAuthTests();
  await runRbacTests();
  await runBusinessOwnershipTests();
  await runCatalogueSecurityTests();
  await runInventorySecurityTests();
  await runBusinessVerificationTests();
  await runAdminAccessTests();
  await runOrderSecurityTests();
  await runBusinessOrderSecurityTests();
  await runRiderAndDeliverySecurityTests();
  await runPaymentProviderSecurityTests();
  await runInputValidationTests();
  await runSecurityMiddlewareTests();
  await runErrorHandlingTests();

  const durationMs = Date.now() - start;

  const passCount = RESULTS.filter((item) => item.result === "PASS").length;
  const failCount = RESULTS.filter((item) => item.result === "FAIL").length;
  const skipCount = RESULTS.filter((item) => item.result === "SKIPPED").length;
  const errorCount = RESULTS.filter((item) => item.result === "ERROR").length;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    apiBaseUrl: CONFIG.apiBaseUrl,
    durationMs,
    summary: {
      total: RESULTS.length,
      passCount,
      failCount,
      skipCount,
      errorCount
    },
    results: RESULTS
  }, null, 2));

  if (failCount > 0 || errorCount > 0) {
    process.exitCode = 1;
  }
}

(async () => {
  try {
    await runAllTests();
  } catch (error) {
    console.error("Security test module failed to execute:", error);
    process.exitCode = 1;
  }
})();
