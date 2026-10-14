def render_otp_template(otp: str, purpose: str, expiry_minutes: int = 5) -> str:
    title = "Verify Your Email" if purpose == "VERIFY_EMAIL" else "Reset Your Password"
    desc = (
        "Thank you for joining our Event Booking platform. Use the verification code below to activate your account."
        if purpose == "VERIFY_EMAIL"
        else "We received a request to reset your password. Use the code below to complete the reset."
    )
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8">
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f8; margin: 0; padding: 20px; }}
      .card {{ max-width: 520px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
      .header {{ background: #1976d2; color: #fff; padding: 24px; text-align: center; }}
      .content {{ padding: 28px; color: #333; line-height: 1.6; }}
      .otp {{ font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0d47a1; background: #e3f2fd; padding: 14px; text-align: center; border-radius: 6px; margin: 20px 0; }}
      .footer {{ background: #fafafa; border-top: 1px solid #eee; padding: 14px; text-align: center; font-size: 12px; color: #888; }}
    </style></head>
    <body>
      <div class="card">
        <div class="header"><h2>{title}</h2></div>
        <div class="content">
          <p>Hello,</p>
          <p>{desc}</p>
          <div class="otp">{otp}</div>
          <p>This code is valid for <strong>{expiry_minutes} minutes</strong>. Please do not share it with anyone.</p>
        </div>
        <div class="footer">Event Booking System &copy; 2026. Automated Notification.</div>
      </div>
    </body></html>
    """


def render_booking_confirmation_template(
    booking_ref: str,
    event_title: str,
    quantity: int,
    total_amount: str,
    currency: str = "INR",
    venue_name: str = "Main Stage",
    start_at: str = "TBD"
) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8">
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f8; margin: 0; padding: 20px; }}
      .card {{ max-width: 540px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
      .header {{ background: #2e7d32; color: #fff; padding: 24px; text-align: center; }}
      .content {{ padding: 28px; color: #333; line-height: 1.6; }}
      .receipt {{ background: #f9fbf9; border: 1px solid #c8e6c9; border-radius: 6px; padding: 16px; margin: 20px 0; }}
      .row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e0e0e0; }}
      .row:last-child {{ border-bottom: none; font-weight: 700; color: #1b5e20; }}
      .ref-badge {{ font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #2e7d32; text-align: center; margin: 12px 0; }}
      .footer {{ background: #fafafa; border-top: 1px solid #eee; padding: 14px; text-align: center; font-size: 12px; color: #888; }}
    </style></head>
    <body>
      <div class="card">
        <div class="header">
          <h2>Booking Confirmed!</h2>
        </div>
        <div class="content">
          <p>Your tickets have been successfully reserved and confirmed.</p>
          <div class="ref-badge">{booking_ref}</div>
          <div class="receipt">
            <div class="row"><span>Event:</span> <strong>{event_title}</strong></div>
            <div class="row"><span>Venue:</span> <strong>{venue_name}</strong></div>
            <div class="row"><span>Date & Time:</span> <strong>{start_at}</strong></div>
            <div class="row"><span>Tickets:</span> <strong>{quantity}</strong></div>
            <div class="row"><span>Total Billed:</span> <strong>{total_amount} {currency}</strong></div>
          </div>
          <p>Present your booking reference <strong>{booking_ref}</strong> at the venue entrance. Enjoy your event!</p>
        </div>
        <div class="footer">Event Booking System &copy; 2026. Automated Notification.</div>
      </div>
    </body></html>
    """


def render_booking_cancellation_template(
    booking_ref: str,
    event_title: str,
    quantity: int,
    reason: str = "Customer requested cancellation"
) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8">
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f8; margin: 0; padding: 20px; }}
      .card {{ max-width: 540px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
      .header {{ background: #c62828; color: #fff; padding: 24px; text-align: center; }}
      .content {{ padding: 28px; color: #333; line-height: 1.6; }}
      .box {{ background: #ffebee; border: 1px solid #ffcdd2; border-radius: 6px; padding: 16px; margin: 20px 0; }}
      .footer {{ background: #fafafa; border-top: 1px solid #eee; padding: 14px; text-align: center; font-size: 12px; color: #888; }}
    </style></head>
    <body>
      <div class="card">
        <div class="header">
          <h2>Booking Cancelled</h2>
        </div>
        <div class="content">
          <p>Your booking with reference <strong>{booking_ref}</strong> has been cancelled.</p>
          <div class="box">
            <p><strong>Event:</strong> {event_title}</p>
            <p><strong>Tickets Released:</strong> {quantity}</p>
            <p><strong>Reason:</strong> {reason}</p>
          </div>
          <p>The reserved capacity has been released back to the event inventory.</p>
        </div>
        <div class="footer">Event Booking System &copy; 2026. Automated Notification.</div>
      </div>
    </body></html>
    """
