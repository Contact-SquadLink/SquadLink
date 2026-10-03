import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { registerSchema } from "../src/modules/auth/auth.schemas";
import { createBusinessSchema } from "../src/modules/business/business.schemas";
import { contactMessageSchema } from "../src/modules/contact/contact.routes";
import { createAdminSchema } from "../src/modules/platform-admin/platform-admin.schemas";
import { emailAddressSchema } from "../src/utils/email-address";
import { resolvePaystackCustomerEmail } from "../src/modules/payment/payment-gateway.service";
import { confirmEmailChangeSchema, requestEmailChangeSchema } from "../src/modules/auth/auth.schemas";

describe("strict email address validation", () => {
  it("normalizes valid addresses and allows custom domains", () => {
    assert.equal(emailAddressSchema.parse("  Ops@Delivery.Example.ng "), "ops@delivery.example.ng");
  });

  it("rejects common provider typos with a correction hint", () => {
    const result = emailAddressSchema.safeParse("john.doe@gmail.come");
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0].message, /gmail\.com/);
    }
  });

  it("does not pass a known typo-domain address to Paystack", () => {
    assert.equal(
      resolvePaystackCustomerEmail("john.doe@gmail.come", "12345678-user"),
      "customer-12345678@squadlink.app",
    );
  });

  it("validates both steps of the verified email-change flow", () => {
    assert.equal(requestEmailChangeSchema.safeParse({ email: "person@example.co.uk" }).success, true);
    assert.equal(requestEmailChangeSchema.safeParse({ email: "person@gmail.come" }).success, false);
    assert.equal(confirmEmailChangeSchema.safeParse({ email: "person@example.co.uk", code: "123456" }).success, true);
    assert.equal(confirmEmailChangeSchema.safeParse({ email: "person@example.co.uk", code: "12345x" }).success, false);
  });

  it("applies the rule to every current email-provisioning form", () => {
    const badEmail = "person@gmail.come";
    const registration = registerSchema.safeParse({
      email: badEmail,
      phoneNumber: "+2348012345678",
      password: "safe-password-1",
      termsAccepted: true,
    });
    const business = createBusinessSchema.safeParse({
      name: "Corner Shop",
      email: badEmail,
      addressLine: "1 Test Road",
      city: "Bauchi",
      state: "Bauchi",
      latitude: 10,
      longitude: 9,
    });
    const admin = createAdminSchema.safeParse({
      email: badEmail,
      password: "safe-password-1",
      firstName: "Test",
      lastName: "Admin",
      phoneNumber: "+2348012345678",
    });
    const contact = contactMessageSchema.safeParse({
      name: "Test User",
      email: badEmail,
      message: "A sufficiently long message.",
    });

    assert.equal(registration.success, false);
    assert.equal(business.success, false);
    assert.equal(admin.success, false);
    assert.equal(contact.success, false);
  });
});