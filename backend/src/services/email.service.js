// backend/src/services/email.service.js
const nodemailer = require("nodemailer");
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_FROM,
  SMTP_SECURE,
  APP_URL,
} = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
    try {
      const isGmail = SMTP_HOST.toLowerCase().includes("gmail");
      const cleanPass = SMTP_PASSWORD.trim().replace(/\s+/g, "");

      const transportConfig = isGmail
        ? {
            service: "gmail",
            auth: {
              user: SMTP_USER.trim(),
              pass: cleanPass,
            },
          }
        : {
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
              user: SMTP_USER.trim(),
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          };

      transporter = nodemailer.createTransport(transportConfig);
      console.log(`📧 SMTP Transporter initialized (${isGmail ? "Gmail Service" : `${SMTP_HOST}:${SMTP_PORT}`})`);
    } catch (err) {
      console.warn("Failed to initialize SMTP transporter:", err.message);
      transporter = null;
    }
  }
  return transporter;
}

/**
 * Core generic send email function
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    console.warn("[EmailService] No recipient specified, skipping email.");
    return { success: false, reason: "NO_RECIPIENT" };
  }

  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log(
      `[EmailService:Simulated] SMTP not configured. Email to "${to}" with subject "${subject}" was generated.`
    );
    return { success: true, simulated: true };
  }

  try {
    const info = await activeTransporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: text || "Please view this email in an HTML-compatible email client.",
      html,
    });
    console.log(`[EmailService] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    // Log gracefully without exposing sensitive credentials
    console.warn(`[EmailService] Failed to send email to ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 1. Account Creation Welcome Email
// ==========================================
async function sendAccountCreatedEmail({ to, name, username, initialPassword, loginUrl }) {
  const loginLink = loginUrl || `${APP_URL}/login`;
  const subject = `Welcome to RBPS – Your Account Credentials`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #b83825; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Indian Railways</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Automatic Railway Block Planning System (RBPS)</p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="color: #111827; font-size: 18px; margin-top: 0;">Welcome, ${name || username}!</h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
          An administrator has created your access account for the Railway Block Planning System portal. Below are your initial login credentials:
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #6b7280; width: 140px; padding: 4px 0;">Username:</td>
              <td style="color: #111827; font-weight: 600; font-family: monospace; font-size: 15px;">${username}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Temporary Password:</td>
              <td style="color: #b83825; font-weight: 600; font-family: monospace; font-size: 15px;">${initialPassword}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #b83825; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-size: 13px; font-weight: 500;">
            ⚠️ Security Notice: You will be required to change your password immediately upon your first login.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginLink}" style="background-color: #b83825; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 6px; display: inline-block;">
            Log In to RBPS Portal
          </a>
        </div>

        <p style="color: #6b7280; font-size: 12px; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
          If the button above does not work, copy and paste this URL into your browser:<br/>
          <a href="${loginLink}" style="color: #b83825;">${loginLink}</a>
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        Ministry of Railways • Automated Corridor Possession & Block Planning • Confidential System Notice
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// ==========================================
// 2. Password Reset OTP Email
// ==========================================
async function sendOtpEmail({ to, username, otp, expiresInMinutes = 10 }) {
  const subject = `Your Password Reset OTP – RBPS Portal`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #b83825; padding: 20px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Password Reset Request</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automatic Railway Block Planning System</p>
      </div>

      <div style="padding: 28px 24px; text-align: center;">
        <p style="color: #4b5563; font-size: 14px; text-align: left; margin-top: 0;">
          Hello <strong>${username}</strong>,
        </p>
        <p style="color: #4b5563; font-size: 14px; text-align: left; line-height: 1.5;">
          We received a request to reset your password. Use the verification code below to complete your reset:
        </p>

        <div style="margin: 28px 0;">
          <span style="display: inline-block; background-color: #f3f4f6; border: 2px dashed #b83825; color: #111827; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 12px 24px; border-radius: 8px;">
            ${otp}
          </span>
        </div>

        <p style="color: #6b7280; font-size: 13px;">
          ⏱️ This OTP is valid for <strong>${expiresInMinutes} minutes</strong> and can only be used once.
        </p>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: left;">
          If you did not request this password reset, please ignore this email or notify your system administrator immediately.
        </p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// ==========================================
// 3. Work Request Approved Email (To Engineer & Officer)
// ==========================================
async function sendWorkRequestApprovedEmail({ to, request, officerName, feedback }) {
  const reqId = request.request_id || request.id || "REQ-UNKNOWN";
  const subject = `Work Request Approved – #${reqId}`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #15803d; padding: 20px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700;">✅ Work Request Approved</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automatic Railway Block Planning System</p>
      </div>

      <div style="padding: 24px 24px;">
        <p style="color: #374151; font-size: 14px; margin-top: 0;">
          The maintenance block request <strong>#${reqId}</strong> has been officially <strong>APPROVED</strong> by the controlling officer.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0; width: 140px;">Request ID:</td>
              <td style="color: #111827; font-weight: 600;">${reqId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Work Title / Type:</td>
              <td style="color: #111827; font-weight: 500;">${request.task_type || request.type || "Corridor Track Maintenance"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Department:</td>
              <td style="color: #111827;">${request.department || "Engineering"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Track / Corridor:</td>
              <td style="color: #111827;">${request.track_id || "Mainline Section"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Scheduled Window:</td>
              <td style="color: #15803d; font-weight: 600;">
                ${request.requested_date || request.from_date || "Scheduled Date"} (${request.preferred_start_time || "19:00"} – ${request.preferred_end_time || "21:00"})
              </td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Approved By:</td>
              <td style="color: #111827;">${officerName || "Controlling Officer"}</td>
            </tr>
          </table>
        </div>

        ${feedback ? `
        <div style="background-color: #ecfdf5; border-left: 4px solid #15803d; padding: 10px 14px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #065f46;">
          <strong>Officer Remarks:</strong> ${feedback}
        </div>` : ""}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${APP_URL}/teams/check-status" style="background-color: #15803d; color: #ffffff; text-decoration: none; padding: 10px 22px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
            View Request Details in Portal
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// ==========================================
// 4. Work Request Completed Email (To Officer)
// ==========================================
async function sendWorkRequestCompletedEmail({ to, request, engineerName, completionProof }) {
  const reqId = request.request_id || request.id || "REQ-UNKNOWN";
  const subject = `Work Request Completed – #${reqId}`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0284c7; padding: 20px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700;">🛠️ Work Request Completed</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automatic Railway Block Planning System</p>
      </div>

      <div style="padding: 24px 24px;">
        <p style="color: #374151; font-size: 14px; margin-top: 0;">
          The departmental engineering team has reported completion of maintenance work for request <strong>#${reqId}</strong>.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0; width: 140px;">Request ID:</td>
              <td style="color: #111827; font-weight: 600;">${reqId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Work Type:</td>
              <td style="color: #111827;">${request.task_type || request.type || "Track Maintenance"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Completed By:</td>
              <td style="color: #111827;">${engineerName || "Field Engineer / Team"}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Completion Remarks:</td>
              <td style="color: #111827;">${completionProof?.notes || "Work completed and track possession normalized."}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${APP_URL}/officer/approved" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 22px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
            Review and Verify Completion
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

module.exports = {
  sendEmail,
  sendAccountCreatedEmail,
  sendOtpEmail,
  sendWorkRequestApprovedEmail,
  sendWorkRequestCompletedEmail,
};
