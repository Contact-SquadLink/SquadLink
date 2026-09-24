import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBusinessSchema } from "../src/modules/business/business.schemas";

const validApplication = {
  name: "Fresh Market",
  addressLine: "12 Market Road",
  city: "Lagos",
  state: "Lagos State",
  latitude: 6.5244,
  longitude: 3.3792,
  minimumOrderAmount: 0
};

describe("business application Phase 1 contract", () => {
  it("accepts a complete customer business application", () => {
    const result = createBusinessSchema.parse(validApplication);
    assert.equal(result.name, "Fresh Market");
  });

  it("rejects invalid location and malformed contact data", () => {
    assert.throws(() => createBusinessSchema.parse({
      ...validApplication,
      latitude: 120
    }));
    assert.throws(() => createBusinessSchema.parse({
      ...validApplication,
      email: "not-an-email"
    }));
  });
});

describe("business application database integration", { skip: "Requires an explicitly isolated test database" }, () => {
  it("persists pending applications and scopes status to the applicant", () => {
    assert.fail("Run with the isolated Phase 1 integration fixture.");
  });

  it("creates one approval notification and gates business access", () => {
    assert.fail("Run with the isolated Phase 1 integration fixture.");
  });
});
