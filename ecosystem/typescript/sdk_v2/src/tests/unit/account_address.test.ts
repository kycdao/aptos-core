// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { AccountAddress, ValidityOptions } from "../../types/account_address";

const NON_SPECIAL_ADDRESS_LONG = "0x000000000000000000000000000000000000000000000000000000000a550c18";
const NON_SPECIAL_ADDRESS_SHORT = "0xa550c18";
const SPECIAL_ADDRESS_LONG = "0x0000000000000000000000000000000000000000000000000000000000000001";
const SPECIAL_ADDRESS_SHORT = "0x1";

///
// Tests for toString.
///

describe("AccountAddress toString", () => {
  it("Test special address: 0x0", async () => {
    const addr = AccountAddress.fromStr("0x0000000000000000000000000000000000000000000000000000000000000000");
    expect(addr.toString()).toBe("0x0");
  });

  it("Test special address: 0x1", async () => {
    const addr = AccountAddress.fromStr("0x0000000000000000000000000000000000000000000000000000000000000001");
    expect(addr.toString()).toBe("0x1");
  });

  it("Test special address: 0x4", async () => {
    const addr = AccountAddress.fromStr("0x0000000000000000000000000000000000000000000000000000000000000004");
    expect(addr.toString()).toBe("0x4");
  });

  it("Test special address: 0xf", async () => {
    const addr = AccountAddress.fromStr("0x000000000000000000000000000000000000000000000000000000000000000f");
    expect(addr.toString()).toBe("0xf");
  });

  it("test special address from short: 0x0", async () => {
    const addr = AccountAddress.fromStr("0x0");
    expect(addr.toString()).toBe("0x0");
  });

  it("Test special address from short: 0xf", async () => {
    const addr = AccountAddress.fromStr("0xf");
    expect(addr.toString()).toBe("0xf");
  });

  it("Test special address from short no 0x: d", async () => {
    const addr = AccountAddress.fromStr("d");
    expect(addr.toString()).toBe("0xd");
  });

  it("Test non-special address from short: 0x10", async () => {
    const addr = AccountAddress.fromStr("0x10");
    expect(addr.toString()).toBe("0x0000000000000000000000000000000000000000000000000000000000000010");
  });

  it("Test non-special address from long: 0x0000000000000000000000000000000000000000000000000000000000000010", async () => {
    const addr = AccountAddress.fromStr("0x0000000000000000000000000000000000000000000000000000000000000010");
    expect(addr.toString()).toBe("0x0000000000000000000000000000000000000000000000000000000000000010");
  });

  it("Test non-special address from long: 0x000000000000000000000000000000000000000000000000000000000000001f", async () => {
    const addr = AccountAddress.fromStr("0x000000000000000000000000000000000000000000000000000000000000001f");
    expect(addr.toString()).toBe("0x000000000000000000000000000000000000000000000000000000000000001f");
  });

  it("Test non-special address from long: 0x00000000000000000000000000000000000000000000000000000000000000a0", async () => {
    const addr = AccountAddress.fromStr("0x00000000000000000000000000000000000000000000000000000000000000a0");
    expect(addr.toString()).toBe("0x00000000000000000000000000000000000000000000000000000000000000a0");
  });

  it("Test non-special address from long no 0x: ca843279e3427144cead5e4d5999a3d0ca843279e3427144cead5e4d5999a3d0", async () => {
    const addr = AccountAddress.fromStr("ca843279e3427144cead5e4d5999a3d0ca843279e3427144cead5e4d5999a3d0");
    expect(addr.toString()).toBe("0xca843279e3427144cead5e4d5999a3d0ca843279e3427144cead5e4d5999a3d0");
  });

  it("Test non-special address from long no 0x: 1000000000000000000000000000000000000000000000000000000000000000", async () => {
    const addr = AccountAddress.fromStr("1000000000000000000000000000000000000000000000000000000000000000");
    expect(addr.toString()).toBe("0x1000000000000000000000000000000000000000000000000000000000000000");
  });

  // Demonstrating that neither leading nor trailing zeroes get trimmed for
  // non-special addresses
  it("Test non-special address from long: 0f00000000000000000000000000000000000000000000000000000000000000", async () => {
    const addr = AccountAddress.fromStr("0f00000000000000000000000000000000000000000000000000000000000000");
    expect(addr.toString()).toBe("0x0f00000000000000000000000000000000000000000000000000000000000000");
  });
});

///
// Tests for toStringLong.
///

describe("AccountAddress toStringLong", () => {
  it("Test special address: 0x0", async () => {
    const addr = AccountAddress.fromStr("0x0");
    expect(addr.toStringLong()).toBe("0x0000000000000000000000000000000000000000000000000000000000000000");
  });

  it("Test special address: 0x1", async () => {
    const addr = AccountAddress.fromStr("0x0000000000000000000000000000000000000000000000000000000000000001");
    expect(addr.toStringLong()).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
  });

  it("Test non-special address from short: 0x10", async () => {
    const addr = AccountAddress.fromStr("0x10");
    expect(addr.toStringLong()).toBe("0x0000000000000000000000000000000000000000000000000000000000000010");
  });
});

///
// Tests for ValidityOptions
///

