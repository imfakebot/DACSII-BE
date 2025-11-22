# Mail Setup (SMTP)

This backend uses Nodemailer via `@nestjs-modules/mailer`.

## Required environment variables (.env)

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465            # 465 => secure true, 587 => secure false
MAIL_SECURE=true         # 'true' or 'false'
MAIL_USER=your_gmail@gmail.com
MAIL_PASS=your_app_password_or_smtp_password
MAIL_FROM=your_gmail@gmail.com
```

### Gmail configuration (recommended for quick start)

1. Enable 2-Step Verification for the Gmail account.
2. Create an App Password: Google Account > Security > App passwords.
3. Choose App: "Mail", Device: "Other" (e.g. NestJS) -> Generate.
4. Use the 16-character password as `MAIL_PASS`.

Do NOT use your normal Gmail password.

### Port / Secure matrix

- Port 465 -> `MAIL_SECURE=true` (implicit SSL/TLS).
- Port 587 -> `MAIL_SECURE=false` (STARTTLS upgrade).

### Fallback (Development Only)

If any of `MAIL_HOST`, `MAIL_USER`, or `MAIL_PASS` is missing the application auto-creates an **Ethereal** test account. Console output shows a Web URL where you can inspect sent emails. Do not use Ethereal in production.

### Common Errors

| Code         | Meaning                     | Fix                                      |
| ------------ | --------------------------- | ---------------------------------------- |
| 535          | Invalid credentials         | Use App Password / correct SMTP password |
| ECONNREFUSED | Wrong host/port or firewall | Check `MAIL_HOST`, open port             |
| ETIMEDOUT    | Network timeout             | Verify connectivity, maybe switch port   |

### Debugging Tips

- Temporarily add `console.log` inside `initiateRegistration` to print the verification code if email sending fails.
- Use `nodemailer` built-in test account (already integrated) for local development without real emails.

### Example Production (Gmail App Password, STARTTLS)

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=prod.account@gmail.com
MAIL_PASS=abcd efgh ijkl mnop  # (enter without spaces in .env)
MAIL_FROM=prod.account@gmail.com
```

### Security Recommendations

- Never commit `.env` to version control.
- Rotate app passwords if compromised.
- Consider a dedicated transactional email service (SendGrid, Mailgun, SES) for production scale.
