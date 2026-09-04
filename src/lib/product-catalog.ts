import type { SimpleIcon } from "simple-icons";
import {
  si1password, siAirtable, siAsana, siAtlassian, siClickup, siDatadog,
  siDiscord, siDropbox, siFigma, siGithub, siGitlab, siHubspot,
  siIntercom, siJira, siMailchimp, siMiro, siNotion, siOkta,
  siSentry, siShopify, siStripe, siTrello, siZendesk, siZoom,
} from "simple-icons";

export type ProductCatalogItem = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  website: string;
  icon: SimpleIcon;
};

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  { id: "1password", name: "1Password", vendor: "1Password", category: "Security", website: "https://1password.com", icon: si1password },
  { id: "airtable", name: "Airtable", vendor: "Airtable", category: "Productivity", website: "https://airtable.com", icon: siAirtable },
  { id: "asana", name: "Asana", vendor: "Asana", category: "Project management", website: "https://asana.com", icon: siAsana },
  { id: "atlassian", name: "Atlassian", vendor: "Atlassian", category: "Productivity", website: "https://atlassian.com", icon: siAtlassian },
  { id: "clickup", name: "ClickUp", vendor: "ClickUp", category: "Project management", website: "https://clickup.com", icon: siClickup },
  { id: "datadog", name: "Datadog", vendor: "Datadog", category: "Monitoring", website: "https://datadoghq.com", icon: siDatadog },
  { id: "discord", name: "Discord", vendor: "Discord", category: "Communication", website: "https://discord.com", icon: siDiscord },
  { id: "dropbox", name: "Dropbox", vendor: "Dropbox", category: "Storage", website: "https://dropbox.com", icon: siDropbox },
  { id: "figma", name: "Figma", vendor: "Figma", category: "Design", website: "https://figma.com", icon: siFigma },
  { id: "github", name: "GitHub", vendor: "GitHub", category: "Development", website: "https://github.com", icon: siGithub },
  { id: "gitlab", name: "GitLab", vendor: "GitLab", category: "Development", website: "https://gitlab.com", icon: siGitlab },
  { id: "hubspot", name: "HubSpot", vendor: "HubSpot", category: "Sales & marketing", website: "https://hubspot.com", icon: siHubspot },
  { id: "intercom", name: "Intercom", vendor: "Intercom", category: "Customer support", website: "https://intercom.com", icon: siIntercom },
  { id: "jira", name: "Jira", vendor: "Atlassian", category: "Project management", website: "https://atlassian.com/software/jira", icon: siJira },
  { id: "mailchimp", name: "Mailchimp", vendor: "Intuit", category: "Marketing", website: "https://mailchimp.com", icon: siMailchimp },
  { id: "miro", name: "Miro", vendor: "Miro", category: "Collaboration", website: "https://miro.com", icon: siMiro },
  { id: "notion", name: "Notion", vendor: "Notion", category: "Productivity", website: "https://notion.so", icon: siNotion },
  { id: "okta", name: "Okta", vendor: "Okta", category: "Security", website: "https://okta.com", icon: siOkta },
  { id: "sentry", name: "Sentry", vendor: "Sentry", category: "Monitoring", website: "https://sentry.io", icon: siSentry },
  { id: "shopify", name: "Shopify", vendor: "Shopify", category: "Commerce", website: "https://shopify.com", icon: siShopify },
  { id: "stripe", name: "Stripe", vendor: "Stripe", category: "Finance", website: "https://stripe.com", icon: siStripe },
  { id: "trello", name: "Trello", vendor: "Atlassian", category: "Project management", website: "https://trello.com", icon: siTrello },
  { id: "zendesk", name: "Zendesk", vendor: "Zendesk", category: "Customer support", website: "https://zendesk.com", icon: siZendesk },
  { id: "zoom", name: "Zoom", vendor: "Zoom", category: "Communication", website: "https://zoom.us", icon: siZoom },
].sort((a, b) => a.name.localeCompare(b.name));
