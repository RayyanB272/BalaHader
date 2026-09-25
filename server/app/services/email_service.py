import smtplib
from email.message import EmailMessage

from app.config import settings


def send_password_reset_email(
    recipient_email: str,
    reset_url: str
):
    if not all([
        settings.SMTP_HOST,
        settings.SMTP_USERNAME,
        settings.SMTP_PASSWORD,
        settings.EMAIL_FROM
    ]):
        raise RuntimeError(
            "SMTP email settings are incomplete"
        )

    message = EmailMessage()

    message["Subject"] = "Reset your BalaHader password"
    message["From"] = settings.EMAIL_FROM
    message["To"] = recipient_email

    message.set_content(
        "We received a request to reset your BalaHader "
        "password.\n\n"
        f"Open this link to create a new password:\n"
        f"{reset_url}\n\n"
        "This link expires in 30 minutes and can be used "
        "only once.\n\n"
        "If you did not request this reset, you can ignore "
        "this email."
    )

    message.add_alternative(
        f"""
        <!doctype html>
        <html>
          <body style="font-family: Arial, sans-serif; color: #10213D;">
            <div style="max-width: 560px; margin: 0 auto; padding: 32px;">
              <h1 style="color: #163D2B;">Reset your password</h1>

              <p>
                We received a request to reset your BalaHader password.
              </p>

              <p style="margin: 28px 0;">
                <a
                  href="{reset_url}"
                  style="
                    display: inline-block;
                    background: #27833F;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 10px;
                    text-decoration: none;
                    font-weight: bold;
                  "
                >
                  Reset password
                </a>
              </p>

              <p>
                This link expires in 30 minutes and can be used only once.
              </p>

              <p style="color: #6B7A6E;">
                If you did not request this reset, you can ignore this email.
              </p>
            </div>
          </body>
        </html>
        """,
        subtype="html"
    )

    with smtplib.SMTP(
        settings.SMTP_HOST,
        settings.SMTP_PORT,
        timeout=20
    ) as smtp:
        smtp.starttls()
        smtp.login(
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD
        )
        smtp.send_message(message)