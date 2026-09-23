import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkoutPreviewSchema } from "../src/modules/checkout/checkout.schemas";
import { placeOrderSchema } from "../src/modules/order/order.schemas";
import { normalizePhoneNumber } from "../src/utils/phone";

const deliveryFields = {
  deliveryAddressLine: "12 Market Street",
  deliveryCity: "Abuja",
  deliveryState: "FCT",
  latitude: 9.0765,
  longitude: 7.3986
};

describe("delivery contact phone validation", () => {
  it("normalizes Nigerian local and country-code formats", () => {
    assert.equal(normalizePhoneNumber("0803 123 4567"), "+2348031234567");
    assert.equal(normalizePhoneNumber("2348031234567"), "+2348031234567");
    assert.equal(normalizePhoneNumber("+234 803 123 4567"), "+2348031234567");
  });

  it("rejects missing and invalid order phone values", () => {
    assert.throws(() => placeOrderSchema.parse(deliveryFields));
    assert.throws(() => placeOrderSchema.parse({
      ...deliveryFields,
      deliveryContactPhone: "not-a-phone"
    }));
  });

  it("requires the same valid phone value for checkout preview", () => {
    const result = checkoutPreviewSchema.parse({
      ...deliveryFields,
      deliveryContactPhone: "08031234567"
    });

    assert.equal(result.deliveryContactPhone, "+2348031234567");
  });
});

describe("delivery contact phone integration", { skip: "Requires an explicitly isolated test database" }, () => {
  it("persists the submitted phone on the order", () => {
    assert.fail("Run with the isolated order integration fixture.");
  });

  it("returns the phone to the assigned rider only", () => {
    assert.fail("Run with the isolated rider ownership fixture.");
  });
});
