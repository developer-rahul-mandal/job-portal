import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const isResendConfigured = Boolean(apiKey && apiKey.startsWith("re_"));
const resend = isResendConfigured ? new Resend(apiKey) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export interface ApplicationSubmittedNotification {
  applicantEmail: string;
  applicantName: string;
  jobTitle: string;
  companyName: string;
}

export interface RecruiterNewApplicantNotification {
  recruiterEmail: string;
  applicantName: string;
  jobTitle: string;
  companyName: string;
}

export interface StatusChangedNotification {
  applicantEmail: string;
  applicantName: string;
  jobTitle: string;
  companyName: string;
  newStatus: string;
  reason?: string | null;
}

/**
 * Dispatches notification to applicant upon successful application submission.
 */
export async function notifyApplicationSubmitted(
  data: ApplicationSubmittedNotification
): Promise<void> {
  try {
    if (!resend) {
      console.log(
        `[NOTIFICATION SERVICE] Application submission recorded for ${data.applicantEmail} on "${data.jobTitle}" at ${data.companyName}. (Email skipped: RESEND_API_KEY not configured).`
      );
      return;
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.applicantEmail,
      subject: `Application Confirmation: ${data.jobTitle} at ${data.companyName}`,
      text: `Hello ${data.applicantName},\n\nYour application for the position of "${data.jobTitle}" at ${data.companyName} has been received successfully.\n\nYou can track the progress of your application anytime in your JobPortal candidate dashboard.\n\nBest regards,\nThe JobPortal Team`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: auto; padding: 20px; border: 1px solid #e4e4e7; rounded: 12px;">
          <h2 style="color: #18181b; margin-top: 0;">Application Received</h2>
          <p>Hello <strong>${data.applicantName}</strong>,</p>
          <p>Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been successfully submitted.</p>
          <p style="color: #52525b; font-size: 14px;">The employer's hiring team will review your qualifications and reach out if there is a match.</p>
          <div style="margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/applications" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">View Submitted Applications</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
          <p style="color: #a1a1aa; font-size: 12px; margin-bottom: 0;">JobPortal • Verified Career Opportunities</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn("[NOTIFICATION SERVICE] Failed to send application submitted email:", err);
  }
}

/**
 * Dispatches notification to the company recruiter when a new application is submitted.
 */
export async function notifyRecruiterNewApplication(
  data: RecruiterNewApplicantNotification
): Promise<void> {
  try {
    if (!resend) {
      console.log(
        `[NOTIFICATION SERVICE] New applicant "${data.applicantName}" for "${data.jobTitle}". Recruiter notification for ${data.recruiterEmail}. (Email skipped: RESEND_API_KEY not configured).`
      );
      return;
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recruiterEmail,
      subject: `New Applicant: ${data.applicantName} for ${data.jobTitle}`,
      text: `Hello,\n\nA new candidate, ${data.applicantName}, has applied for "${data.jobTitle}".\n\nLog in to your Recruiter Workspace to review their credentials, profile snapshot, and resume.\n\nBest regards,\nJobPortal`,
    });
  } catch (err) {
    console.warn("[NOTIFICATION SERVICE] Failed to send recruiter new applicant email:", err);
  }
}

/**
 * Dispatches notification to applicant when their application status is updated by the recruiter.
 */
export async function notifyApplicationStatusChanged(
  data: StatusChangedNotification
): Promise<void> {
  try {
    if (!resend) {
      console.log(
        `[NOTIFICATION SERVICE] Application status changed to "${data.newStatus}" for ${data.applicantEmail} on "${data.jobTitle}". (Email skipped: RESEND_API_KEY not configured).`
      );
      return;
    }

    const formattedStatus = data.newStatus.replace(/_/g, " ");

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.applicantEmail,
      subject: `Application Status Update: ${data.jobTitle} at ${data.companyName}`,
      text: `Hello ${data.applicantName},\n\nYour application status for "${data.jobTitle}" at ${data.companyName} has been updated to: ${formattedStatus}.${
        data.reason ? `\n\nNotes from hiring team: ${data.reason}` : ""
      }\n\nCheck your dashboard for details.\n\nBest regards,\nJobPortal`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: auto; padding: 20px; border: 1px solid #e4e4e7; rounded: 12px;">
          <h2 style="color: #18181b; margin-top: 0;">Application Status Updated</h2>
          <p>Hello <strong>${data.applicantName}</strong>,</p>
          <p>Your application status for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been updated to:</p>
          <div style="display: inline-block; padding: 6px 14px; background: #f4f4f5; border-radius: 6px; font-weight: bold; color: #09090b; font-size: 15px; margin: 8px 0 16px 0;">
            ${formattedStatus}
          </div>
          ${
            data.reason
              ? `<div style="background: #fafafa; padding: 12px; border-left: 3px solid #2563eb; margin: 12px 0; font-size: 13px; color: #3f3f46;"><strong>Note from employer:</strong> ${data.reason}</div>`
              : ""
          }
          <div style="margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/applications" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">View Application Status</a>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.warn("[NOTIFICATION SERVICE] Failed to send status changed email:", err);
  }
}
