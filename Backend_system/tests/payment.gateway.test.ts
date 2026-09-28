import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";

import { buildApp } from "../src/app-builder";
import { db } from "../src/db/database";
import { env } from "../src/config/env";
import {
  verifyPaystackSignature,
  verifyFlutterwaveSignature,
} from "../src/modules/payment/payment-gateway.service";

let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  app = await buildApp();
});

after(async () => {
  await app.close();
  await db.end();
});

describe("Payment Gateway Integration & Cryptographic Webhooks", () => {
  const secretKey = "test_paystack_secret_key_12345";
  const flwHash = "test_flutterwave_secret_hash_98765";

  before(() => {
    process.env.PAYSTACK_SECRET_KEY = secretKey;
    process.env.FLUTTERWAVE_SECRET_HASH = flwHash;
  });

  it("verifies authentic Paystack HMAC SHA-512 signatures accurately", () => {
    const payload = JSON.stringify({ event: "charge.success", data: { reference: "ref_123" } });
    const signature = createHmac("sha512", secretKey).update(payload).digest("hex");

    const isValid = verifyPaystackSignature(payload, signature);
    assert.equal(isValid, true, "Signature should be valid");

    const isInvalid = verifyPaystackSignature(payload, "forged_signature_hex_value");
    assert.equal(isInvalid, false, "Forged signature should be rejected");
  });

  it("verifies authentic Flutterwave webhook secret hash accurately", () => {
    const isValid = verifyFlutterwaveSignature(flwHash);
    assert.equal(isValid, true, "Hash should match configured secret");

    const isInvalid = verifyFlutterwaveSignature("tampered_hash_token");
    assert.equal(isInvalid, false, "Mismatched hash should be rejected");
  });

  it("rejects unauthorized Paystack webhook requests with 401 when signature is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/payments/paystack/webhook",
      headers: {
        "x-paystack-signature": "invalid_hmac_sha512",
        "content-type": "application/json",
      },
      payload: {
        event: "charge.success",
        data: { reference: "ref_spoofed_attempt" },
      },
    });

    assert.equal(response.statusCode, 401);
    const json = response.json();
    assert.equal(json.error.code, "INVALID_WEBHOOK_SIGNATURE");
  });

  it("rejects unauthorized Flutterwave webhook requests with 401 when secret hash is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/payments/flutterwave/webhook",
      headers: {
        "verif-hash": "wrong_secret_hash",
        "content-type": "application/json",
      },
      payload: {
        event: "charge.completed",
        data: { tx_ref: "tx_spoofed_attempt" },
      },
    });

    assert.equal(response.statusCode, 401);
    const json = response.json();
    assert.equal(json.error.code, "INVALID_WEBHOOK_HASH");
  });
});
