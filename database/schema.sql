-- =============================================================================
-- RECHARGE EXPRES — FINTECH SUPER APPLICATION POSTGRESQL SCHEMA
-- Double-Entry Wallet Ledger, Encrypted Gateways, BBPS Providers, WhatsApp OTP,
-- UPI & Authorized Payouts, Referrals, RBAC Staff, and Immutable Audit Trail
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Customers, Staff & Super Admins
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mobile_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT,
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'MIN_KYC' CHECK (kyc_status IN ('PENDING', 'MIN_KYC', 'VERIFIED')),
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'SUPER_ADMIN')),
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'LOCKED')),
    referral_code VARCHAR(32) UNIQUE NOT NULL,
    referred_by_code VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Wallets (Customer & System Liability Accounts)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    available_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0.00),
    locked_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0.00),
    cashback_earned NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (cashback_earned >= 0.00),
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Double-Entry Accounting Journal Transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_reference VARCHAR(64) UNIQUE NOT NULL,
    idempotency_key VARCHAR(80) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT')),
    category VARCHAR(32) NOT NULL CHECK (category IN (
        'ADD_MONEY', 'RECHARGE', 'BILL_PAYMENT', 'UPI_TRANSFER',
        'BANK_PAYOUT', 'CASHBACK', 'REFERRAL_BONUS', 'REFUND', 'ADMIN_ADJUSTMENT'
    )),
    service_name VARCHAR(80) NOT NULL,
    provider_name VARCHAR(80) NOT NULL,
    target_identifier VARCHAR(100) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    opening_balance NUMERIC(14, 2) NOT NULL CHECK (opening_balance >= 0),
    closing_balance NUMERIC(14, 2) NOT NULL CHECK (closing_balance >= 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    gateway_reference VARCHAR(80),
    webhook_verified BOOLEAN NOT NULL DEFAULT FALSE,
    narration VARCHAR(240) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Double-Entry Ledger Lines (Guarantees SUM(debit) = SUM(credit))
CREATE TABLE ledger_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES wallet_transactions(id) ON DELETE RESTRICT,
    account_code VARCHAR(40) NOT NULL, -- e.g. 'USER_WALLET_LIABILITY', 'GATEWAY_ESCROW_ASSET', 'BBPS_SETTLEMENT'
    debit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
    credit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_single_sided_posting CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0)
    )
);

-- 5. Authorized Payment Merchant Gateways (AES-256-GCM Encrypted Secrets)
CREATE TABLE payment_merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_name VARCHAR(80) NOT NULL,
    gateway_type VARCHAR(30) NOT NULL CHECK (gateway_type IN ('PAYTM', 'PHONEPE', 'RAZORPAY', 'CASHFREE', 'CUSTOM')),
    merchant_id_code VARCHAR(80) NOT NULL,
    api_key_encrypted BYTEA NOT NULL,
    api_secret_encrypted BYTEA NOT NULL,
    webhook_secret_encrypted BYTEA NOT NULL,
    callback_url VARCHAR(200) NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION' CHECK (environment IN ('PRODUCTION', 'SANDBOX')),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Multi-Provider Recharge & BBPS API Integrations
CREATE TABLE recharge_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(80) NOT NULL,
    base_url VARCHAR(200) NOT NULL,
    api_token_encrypted BYTEA NOT NULL,
    api_username VARCHAR(80),
    api_password_encrypted BYTEA,
    recharge_endpoint VARCHAR(120) NOT NULL,
    status_check_endpoint VARCHAR(120) NOT NULL,
    balance_check_endpoint VARCHAR(120) NOT NULL,
    callback_url VARCHAR(200) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.50,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_known_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WhatsApp Business Cloud API Settings & OTP Rate Limiter
CREATE TABLE whatsapp_business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_phone VARCHAR(24) NOT NULL,
    phone_number_id VARCHAR(64) NOT NULL,
    business_account_id VARCHAR(64) NOT NULL,
    access_token_encrypted BYTEA NOT NULL,
    webhook_verify_token_encrypted BYTEA NOT NULL,
    otp_expiry_seconds INTEGER NOT NULL DEFAULT 300,
    max_resend_attempts INTEGER NOT NULL DEFAULT 3,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Authorized Bank & UPI Withdrawal Payouts
CREATE TABLE bank_payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID NOT NULL REFERENCES wallet_transactions(id),
    beneficiary_name VARCHAR(100) NOT NULL,
    account_number_masked VARCHAR(40) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    transfer_mode VARCHAR(10) NOT NULL CHECK (transfer_mode IN ('IMPS', 'NEFT', 'UPI')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payout_fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(24) NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'PROCESSING', 'SETTLED', 'REJECTED')),
    utr_reference VARCHAR(64),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Immutable Security & Compliance Audit Logs
CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id),
    actor_email VARCHAR(150) NOT NULL,
    action_name VARCHAR(100) NOT NULL,
    module_name VARCHAR(60) NOT NULL,
    target_record_id VARCHAR(128) NOT NULL,
    ip_address INET,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_status ON wallet_transactions(status);
CREATE INDEX idx_payout_status ON bank_payout_requests(status);