describe("AccountAddress ValidityOptions", () => {
  it("Test requireLeadingZeroX", async () => {
    const validityOptions: ValidityOptions = { requireLeadingZeroX: true };
    const { valid, invalidReason } = AccountAddress.isValidWithReason(
      "0000000000000000000000000000000000000000000000000000000000000001",
      validityOptions,
    );
    expect(valid).toBe(false);
    expect(invalidReason).toBe("requireLeadingZeroX is true but the address string did not start with 0x.");
  });

  it("Test requireLongForm", async () => {
    const validityOptions: ValidityOptions = { requireLongForm: true };
    const { valid, invalidReason } = AccountAddress.isValidWithReason("0x1", validityOptions);
    expect(valid).toBe(false);
    expect(invalidReason).toBe(
      "requireLongForm is true but the address string was not in long form (an optional 0x prefix + 64 chars).",
    );
  });

  it("Test requireLongFormUnlessSpecial with special", async () => {
    const validityOptions: ValidityOptions = { requireLongFormUnlessSpecial: true };
    const { valid, invalidReason } = AccountAddress.isValidWithReason("0x1", validityOptions);
    expect(valid).toBe(true);
    expect(invalidReason).toBe(null);
  });

  it("Test requireLongFormUnlessSpecial with non-special", async () => {
    const validityOptions: ValidityOptions = { requireLongFormUnlessSpecial: true };
    const { valid, invalidReason } = AccountAddress.isValidWithReason("0xaa", validityOptions);
    expect(valid).toBe(false);
    expect(invalidReason).toBe(
      "requireLongFormUnlessTrue is true but the address was not special and still not in long form.",
    );
  });
});

///
// Tests for everything else.
///

const ADDRESS_LONG = "000000000000000000000000000000000000000000000000000000000a550c18";
const ADDRESS_SHORT = "a550c18";

describe("AccountAddress", () => {
  it("gets created from full hex string", async () => {
    const addr = AccountAddress.fromStr(ADDRESS_LONG);
    expect(Buffer.from(addr.address).toString("hex")).toBe(ADDRESS_LONG);
  });

  it("gets created from short hex string", async () => {
    const addr = AccountAddress.fromStr(ADDRESS_SHORT);
    expect(Buffer.from(addr.address).toString("hex")).toBe(ADDRESS_LONG);
  });

  it("gets created from prefixed full hex string", async () => {
    const addr = AccountAddress.fromStr(`0x${ADDRESS_LONG}`);
    expect(Buffer.from(addr.address).toString("hex")).toBe(ADDRESS_LONG);
  });

  it("gets created from prefixed short hex string", async () => {
    const addr = AccountAddress.fromStr(`0x${ADDRESS_SHORT}`);
    expect(Buffer.from(addr.address).toString("hex")).toBe(ADDRESS_LONG);
  });

  it("gets created from prefixed short hex string with leading 0s", async () => {
    const addr = AccountAddress.fromStr(`0x000${ADDRESS_SHORT}`);
    expect(Buffer.from(addr.address).toString("hex")).toBe(ADDRESS_LONG);
  });

  it("throws exception when initiating from a long hex string", async () => {
    expect(() => {
      AccountAddress.fromStr(`1${ADDRESS_LONG}`);
      // eslint-disable-next-line quotes
    }).toThrow("Hex string is too long, must be 1 to 64 chars long, excluding the leading 0x.");
  });

  it("throws exception when initiating from a long hex string", async () => {
    expect(() => {
      AccountAddress.fromStr(`1${ADDRESS_LONG}`);
      // eslint-disable-next-line quotes
    }).toThrow("Hex string is too long, must be 1 to 64 chars long, excluding the leading 0x.");
  });

  it("isValid short with 0x", async () => {
    expect(AccountAddress.isValid(`0x${ADDRESS_SHORT}`)).toBe(true);
  });

  it("isValid short with leading 0s 0x", async () => {
    expect(AccountAddress.isValid(`0x000${ADDRESS_SHORT}`)).toBe(true);
  });

  it("isValid short with leading 0s 0x", async () => {
    expect(AccountAddress.isValid(`0x000${ADDRESS_SHORT}`)).toBe(true);
  });

  it("isValid long with leading 0s without 0x", async () => {
    expect(AccountAddress.isValid(`${ADDRESS_LONG}`)).toBe(true);
  });

  it("isValid long with leading 0s with 0x", async () => {
    expect(AccountAddress.isValid(`0x${ADDRESS_LONG}`)).toBe(true);
  });

  it("not isValid empty string", async () => {
    expect(AccountAddress.isValid("")).toBe(false);
  });

  it("not isValid just 0x", async () => {
    expect(AccountAddress.isValid("0x")).toBe(false);
  });

  it("not isValid too long without 0x", async () => {
    expect(AccountAddress.isValid(`00${ADDRESS_LONG}`)).toBe(false);
  });

  it("not isValid too long with 0x", async () => {
    expect(AccountAddress.isValid(`0x00${ADDRESS_LONG}`)).toBe(false);
  });

  it("not isValidWithReason too long with 0x", async () => {
    const { valid, invalidReason } = AccountAddress.isValidWithReason(`0x00${ADDRESS_LONG}`);
    expect(valid).toBe(false);
    expect(invalidReason).toBe("Hex string is too long, must be 1 to 64 chars long, excluding the leading 0x.");
  });
});
