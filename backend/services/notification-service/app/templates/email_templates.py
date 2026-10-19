import html


def render_otp_template(otp: str, purpose: str, expiry_minutes: int = 5) -> str:
    safe_otp = html.escape(str(otp))
    safe_purpose = html.escape(str(purpose))
    title = "Verify Your Email" if safe_purpose == "VERIFY_EMAIL" else "Reset Your Password"
    desc = (
        "Thank you for joining our Event Booking platform. Use the verification code below to activate your account."
        if safe_purpose == "VERIFY_EMAIL"
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


def _format_event_date(dt_str: str) -> str:
    if not dt_str or dt_str in ("TBD", "Scheduled Date", "None"):
        return dt_str or "Date to be announced"
    try:
        from datetime import datetime
        clean_str = str(dt_str).replace("Z", "+00:00")
        if "T" in clean_str:
            dt = datetime.fromisoformat(clean_str)
        else:
            dt = datetime.strptime(clean_str[:19], "%Y-%m-%d %H:%M:%S")
        return dt.strftime("%A, %B %d, %Y • %I:%M %p")
    except Exception:
        return str(dt_str)


def render_booking_confirmation_template(
    booking_ref: str,
    event_title: str,
    quantity: int,
    total_amount: str,
    currency: str = "INR",
    venue_name: str = "Main Stage",
    venue_address: str = "",
    start_at: str = "TBD",
    end_at: str = "",
    razorpay_payment_id: str = "N/A",
    razorpay_order_id: str = "N/A",
    customer_name: str = "Valued Guest",
    customer_email: str = ""
) -> str:
    safe_booking_ref = html.escape(str(booking_ref))
    safe_event_title = html.escape(str(event_title))
    safe_venue_name = html.escape(str(venue_name))
    safe_venue_address = html.escape(str(venue_address))
    safe_customer_name = html.escape(str(customer_name))
    safe_customer_email = html.escape(str(customer_email))
    safe_payment_id = html.escape(str(razorpay_payment_id))
    safe_order_id = html.escape(str(razorpay_order_id))
    safe_currency = html.escape(str(currency))
    safe_total = html.escape(str(total_amount))

    formatted_start = _format_event_date(start_at)
    formatted_end = f" until {_format_event_date(end_at)}" if end_at and end_at not in ("None", "") else ""
    full_date = html.escape(f"{formatted_start}{formatted_end}")
    curr_symbol = "₹" if currency == "INR" else f"{safe_currency} "

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Digital Event Pass — {booking_ref}</title>
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0b0f19;
          margin: 0;
          padding: 24px 12px;
          color: #1e293b;
        }}
        .email-container {{
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }}
        .brand-header {{
          background: linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #312e81 100%);
          padding: 32px 28px 24px 28px;
          color: #ffffff;
          text-align: center;
        }}
        .badge-verified {{
          display: inline-block;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid #10b981;
          color: #34d399;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 20px;
          margin-bottom: 12px;
        }}
        .brand-header h1 {{
          margin: 0 0 6px 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }}
        .brand-header p {{
          margin: 0;
          font-size: 14px;
          color: #cbd5e1;
        }}
        .pass-hero {{
          background: #f8fafc;
          padding: 24px 28px;
          border-bottom: 2px dashed #cbd5e1;
          position: relative;
        }}
        .event-title {{
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }}
        .pass-chip {{
          display: inline-block;
          background: #e0e7ff;
          color: #3730a3;
          font-family: monospace;
          font-size: 15px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid #c7d2fe;
          letter-spacing: 1px;
        }}
        .pass-body {{
          padding: 24px 28px;
        }}
        .info-table {{
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }}
        .info-table td {{
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
          vertical-align: top;
        }}
        .info-label {{
          color: #64748b;
          width: 32%;
          font-weight: 600;
        }}
        .info-value {{
          color: #0f172a;
          font-weight: 600;
        }}
        .price-box {{
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 16px;
          margin: 18px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }}
        .price-label {{
          font-size: 13px;
          color: #166534;
          font-weight: 600;
        }}
        .price-amount {{
          font-size: 22px;
          color: #15803d;
          font-weight: 800;
        }}
        .barcode-container {{
          text-align: center;
          padding: 18px 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin: 20px 0;
        }}
        .barcode-lines {{
          letter-spacing: 3px;
          font-size: 28px;
          color: #1e293b;
          font-family: 'Courier New', Courier, monospace;
          font-weight: 900;
          margin-bottom: 4px;
        }}
        .barcode-caption {{
          font-size: 12px;
          font-family: monospace;
          color: #64748b;
          letter-spacing: 2px;
        }}
        .guidelines {{
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
        }}
        .guidelines h4 {{
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }}
        .guidelines ul {{
          margin: 0;
          padding-left: 18px;
        }}
        .guidelines li {{
          margin-bottom: 4px;
        }}
        .footer {{
          background: #090d16;
          color: #94a3b8;
          text-align: center;
          padding: 20px;
          font-size: 12px;
          line-height: 1.6;
        }}
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="badge-verified">✓ Official Entry Pass & Receipt</div>
          <h1>Booking Confirmed!</h1>
          <p>Your tickets have been verified & registered on the EventPass platform.</p>
        </div>

        <!-- Ticket Pass Header -->
        <div class="pass-hero">
          <div class="event-title">{safe_event_title}</div>
          <div>
            <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-right: 8px;">Pass Reference:</span>
            <span class="pass-chip">{safe_booking_ref}</span>
          </div>
        </div>

        <!-- Ticket Body Details -->
        <div class="pass-body">
          <table class="info-table">
            <tr>
              <td class="info-label">📅 Date & Time</td>
              <td class="info-value">{full_date}</td>
            </tr>
            <tr>
              <td class="info-label">📍 Venue</td>
              <td class="info-value"><strong>{safe_venue_name}</strong></td>
            </tr>
            <tr>
              <td class="info-label">🗺️ Location Address</td>
              <td class="info-value">{safe_venue_address if safe_venue_address else 'Please check event details in app'}</td>
            </tr>
            <tr>
              <td class="info-label">🎟️ Pass Quantity</td>
              <td class="info-value"><strong>{quantity} Ticket(s)</strong> (General Admission / Entry Pass)</td>
            </tr>
            <tr>
              <td class="info-label">👤 Attendee</td>
              <td class="info-value">{safe_customer_name} {f'({safe_customer_email})' if safe_customer_email else ''}</td>
            </tr>
            <tr>
              <td class="info-label">⚡ Payment ID</td>
              <td class="info-value" style="font-family: monospace; color: #4338ca;">{safe_payment_id}</td>
            </tr>
            <tr>
              <td class="info-label">📋 Order ID</td>
              <td class="info-value" style="font-family: monospace; color: #64748b;">{safe_order_id}</td>
            </tr>
          </table>

          <!-- Amount Paid Box -->
          <table style="width: 100%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 14px 18px;">
                <div style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total Paid • Status: PAID</div>
                <div style="font-size: 12px; color: #15803d; margin-top: 2px;">Verified via Razorpay Payment Gateway</div>
              </td>
              <td style="padding: 14px 18px; text-align: right; font-size: 24px; font-weight: 800; color: #15803d;">
                {curr_symbol}{safe_total} <span style="font-size: 14px; font-weight: 600; color: #166534;">({safe_total} {safe_currency})</span>
              </td>
            </tr>
          </table>

          <!-- Barcode Pass -->
          <div class="barcode-container">
            <div class="barcode-lines">||||| | ||| |||| | ||||| || ||| |||||</div>
            <div class="barcode-caption">PASS #{safe_booking_ref} • SCAN AT VENUE CHECK-IN</div>
          </div>

          <!-- Important Guidelines -->
          <div class="guidelines">
            <h4>Entrance & Check-in Instructions</h4>
            <ul>
              <li><strong>Digital Presentation:</strong> Present this pass or reference <strong>{booking_ref}</strong> at the venue entrance.</li>
              <li><strong>Arrival Time:</strong> Gates open 30 to 45 minutes prior to the scheduled start time.</li>
              <li><strong>Photo ID:</strong> Please carry a matching photo ID (driving license, passport, or national ID).</li>
              <li><strong>Support:</strong> You can view all your active tickets anytime on your account dashboard.</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <strong>EventPass Booking System</strong> &copy; 2026. All rights reserved.<br>
          Automated notification dispatched via Mailpit SMTP. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    """


def render_booking_cancellation_template(
    booking_ref: str,
    event_title: str,
    quantity: int,
    reason: str = "Customer requested cancellation"
) -> str:
    safe_booking_ref = html.escape(str(booking_ref))
    safe_event_title = html.escape(str(event_title))
    safe_reason = html.escape(str(reason))

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
          <p>Your booking with reference <strong>{safe_booking_ref}</strong> has been cancelled.</p>
          <div class="box">
            <p><strong>Event:</strong> {safe_event_title}</p>
            <p><strong>Tickets Released:</strong> {quantity}</p>
            <p><strong>Reason:</strong> {safe_reason}</p>
          </div>
          <p>The reserved capacity has been released back to the event inventory.</p>
        </div>
        <div class="footer">Event Booking System &copy; 2026. Automated Notification.</div>
      </div>
    </body></html>
    """
