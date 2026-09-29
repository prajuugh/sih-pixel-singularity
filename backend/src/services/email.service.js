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
      const rawUser = SMTP_USER.trim();
      const cleanUser = isGmail && !rawUser.includes("@") ? `${rawUser}@gmail.com` : rawUser;

      const transportConfig = isGmail
        ? {
            service: "gmail",
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
          }
        : {
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
              user: cleanUser,
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
    const rawUser = (SMTP_USER || "").trim();
    const cleanUser = rawUser.includes("@") ? rawUser : `${rawUser}@gmail.com`;
    let fromAddress = (SMTP_FROM || "").trim();
    if (!fromAddress.includes("@")) {
      const displayName = fromAddress.replace(/["']/g, "") || "Indian Railways RBPS";
      fromAddress = `"${displayName}" <${cleanUser}>`;
    }

    const info = await activeTransporter.sendMail({
      from: fromAddress,
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
// 3. New Possession Request Submitted (To Officer)
// ==========================================
async function sendNewRequestSubmittedEmail({ to, request, engineerName }) {
  const reqId = request.request_id || request.id || "REQ-UNKNOWN";
  const subject = `📋 New Possession Request Submitted – #${reqId}`;
  const trackId = request.track_id || (Array.isArray(request.track_ids) ? request.track_ids.join(", ") : "Mainline Section");
  const duration = request.estimated_duration_minutes || 120;
  const priorityScore = request.priority_score ?? request.agent_plan?.priorityScore ?? "Pending Evaluation";

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 22px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 19px; font-weight: 700;">📋 New Possession Request Awaiting Review</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automatic Railway Block Planning System (RBPS)</p>
      </div>

      <div style="padding: 26px 24px;">
        <p style="color: #374151; font-size: 14px; margin-top: 0; line-height: 1.5;">
          Departmental Field Engineer <strong>${engineerName || "Field Engineering Crew"}</strong> has submitted a new corridor block possession request for your review and sanction.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="color: #64748b; padding: 6px 0; width: 140px;">Request ID:</td>
              <td style="color: #0f172a; font-weight: 700; font-family: monospace;">${reqId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="color: #64748b; padding: 6px 0;">Work Type:</td>
              <td style="color: #0f172a; font-weight: 600;">${request.task_type || request.type || "Track Maintenance"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="color: #64748b; padding: 6px 0;">Department:</td>
              <td style="color: #0f172a;">${request.department || "Engineering"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="color: #64748b; padding: 6px 0;">Track Section(s):</td>
              <td style="color: #0f172a; font-family: monospace; font-size: 12px;">${trackId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="color: #64748b; padding: 6px 0;">Requested Window:</td>
              <td style="color: #1e3a8a; font-weight: 600;">
                ${request.requested_date || request.from_date || "Requested Date"} (${request.preferred_start_time || "19:00"} – ${request.preferred_end_time || "21:00"}) · ${duration} min
              </td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Priority Score:</td>
              <td style="color: #0f172a; font-weight: 600;">${priorityScore}/100</td>
            </tr>
          </table>
        </div>

        ${request.description ? `
        <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 10px 14px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #1e293b;">
          <strong>Work Description:</strong> ${request.description}
        </div>` : ""}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${APP_URL}/officer/requests" style="background-color: #1e3a8a; color: #ffffff; text-decoration: none; padding: 11px 24px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
            Review on Officer Decision Desk
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Ministry of Railways • Automated Corridor Possession & Block Planning • Confidential System Notice
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// ==========================================
// 4. Work Request Approved Email (To Engineer & Officer)
// ==========================================
async function sendWorkRequestApprovedEmail({ to, request, officerName, recipientRole = "ENGINEER", feedback }) {
  const reqId = request.request_id || request.id || "REQ-UNKNOWN";
  const isOfficer = String(recipientRole).toUpperCase() === "OFFICER";

  const subject = isOfficer
    ? `📋 Possession Sanction Released – #${reqId}`
    : `✅ Possession Request Approved – #${reqId}`;

  const heading = isOfficer
    ? "Possession Sanction Released"
    : "Your Possession Request Has Been Approved";

  const portalLink = isOfficer
    ? `${APP_URL}/officer/approved-requests`
    : `${APP_URL}/teams/check-status`;

  const buttonText = isOfficer
    ? "View Sanctioned Requests in Portal"
    : "View Approved Block in Portal";

  const scheduledStart = request.scheduled_start_time || request.preferred_start_time || "19:00";
  const scheduledEnd = request.scheduled_end_time || request.preferred_end_time || "21:00";
  const scheduledDate = request.scheduled_date || request.requested_date || request.from_date || "Scheduled Date";
  const trackId = request.track_id || (Array.isArray(request.track_ids) ? request.track_ids.join(", ") : "Mainline Section");

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #15803d; padding: 22px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 19px; font-weight: 700;">✅ ${heading}</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automatic Railway Block Planning System (RBPS)</p>
      </div>

      <div style="padding: 26px 24px;">
        <p style="color: #374151; font-size: 14px; margin-top: 0; line-height: 1.5;">
          ${isOfficer
            ? `You have sanctioned and released maintenance block possession for request <strong>#${reqId}</strong>.`
            : `Your corridor maintenance block request <strong>#${reqId}</strong> has been officially <strong>APPROVED</strong> by the controlling officer.`}
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0; width: 140px;">Request ID:</td>
              <td style="color: #111827; font-weight: 700; font-family: monospace;">${reqId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Work Title / Type:</td>
              <td style="color: #111827; font-weight: 600;">${request.task_type || request.type || "Corridor Track Maintenance"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Department:</td>
              <td style="color: #111827;">${request.department || "Engineering"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Track / Corridor:</td>
              <td style="color: #111827; font-family: monospace; font-size: 12px;">${trackId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Sanctioned Window:</td>
              <td style="color: #15803d; font-weight: 700;">
                ${scheduledDate} (${scheduledStart} – ${scheduledEnd})
              </td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Sanctioning Officer:</td>
              <td style="color: #111827; font-weight: 600;">${officerName || "Controlling Officer"}</td>
            </tr>
          </table>
        </div>

        ${feedback ? `
        <div style="background-color: #ecfdf5; border-left: 4px solid #15803d; padding: 10px 14px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #065f46;">
          <strong>Officer Remarks / Cautionary Orders:</strong> ${feedback}
        </div>` : ""}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${portalLink}" style="background-color: #15803d; color: #ffffff; text-decoration: none; padding: 11px 24px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
            ${buttonText}
          </a>
        </div>
      </div>

      <div style="background-color: #f9fafb; padding: 14px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        Ministry of Railways • Automated Corridor Possession & Block Planning • Confidential System Notice
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// ==========================================
// 5. Work Request Completed Email (To Officer)
// ==========================================
async function sendWorkRequestCompletedEmail({ to, request, engineerName, completionProof }) {
  const reqId = request.request_id || request.id || "REQ-UNKNOWN";
  const subject = `🛠️ Work Completed & Evidence Submitted – #${reqId}`;
  const trackId = request.track_id || (Array.isArray(request.track_ids) ? request.track_ids.join(", ") : "Mainline Section");

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0284c7; padding: 22px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 19px; font-weight: 700;">🛠️ Work Completed · Verification Pending</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automatic Railway Block Planning System (RBPS)</p>
      </div>

      <div style="padding: 26px 24px;">
        <p style="color: #374151; font-size: 14px; margin-top: 0; line-height: 1.5;">
          The departmental engineering crew has reported site completion of maintenance work for request <strong>#${reqId}</strong> and submitted photographic clearance proof for your line restoration certification.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0; width: 140px;">Request ID:</td>
              <td style="color: #111827; font-weight: 700; font-family: monospace;">${reqId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Work Type:</td>
              <td style="color: #111827; font-weight: 600;">${request.task_type || request.type || "Track Maintenance"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Track Section:</td>
              <td style="color: #111827; font-family: monospace; font-size: 12px;">${trackId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Completed By:</td>
              <td style="color: #111827; font-weight: 600;">${engineerName || "Field Crew"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="color: #6b7280; padding: 6px 0;">Completion Time:</td>
              <td style="color: #0284c7; font-weight: 600;">${new Date(completionProof?.completed_at || Date.now()).toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Safety Notes:</td>
              <td style="color: #111827;">${completionProof?.notes || "Work completed and section cleared for normal traffic operations."}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${APP_URL}/officer/requests" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 11px 24px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
            Inspect Photo Evidence & Certify Line Clear
          </a>
        </div>
      </div>

      <div style="background-color: #f9fafb; padding: 14px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        Ministry of Railways • Automated Corridor Possession & Block Planning • Confidential System Notice
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// ==========================================
// 6. Work Verified & Line Restored Email (To Engineer & Officer)
// ==========================================
async function sendWorkVerifiedEmail({ to, request, officerName, recipientRole = "ENGINEER", feedback }) {
  const reqId = request.request_id || request.id || "REQ-UNKNOWN";
  const isOfficer = String(recipientRole).toUpperCase() === "OFFICER";

  const subject = isOfficer
    ? `✅ Line Restoration Certified – #${reqId}`
    : `🛡️ Work Verified & Line Certified Safe – #${reqId}`;

  const heading = isOfficer
    ? "Line Restoration Certified"
    : "Track Certified Safe & Normal Speed Restored";

  const trackId = request.track_id || (Array.isArray(request.track_ids) ? request.track_ids.join(", ") : "Mainline Section");

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0d9488; padding: 22px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 19px; font-weight: 700;">🛡️ ${heading}</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automatic Railway Block Planning System (RBPS)</p>
      </div>

      <div style="padding: 26px 24px;">
        <p style="color: #374151; font-size: 14px; margin-top: 0; line-height: 1.5;">
          ${isOfficer
            ? `You have inspected photographic evidence and officially certified track restoration for request <strong>#${reqId}</strong>.`
            : `Controlling Officer <strong>${officerName || "Controlling Officer"}</strong> has verified your field work completion and officially certified track section <strong>${trackId}</strong> as safe for normal train traffic.`}
        </p>

        <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e6fffa;">
              <td style="color: #0f766e; padding: 6px 0; width: 140px;">Request ID:</td>
              <td style="color: #134e4a; font-weight: 700; font-family: monospace;">${reqId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e6fffa;">
              <td style="color: #0f766e; padding: 6px 0;">Work Type:</td>
              <td style="color: #134e4a; font-weight: 600;">${request.task_type || request.type || "Track Maintenance"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e6fffa;">
              <td style="color: #0f766e; padding: 6px 0;">Track Section:</td>
              <td style="color: #134e4a; font-family: monospace; font-size: 12px;">${trackId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e6fffa;">
              <td style="color: #0f766e; padding: 6px 0;">Certified Status:</td>
              <td style="color: #0d9488; font-weight: 700;">NORMAL SECTIONAL SPEED RESTORED</td>
            </tr>
            <tr style="border-bottom: 1px solid #e6fffa;">
              <td style="color: #0f766e; padding: 6px 0;">Certified At:</td>
              <td style="color: #134e4a;">${new Date().toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="color: #0f766e; padding: 6px 0;">Certifying Officer:</td>
              <td style="color: #134e4a; font-weight: 600;">${officerName || "Controlling Officer"}</td>
            </tr>
          </table>
        </div>

        ${feedback ? `
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 10px 14px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #166534;">
          <strong>Officer Verification Remarks:</strong> ${feedback}
        </div>` : ""}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${isOfficer ? `${APP_URL}/officer/approved-requests` : `${APP_URL}/teams/maintenance?tab=COMPLETED`}" style="background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 11px 24px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
            ${isOfficer ? "View Released Archive" : "View Completed Maintenance in Portal"}
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Ministry of Railways • Automated Corridor Possession & Block Planning • Permanent Safety Audit Record
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

module.exports = {
  sendEmail,
  sendAccountCreatedEmail,
  sendOtpEmail,
  sendNewRequestSubmittedEmail,
  sendWorkRequestApprovedEmail,
  sendWorkRequestCompletedEmail,
  sendWorkVerifiedEmail,
};
