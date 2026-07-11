import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCsvText, chunkRows } from "./csvParser";
import {
  hasContactInfo,
  normalizeCreatedAt,
  normalizeStatus,
  splitPhone,
  sanitizeLead,
} from "./normalize";

describe("csvParser", () => {
  it("parses headers and rows", () => {
    const csv = `Name,Email,Phone
John,john@test.com,+919876543210
Jane,jane@test.com,9876543211`;
    const parsed = parseCsvText(csv);
    assert.equal(parsed.headers.length, 3);
    assert.equal(parsed.totalRows, 2);
    assert.equal(parsed.rows[0].Name, "John");
  });

  it("chunks arrays", () => {
    assert.deepEqual(chunkRows([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });
});

describe("normalize", () => {
  it("splits Indian phone numbers", () => {
    assert.deepEqual(splitPhone("+919876543210"), {
      country_code: "+91",
      mobile_without_country_code: "9876543210",
    });
  });

  it("normalizes status aliases", () => {
    assert.equal(normalizeStatus("Sale Done"), "SALE_DONE");
    assert.equal(normalizeStatus("Good Lead"), "GOOD_LEAD_FOLLOW_UP");
  });

  it("parses DD-MM-YYYY dates", () => {
    const v = normalizeCreatedAt("29-06-2026 10:00");
    assert.ok(v);
    assert.ok(!Number.isNaN(new Date(v!).getTime()));
  });

  it("requires email or mobile", () => {
    assert.equal(hasContactInfo({ email: null, mobile_without_country_code: null }), false);
    assert.equal(hasContactInfo({ email: "a@b.com", mobile_without_country_code: null }), true);
  });

  it("sanitizes lead notes newlines", () => {
    const lead = sanitizeLead({
      email: "a@b.com",
      crm_note: "line1\nline2",
    });
    assert.equal(lead.crm_note, "line1\\nline2");
  });
});
