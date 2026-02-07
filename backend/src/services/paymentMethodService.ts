import { pool } from '../config/database';

export interface PaymentMethod {
  id: string;
  trader_id: string;
  method_type: 'bank' | 'mobile_money';
  provider: string;
  account_holder_name: string;
  phone_number?: string;
  phone_country_code?: string;
  bank_name?: string;
  account_number?: string;
  iban?: string;
  swift_code?: string;
  currency?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentMethodDTO {
  method_type: 'bank' | 'mobile_money';
  provider: string;
  account_holder_name: string;
  phone_number?: string;
  phone_country_code?: string;
  bank_name?: string;
  account_number?: string;
  iban?: string;
  swift_code?: string;
  currency?: string;
  is_primary?: boolean;
}

// Mobile money provider prefixes for validation
const MOBILE_MONEY_PROVIDERS: Record<string, { countries: string[]; prefixes: RegExp[] }> = {
  orange_money: {
    countries: ['CM', 'SN', 'ML', 'CI'],
    prefixes: [/^\+237\s?6[59]/, /^\+221\s?77/, /^\+223\s?7/, /^\+225\s?07/],
  },
  mtn_momo: {
    countries: ['CM', 'GH', 'UG'],
    prefixes: [/^\+237\s?6[78]/, /^\+233\s?[25]4/, /^\+256\s?77/],
  },
  mpesa: {
    countries: ['KE', 'TZ'],
    prefixes: [/^\+254\s?7/, /^\+255\s?7/],
  },
  airtel_money: {
    countries: ['KE', 'UG', 'TZ'],
    prefixes: [/^\+254\s?7/, /^\+256\s?7/, /^\+255\s?7/],
  },
  wave: {
    countries: ['SN', 'CI'],
    prefixes: [/^\+221\s?7/, /^\+225\s?0/],
  },
};

class PaymentMethodService {
  /**
   * Validate IBAN format and checksum
   */
  validateIBAN(iban: string): { valid: boolean; error?: string } {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();

    // Check length (varies by country, but min 15, max 34)
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return { valid: false, error: 'IBAN must be between 15 and 34 characters' };
    }

    // Check format: 2 letters + 2 digits + alphanumeric
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
      return { valid: false, error: 'Invalid IBAN format' };
    }

    // Validate checksum (ISO 7064 Mod 97-10)
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericIban = rearranged.replace(/[A-Z]/g, (char) =>
      (char.charCodeAt(0) - 55).toString()
    );

    // Calculate mod 97
    let remainder = 0;
    for (const digit of numericIban) {
      remainder = (remainder * 10 + parseInt(digit)) % 97;
    }

    if (remainder !== 1) {
      return { valid: false, error: 'Invalid IBAN checksum' };
    }

