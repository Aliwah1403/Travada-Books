import React from "react"
import { Text } from "@react-email/components"
import { EmailLayout, OutlinedButton, Hr, colors } from "./layout"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface OrgResult {
  orgName: string
  downloadUrls: string[]
}

// ── Sent once deletion (and its export) has actually completed ──────────────

interface OrgDeletedExportEmailProps {
  orgs: OrgResult[]
  expiresInDays: number
}

export function OrgDeletedExportEmail({ orgs, expiresInDays }: OrgDeletedExportEmailProps) {
  const single = orgs.length === 1
  const heading =
    single ?
      `${orgs[0].orgName} has been deleted — here's your data`
    : "Your organisations have been deleted — here's your data"

  return (
    <EmailLayout
      preview={
        single ?
          `${orgs[0].orgName} has been deleted. Download your data before the link expires.`
        : "Your organisations have been deleted. Download your data before the links expire."
      }
      orgName='Travada Books'
      orgLogoUrl={null}
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        {heading}
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {orgs.length > 1 ? "Your full data exports are ready to download." : "Your full data export is ready to download."}
      </Text>

      {orgs.map((org) => (
        <React.Fragment key={org.orgName}>
          {orgs.length > 1 && (
            <Text style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: colors.dark, textAlign: "center", fontFamily: font }}>
              {org.orgName}
            </Text>
          )}
          {org.downloadUrls.length > 0 ?
            org.downloadUrls.map((url, i) => (
              <OutlinedButton key={url} href={url}>
                {org.downloadUrls.length > 1 ?
                  `Download Part ${i + 1} of ${org.downloadUrls.length}`
                : `Download ${org.orgName} data`}
              </OutlinedButton>
            ))
          : <Text style={{ margin: "0 0 24px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
              No export is available for this organisation.
            </Text>
          }
        </React.Fragment>
      ))}

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        {single ?
          `${orgs[0].orgName} and all its data have been permanently deleted. Before deleting, we bundled every customer, invoice, quote, statement, transaction, and file into a ZIP for you.`
        : "These organisations and all their data have been permanently deleted. Before deleting each one, we bundled every customer, invoice, quote, statement, transaction, and file into a ZIP for you."
        }{" "}
        Invoice, quote, and statement PDFs are not included — they can be regenerated from the exported data.
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        {orgs.length > 1 ? "These download links expire" : "This download link expires"} in {expiresInDays} day
        {expiresInDays === 1 ? "" : "s"}.
      </Text>
    </EmailLayout>
  )
}

// ── Sent from onFailure if deletion couldn't be completed after retries ─────

interface DeletionCancelledEmailProps {
  /** Orgs whose deletion was rolled back — nothing was removed. */
  cancelledOrgNames: string[]
  /**
   * Orgs that had already been fully deleted (with a completed export)
   * before a later org's deletion failed — only possible when deleting an
   * account with several sole-member orgs.
   */
  deletedOrgs: OrgResult[]
  /** True if the auth user was already deleted despite the overall failure. */
  accountDeleted: boolean
}

export function DeletionCancelledEmail({ cancelledOrgNames, deletedOrgs, accountDeleted }: DeletionCancelledEmailProps) {
  const hasCancelled = cancelledOrgNames.length > 0
  const hasDeleted = deletedOrgs.length > 0

  return (
    <EmailLayout preview="We ran into a problem deleting your organisation." orgName='Travada Books' orgLogoUrl={null}>
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        We couldn't finish your deletion
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        Something went wrong while processing your request. Here's exactly where things stand.
      </Text>

      {hasCancelled && (
        <Text style={{ margin: "0 0 24px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
          {cancelledOrgNames.length === 1 ?
            <>
              <strong>{cancelledOrgNames[0]}</strong> was <strong>not</strong> deleted. Nothing was removed — it's
              exactly as it was.
            </>
          : <>
              The following organisations were <strong>not</strong> deleted — nothing was removed, they're exactly
              as they were: <strong>{cancelledOrgNames.join(", ")}</strong>.
            </>
          }
        </Text>
      )}

      {hasDeleted && (
        <>
          <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
            {deletedOrgs.length === 1 ?
              `${deletedOrgs[0].orgName} had already been deleted before the problem occurred. Here's its data:`
            : "The following organisations had already been deleted before the problem occurred. Here's their data:"
            }
          </Text>
          {deletedOrgs.map((org) => (
            <React.Fragment key={org.orgName}>
              {deletedOrgs.length > 1 && (
                <Text style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: colors.dark, textAlign: "center", fontFamily: font }}>
                  {org.orgName}
                </Text>
              )}
              {org.downloadUrls.length > 0 ?
                org.downloadUrls.map((url, i) => (
                  <OutlinedButton key={url} href={url}>
                    {org.downloadUrls.length > 1 ?
                      `Download Part ${i + 1} of ${org.downloadUrls.length}`
                    : `Download ${org.orgName} data`}
                  </OutlinedButton>
                ))
              : <Text style={{ margin: "0 0 24px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
                  No export is available for this organisation.
                </Text>
              }
            </React.Fragment>
          ))}
        </>
      )}

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        {accountDeleted ?
          "Your account has already been deleted, but we hit a problem finishing up. Please contact support if you have questions about the organisations listed above."
        : "Your account has not been deleted. You can sign in and try again, or contact support if this keeps happening."
        }
      </Text>
    </EmailLayout>
  )
}
