// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { Serializer, Deserializer, Bytes } from "../bcs";

// TODO: Get feedback on these error messages, ideally they can be used directly in
// dapps and wallets. The enum is meant to make it possible for daps to user their
// own error messages if they want, but the defaults should still be good, and they're
// not great right now.

// These options influence fromStr and the isValid* functions. You may use them to make
// the parsing of those functions strictier. Not setting these options is the best way
// to comply with AIP 40 but while migrating it may be helpful to be able to enforce
// stricter behavior. If we agree to make these two enabled by default, I can update
// the AIP to say that this is what people SHOULD do but they MAY opt in to accepting
// addresses more leniently in specifically these two ways.
export type ValidityOptions = {
  // Only addresses in the long form (64 characters + optionally a leading 0x) will be
  // considered valid unless the address is special.
  requireLongFormUnlessSpecial?: boolean;

  // Only addresses in the long form (64 characters + optionally a leading 0x) will be
  // considered valid, even if the address is special.
  requireLongForm?: boolean;

  // If set, the address string will be considered invalid if there is no leading 0x.
  requireLeadingZeroX?: boolean;
};

// TODO: As part of reviewing this we should discuss these options. I'm partially
// inclined to say that requireLongFormUnlessSpecial and requireLeadingZeroX should
// actually be enabled by default. Maayan and Greg to provide their thoughts as well as
// wallet and dapp folks.
export const defaultValidityOptions: ValidityOptions = {
  requireLongFormUnlessSpecial: false,
  requireLongForm: false,
  requireLeadingZeroX: false,
};

export enum AddressInvalidReason {
  INCORRECT_NUMBER_OF_BYTES = "incorrect_number of bytes",
  ADDRESS_TOO_SHORT = "address_too_short",
  ADDRESS_TOO_LONG = "address_too_long",
  LEADING_ZERO_X_REQUIRED = "leading_zero_x_required",
  LONG_FORM_REQUIRED = "long_form_required",
  LONG_FORM_REQUIRED_UNLESS_SPECIAL = "long_form_required_unless_special",
}

/**
 * This error is used to explain why an address was invalid.
 */
export class AddressInvalidError extends Error {
  // This provides a programmatic way to access why an address was invalid. Downstream
  // devs might want to use this to build their own error messages if the default error
  // messages are not suitable for their use case.
  public reason: AddressInvalidReason;

  constructor(message: string, reason: AddressInvalidReason) {
    super(message);
    this.reason = reason;
  }
}

export class AccountAddress {
  // The number of bytes that make up an account address.
  static readonly LENGTH: number = 32;

  // The length of an address string in long form without a leading 0x.
  static readonly LONG_STRING_LENGTH: number = 64;

  // This is the internal representation of an account address.
  readonly address: Bytes;

  static ADDRESS_ONE: AccountAddress = AccountAddress.fromStr("0x1");

  static ADDRESS_TWO: AccountAddress = AccountAddress.fromStr("0x2");

  static ADDRESS_THREE: AccountAddress = AccountAddress.fromStr("0x3");

  static ADDRESS_FOUR: AccountAddress = AccountAddress.fromStr("0x4");

  constructor(address: Bytes) {
    if (address.length !== AccountAddress.LENGTH) {
      throw new AddressInvalidError("Expected address of length 32", AddressInvalidReason.INCORRECT_NUMBER_OF_BYTES);
    }
    this.address = address;
  }

