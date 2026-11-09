# PHYSENRA SAAS — SALES REFERRAL MODULE STAGING RUNBOOK
**Classification:** STAGING ENVIRONMENT OPERATIONAL RUNBOOK  
**Module:** Sales Representative & Referral Management V1  
**Default Security Posture:** DISABLED BY DEFAULT (`sales_referrals_enabled.enabled = false`)

---

## 1. Executive Summary & Objective

This runbook guides Platform Engineering and DevOps teams through the secure deployment, configuration, verification, and controlled pilot activation of the Physenra Sales Representative & Referral Management module in the **Staging environment**.

The module has been architected to deploy completely **dark (disabled by default)**. Applying database migrations to staging does not activate commission evaluations or representative payouts until explicit owner authorization is granted.

---

## 2. Environment Variables & Secret Configuration

Configure the following environment variables in the Staging deployment platform (Netlify Dashboard & Supabase Vault):

| Environment Variable | Target Service | Purpose | Security Rule |
| :--- | :--- | :--- | :--- |
| `CRON_SECRET` | Netlify Functions | Authenticates automated background workers (`process-commission-outbox` and `reconcile-referral-commissions`). | **Mandatory:** Generate via `openssl rand -hex 32`. Never commit to Git or expose in frontend. |
| `PAYSTACK_SECRET_KEY` | Netlify Functions | Validates webhook signatures and initiates test API requests. | **Staging:** Must use Paystack test key `sk_test_...`. Live keys (`sk_live_...`) are strictly prohibited in staging. |
| `PAYSTACK_PUBLIC_KEY` | Frontend / Netlify | Client-side Paystack inline popup checkout. | **Staging:** Must use Paystack test key `pk_test_...`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify Functions | Backend service-role client for atomic database procedure invocation. | Staging Supabase project service role key. |

> [!CAUTION]
> Never place secrets or private keys in source code, client repositories, or version control. Store all credentials securely in Netlify Staging Environment Variables.

---

## 3. Database Migration Deployment Order

Execute the following migrations sequentially against the Staging Supabase database:

1. **Foundation Migration:**  
   `supabase/migrations/20261110000000_sales_rep_and_referral_foundation.sql`  
   *Deploys 12 core tables, immutable paid invoice triggers (`trg_00_freeze_paid_invoice_financials`), commission immutability triggers (`trg_protect_commission_immutability`), RLS firewall, and masked banking RPCs.*

2. **Settlement Engine Migration:**  
   `supabase/migrations/20261110010000_sales_commission_settlement_engine.sql`  
   *Deploys `evaluate_referral_commission`, hardened `process_subscription_payment_settlement` with non-aborting outbox fallback, server-authoritative attribution in `register_practice_and_subscribe`, idempotent `record_commission_adjustment`, `settle_payout_transfer_event`, and `process_commission_outbox_batch`.*

---

## 4. Default-Disabled Verification (Dark Launch Invariant)

Immediately after applying the migrations, execute the following SQL verification query in Staging:

```sql
SELECT 
  key, 
  value->>'enabled' AS is_enabled,
  value->>'pilot_mode' AS pilot_mode,
  value->>'annual_cap_cents' AS annual_cap_cents
FROM public.platform_settings 
WHERE key = 'sales_referrals_enabled';
```

### Required Expected Output:
| key | is_enabled | pilot_mode | annual_cap_cents |
| :--- | :--- | :--- | :--- |
| `sales_referrals_enabled` | `false` | `true` | `2500000` |

> [!IMPORTANT]
> If `is_enabled` is `true`, immediately execute:
> ```sql
> UPDATE public.platform_settings
> SET value = jsonb_set(value, '{enabled}', 'false'::jsonb), updated_at = now()
> WHERE key = 'sales_referrals_enabled';
> ```

---

## 5. Netlify Scheduled Functions & Background Cadence

Configure automated HTTP triggers (e.g. Netlify Scheduled Functions or external monitoring cron) targeting the staging API endpoints:

### 5.1 Outbox Queue Batch Retry Worker
* **Endpoint:** `POST https://<staging-domain>/api/process-commission-outbox`
* **Header:** `x-cron-secret: <CRON_SECRET>`
* **Payload:** `{"batch_size": 10, "lease_seconds": 300}`
* **Recommended Cadence:** Every 5 minutes (`*/5 * * * *`)
* **Behavior:** Claims up to 10 pending/expired retry tasks using `FOR UPDATE SKIP LOCKED` and 5-minute lease TTL.

### 5.2 Referral Reconciliation Scanner
* **Endpoint:** `POST https://<staging-domain>/api/reconcile-referral-commissions`
* **Header:** `x-cron-secret: <CRON_SECRET>`
* **Payload:** `{}`
* **Recommended Cadence:** Every 6 hours (`0 */6 * * *`)
* **Behavior:** Sweeps for attributed referrals with successful payments that lack commission records, and idempotently enqueues them into `sales_commission_outbox`.

---

## 6. Staging Paystack Webhook Configuration

1. Log into the **Paystack Staging Dashboard** (Test Mode).
2. Navigate to **Settings > API Keys & Webhooks**.
3. Set the **Webhook URL** to:
   ```text
   https://<staging-domain>/api/paystack-webhook
   ```
4. Verify that Paystack sends test webhook events for:
   * `charge.success`
   * `refund.processed`
   * `charge.dispute.create`
   * `charge.dispute.resolve`
   * `transfer.success`
   * `transfer.failed`
   * `transfer.reversed`

---

## 7. Authorised Feature Flag Enablement Procedure

When the staging verification checklist is 100% complete and explicit Owner Authorization is granted to begin the staging pilot:

1. **Enable Feature Flag:**
   ```sql
   UPDATE public.platform_settings
   SET value = jsonb_set(value, '{enabled}', 'true'::jsonb),
       updated_at = now()
   WHERE key = 'sales_referrals_enabled';
   ```

2. **Verify Audit Trail:**
   Verify the update in `platform_audit_logs`:
   ```sql
   SELECT * FROM public.platform_audit_logs 
   WHERE target_resource_type = 'platform_settings' 
   ORDER BY created_at DESC LIMIT 5;
   ```

---

## 8. Staging Acceptance Checklist

- [ ] 1. Both migrations applied cleanly without errors.
- [ ] 2. `sales_referrals_enabled` confirmed `enabled = false`.
- [ ] 3. Staging customer payment processes cleanly with zero commissions generated while flag is disabled.
- [ ] 4. Outbox worker rejects unauthorized requests without `x-cron-secret` (HTTP 403).
- [ ] 5. Outbox worker succeeds with valid `x-cron-secret` (HTTP 200).
- [ ] 6. Reconciliation scanner rejects unauthorized requests (HTTP 403) and succeeds with secret (HTTP 200).
- [ ] 7. Invoices with `paid_at` reject attempts to clear `paid_at` or modify totals (`restrict_violation`).
- [ ] 8. Direct `UPDATE` on `sales_commissions` is rejected with `insufficient_privilege`.
- [ ] 9. Platform Admin portal (`/platform/sales`) loads and displays representative metrics.
- [ ] 10. Representative portal (`/rep/dashboard`) loads for authenticated reps and displays pre-masked bank details (`••••••4567`).
- [ ] 11. Mock `refund.processed` webhook creates idempotent `sales_commission_adjustments` delta.
- [ ] 12. Mock `transfer.success` webhook settles payouts strictly scoped to that payout ID.