    return { valid: true };
  }

  /**
   * Validate SWIFT/BIC code format
   */
  validateSWIFT(swift: string): { valid: boolean; error?: string } {
    const cleanSwift = swift.replace(/\s/g, '').toUpperCase();

    // SWIFT codes are 8 or 11 characters
    if (cleanSwift.length !== 8 && cleanSwift.length !== 11) {
      return { valid: false, error: 'SWIFT code must be 8 or 11 characters' };
    }

    // Format: 4 letters (bank) + 2 letters (country) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanSwift)) {
      return { valid: false, error: 'Invalid SWIFT code format' };
    }

    return { valid: true };
  }

  /**
   * Validate mobile money phone number for provider
   */
  validateMobileMoneyPhone(provider: string, phone: string): { valid: boolean; error?: string } {
    const cleanPhone = phone.replace(/\s/g, '');

    const providerConfig = MOBILE_MONEY_PROVIDERS[provider];
    if (!providerConfig) {
      return { valid: false, error: `Unknown provider: ${provider}` };
    }

    const matchesPrefix = providerConfig.prefixes.some((prefix) => prefix.test(cleanPhone));
    if (!matchesPrefix) {
      return {
        valid: false,
        error: `Phone number doesn't match ${provider} format. Expected format for ${providerConfig.countries.join(', ')}`,
      };
    }

    // Check total length (should be around 12-15 characters with country code)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return { valid: false, error: 'Phone number must be 10-15 digits including country code' };
    }

    return { valid: true };
  }

  /**
   * Validate payment method data
   */
  validatePaymentMethod(data: CreatePaymentMethodDTO): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Common validations
    if (!data.method_type || !['bank', 'mobile_money'].includes(data.method_type)) {
      errors.push('Invalid method type');
    }

    if (!data.provider) {
      errors.push('Provider is required');
    }

    if (!data.account_holder_name || data.account_holder_name.length < 2) {
      errors.push('Account holder name is required');
    }

    // Type-specific validations
    if (data.method_type === 'bank') {
      if (!data.bank_name) {
        errors.push('Bank name is required');
      }

      if (!data.account_number) {
        errors.push('Account number is required');
      }

      // Validate IBAN if provided
      if (data.iban) {
        const ibanResult = this.validateIBAN(data.iban);
        if (!ibanResult.valid) {
          errors.push(ibanResult.error!);
        }
      }

      // Validate SWIFT if provided
      if (data.swift_code) {
        const swiftResult = this.validateSWIFT(data.swift_code);
        if (!swiftResult.valid) {
          errors.push(swiftResult.error!);
        }
      }
    } else if (data.method_type === 'mobile_money') {
      if (!data.phone_number) {
        errors.push('Phone number is required for mobile money');
      } else {
        const phoneResult = this.validateMobileMoneyPhone(data.provider, data.phone_number);
        if (!phoneResult.valid) {
          errors.push(phoneResult.error!);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all payment methods for a trader
   */
  async getPaymentMethods(traderId: string): Promise<PaymentMethod[]> {
    const result = await pool.query(
      `SELECT * FROM trader_payment_methods
       WHERE trader_id = $1 AND is_active = TRUE
       ORDER BY is_primary DESC, created_at DESC`,
      [traderId]
    );
    return result.rows;
  }

  /**
   * Get a single payment method
   */
  async getPaymentMethod(id: string): Promise<PaymentMethod | null> {
    const result = await pool.query(
      'SELECT * FROM trader_payment_methods WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get trader's primary payment method
   */
  async getPrimaryPaymentMethod(traderId: string): Promise<PaymentMethod | null> {
    const result = await pool.query(
      `SELECT * FROM trader_payment_methods
       WHERE trader_id = $1 AND is_primary = TRUE AND is_active = TRUE
       LIMIT 1`,
      [traderId]
    );
    return result.rows[0] || null;
  }

  /**
   * Add a payment method
   */
  async addPaymentMethod(traderId: string, data: CreatePaymentMethodDTO): Promise<PaymentMethod> {
    // Validate data
    const validation = this.validatePaymentMethod(data);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // If this is the first method or marked as primary, handle primary flag
    const existingMethods = await this.getPaymentMethods(traderId);
    const shouldBePrimary = existingMethods.length === 0 || data.is_primary;

    // If setting as primary, unset other primaries
    if (shouldBePrimary && existingMethods.length > 0) {
      await pool.query(
        'UPDATE trader_payment_methods SET is_primary = FALSE WHERE trader_id = $1',
        [traderId]
      );
    }

    const result = await pool.query(
      `INSERT INTO trader_payment_methods
       (trader_id, method_type, provider, account_holder_name, phone_number, phone_country_code,
        bank_name, account_number, iban, swift_code, currency, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        traderId,
        data.method_type,
        data.provider,
        data.account_holder_name,
        data.phone_number,
        data.phone_country_code,
        data.bank_name,
        data.account_number,
        data.iban?.replace(/\s/g, '').toUpperCase(),
        data.swift_code?.replace(/\s/g, '').toUpperCase(),
        data.currency,
        shouldBePrimary,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(
    id: string,
    traderId: string,
    data: Partial<CreatePaymentMethodDTO>
  ): Promise<PaymentMethod> {
    // Get existing method
    const existing = await this.getPaymentMethod(id);
    if (!existing || existing.trader_id !== traderId) {
      throw new Error('Payment method not found');
    }

    // Merge and validate
    const merged = { ...existing, ...data } as CreatePaymentMethodDTO;
    const validation = this.validatePaymentMethod(merged);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const result = await pool.query(
      `UPDATE trader_payment_methods SET
        method_type = $1, provider = $2, account_holder_name = $3,
        phone_number = $4, phone_country_code = $5, bank_name = $6,
        account_number = $7, iban = $8, swift_code = $9, currency = $10,
        updated_at = NOW()
       WHERE id = $11 AND trader_id = $12
       RETURNING *`,
      [
        data.method_type ?? existing.method_type,
        data.provider ?? existing.provider,
        data.account_holder_name ?? existing.account_holder_name,
        data.phone_number ?? existing.phone_number,
        data.phone_country_code ?? existing.phone_country_code,
        data.bank_name ?? existing.bank_name,
        data.account_number ?? existing.account_number,
        data.iban?.replace(/\s/g, '').toUpperCase() ?? existing.iban,
        data.swift_code?.replace(/\s/g, '').toUpperCase() ?? existing.swift_code,
        data.currency ?? existing.currency,
        id,
        traderId,
      ]
    );

    return result.rows[0];
  }

  /**
   * Delete (soft delete) a payment method
   */
  async deletePaymentMethod(id: string, traderId: string): Promise<void> {
    const method = await this.getPaymentMethod(id);
    if (!method || method.trader_id !== traderId) {
      throw new Error('Payment method not found');
    }

    await pool.query(
      'UPDATE trader_payment_methods SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [id]
    );

    // If deleted method was primary, make another one primary
    if (method.is_primary) {
      const remaining = await this.getPaymentMethods(traderId);
      if (remaining.length > 0) {
        await this.setPrimary(traderId, remaining[0].id);
      }
    }
  }

  /**
   * Set a payment method as primary
   */
  async setPrimary(traderId: string, methodId: string): Promise<void> {
    // Verify method belongs to trader
    const method = await this.getPaymentMethod(methodId);
    if (!method || method.trader_id !== traderId) {
      throw new Error('Payment method not found');
    }

    // Unset all primaries
    await pool.query(
      'UPDATE trader_payment_methods SET is_primary = FALSE WHERE trader_id = $1',
      [traderId]
    );

    // Set new primary
    await pool.query(
      'UPDATE trader_payment_methods SET is_primary = TRUE, updated_at = NOW() WHERE id = $1',
      [methodId]
    );
  }

  /**
   * Mask sensitive data for display
   */
  maskPaymentMethod(method: PaymentMethod): Partial<PaymentMethod> {
    const masked = { ...method };

    // Mask account number (show last 4 digits)
    if (masked.account_number) {
      masked.account_number = '****' + masked.account_number.slice(-4);
    }

    // Mask IBAN (show first 4 and last 4)
    if (masked.iban) {
      masked.iban = masked.iban.slice(0, 4) + '****' + masked.iban.slice(-4);
    }

    // Mask phone number (show last 4 digits)
    if (masked.phone_number) {
      masked.phone_number = '****' + masked.phone_number.slice(-4);
    }

    return masked;
  }
}

export const paymentMethodService = new PaymentMethodService();