  /**
   * Creates AccountAddress from a hex string.
   *
   * This function conforms to AIP 40. In short this means the following formats are
   * accepted by default:
   *
   * - LONG: 64 characters, with or without a leading 0x.
   * - SHORT: Some number of characters as a suffix with padding zeroes if necessary,
   *   with or without a leading 0x.
   *
   * By setting `validityOptions` you may make this function stricter. For more
   * information see the documentation of ValidityOptions.
   *
   * @param str A long or short hex string with or without leading zeroes, by default.
   * This is explained further in the function docstring.
   */
  static fromStr(str: string, validityOptions?: ValidityOptions): AccountAddress {
    let input = str;

    // Remove leading 0x if present.
    if (input.startsWith("0x")) {
      input = input.slice(2);
    } else if (validityOptions?.requireLeadingZeroX) {
      throw new AddressInvalidError(
        "requireLeadingZeroX is true but the address string did not start with 0x.",
        AddressInvalidReason.LEADING_ZERO_X_REQUIRED,
      );
    }

    // Ensure the address string is at least 1 character long.
    if (input.length === 0) {
      throw new AddressInvalidError(
        "Hex string is too short, must be 1 to 64 chars long, excluding the leading 0x.",
        AddressInvalidReason.ADDRESS_TOO_SHORT,
      );
    }

    // Ensure the address string is not longer than 64 characters.
    if (input.length > 64) {
      throw new AddressInvalidError(
        "Hex string is too long, must be 1 to 64 chars long, excluding the leading 0x.",
        AddressInvalidReason.ADDRESS_TOO_LONG,
      );
    }

    // Pad the address with leading zeroes so it is 64 chars long and then convert the
    // hex string to bytes. Every two characters in a hex string constitutes a single
    // byte. So a 64 length hex string becomes a 32 byte array.
    const addressBytes = hexToBytes(input.padStart(64, "0"));

    const address = new AccountAddress(addressBytes);

    if (input.length !== this.LONG_STRING_LENGTH) {
      // Confirm the address is in long form, special or not, if requireLongForm is set.
      if (validityOptions?.requireLongForm) {
        throw new AddressInvalidError(
          "requireLongForm is true but the address string was not in long form (an optional 0x prefix + 64 chars).",
          AddressInvalidReason.LONG_FORM_REQUIRED,
        );
      }

      // Confirm the address is in long form, special or not, if requireLongForm is set.
      if (validityOptions?.requireLongFormUnlessSpecial && !address.isSpecial()) {
        throw new AddressInvalidError(
          "requireLongFormUnlessTrue is true but the address was not special and still not in long form.",
          AddressInvalidReason.LONG_FORM_REQUIRED_UNLESS_SPECIAL,
        );
      }
    }

    return address;
  }

  /**
   * Checks if the string is a valid AccountAddress.
   *
   * @returns True if the string is valid, false if not.
   */
  static isValid(str: string, validityOptions: ValidityOptions = defaultValidityOptions): boolean {
    try {
      AccountAddress.fromStr(str, validityOptions);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Checks if the string is a valid AccountAddress.
   *
   * @returns valid=true if the string is valid. valid=false if not. If false,
   * invalidReason will be set explaining why it is invalid.
   */
  static isValidWithReason(
    str: string,
    validityOptions: ValidityOptions = defaultValidityOptions,
  ): { valid: boolean; invalidReason: string | null; invalidReasonCode: AddressInvalidReason | null } {
    try {
      AccountAddress.fromStr(str, validityOptions);
      return { valid: true, invalidReason: null, invalidReasonCode: null };
    } catch (e) {
      const addressInvalidError = e as AddressInvalidError;
      return {
        valid: false,
        invalidReason: addressInvalidError.message,
        invalidReasonCode: addressInvalidError.reason,
      };
    }
  }

  /**
   * Returns whether an address is special, where special is defined as 0x0 to 0xf
   * inclusive. In other words, the last byte of the address must be < 0b10000 (16)
   * and every other byte must be zero.
   */
  isSpecial(): boolean {
    return (
      this.address.slice(0, this.address.length - 1).every((byte) => byte === 0) &&
      this.address[this.address.length - 1] < 0b10000
    );
  }

  /**
   * Conforms to AIP 40. TODO: Write more.
   */
  toString(): string {
    let hex = bytesToHex(this.address);
    if (this.isSpecial()) {
      hex = hex[hex.length - 1];
    }
    return `0x${hex}`;
  }

  /*
   * Whereas toString will format special addresses (as defined by isSpecial) using the
   * short form (no leading 0s), this function will include leading zeroes. This is
   * allowed as per AIP 40 if the need arises, but using toString is preferred.
   */
  toStringLong(): string {
    return `0x${bytesToHex(this.address)}`;
  }

  // For use with the BCS payload generation library.
  serialize(serializer: Serializer): void {
    serializer.serializeFixedBytes(this.address);
  }

  // For use with the BCS payload generation library.
  static deserialize(deserializer: Deserializer): AccountAddress {
    return new AccountAddress(deserializer.deserializeFixedBytes(AccountAddress.LENGTH));
  }
}
