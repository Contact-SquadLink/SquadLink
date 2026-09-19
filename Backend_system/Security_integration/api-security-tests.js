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
  adminToken: process.env.TEST_ADMIN_TOKEN || "",
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
      responseSummary: "Skipped because required token or fixture was not configured.",
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
        expectedStatus: 500,
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

  if (CONFIG.businessUserAToken && CONFIG.businessABusinessProductId) {
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
        body: { productId: CONFIG.businessABusinessProductId, priceAmount: 100, currency: "NGN", isAvailable: true },
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

  checks.push(
    makeCheck({
      testName: "Invalid inventory ID",
      endpoint: "/api/v1/inventory/me/not-a-uuid",
      method: "GET",
      testRole: "BUSINESS_USER_A",
      expectedStatus: 404,
      token: CONFIG.businessUserAToken,
      securityImpact: "Documents the current repository and error-handler behavior for malformed inventory identifiers.",
      severity: "Medium",
      skipIfMissing: true
    })
  );

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
      testName: "Unexpected fields in request body",
      endpoint: "/api/v1/auth/register",
      method: "POST",
      testRole: "Unauthenticated",
      expectedStatus: 400,
      body: {
        email: "test@example.com",
        phoneNumber: "08000000000",
        password: "validpass123",
        adminRoleOverride: true
      },
      securityImpact: "Ensures unexpected fields do not influence request handling or create privilege bypasses.",
      severity: "Medium",
      skipIfMissing: false
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
