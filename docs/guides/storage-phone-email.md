# Storage, Phone & Email

Three Phase 6 adapters, each following the `interface + provider adapter +
selector` pattern (§1.2). Storage and phone are flag-gated; email is a shared
utility used by auth + invites.

## Storage (S3 / S3-compatible)

Presigned-URL uploads — file bytes go **client → S3 directly**, never through the
app server.

```env
NEXT_PUBLIC_FEATURE_STORAGE=1
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=my-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Optional — S3-compatible endpoint (Cloudflare R2, MinIO):
# AWS_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
```

1. Create a bucket and an IAM user/key with `PutObject`, `GetObject`,
   `DeleteObject` on it.
2. Configure **CORS** on the bucket to allow `PUT`/`GET` from your app origin so
   the browser upload succeeds:
   ```json
   [
     {
       "AllowedMethods": ["PUT", "GET"],
       "AllowedOrigins": ["http://localhost:3000"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```
3. Use the `<FileUpload onUploaded={({ key }) => ...} />` shared component, or call
   `POST /api/storage/upload-url` yourself. Keys are scoped under
   `uploads/<orgId>/…`. Interface: `lib/storage/adapter.ts`
   (`getUploadUrl`, `getDownloadUrl`, `deleteObject`).

## Phone verification (Twilio Verify)

```env
NEXT_PUBLIC_FEATURE_PHONE_VERIFICATION=1
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
```

1. In the Twilio console create a **Verify Service** and copy its SID (`VA…`).
2. Twilio owns code generation, SMS delivery, and expiry — the adapter only
   starts a verification and checks a code (`lib/phone/adapter.ts`, REST over
   `fetch`, no SDK).
3. Use the `<PhoneVerify onVerified={(phone) => ...} />` shared component
   (usable at signup, in settings, or in a modal), or call `POST /api/phone/start`
   then `POST /api/phone/check`.

## Email

`sendEmail({ to, subject, html, text? })` in `lib/email/send.ts` is the single
sender across the app — magic link, password reset, and org invites all call it.
It uses the Resend HTTP API when `RESEND_API_KEY` is set, otherwise **logs the
message to the server console** (so links work in local dev with no provider).
Set `AUTH_EMAIL_FROM` to override the from-address. A fork that prefers SES /
Postmark swaps the body of that one function — callers don't change.

## Local testing

- **Storage:** requires a real bucket + CORS; there's no offline stub. Point
  `AWS_S3_ENDPOINT` at a local MinIO if you want to test without AWS.
- **Phone:** use a Twilio trial + a verified test number, or the Verify sandbox.
- **Email:** leave `RESEND_API_KEY` unset — links print to the server console.
