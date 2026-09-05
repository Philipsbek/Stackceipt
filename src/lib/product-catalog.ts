import type { SimpleIcon } from "simple-icons";
import {
  si1password, siAirtable, siAsana, siAtlassian, siClickup, siDatadog,
  siDiscord, siDropbox, siFigma, siGithub, siGitlab, siHubspot,
  siIntercom, siJira, siMailchimp, siMiro, siNotion, siOkta,
  siSentry, siShopify, siStripe, siTrello, siZendesk, siZoom,
  // AI tools
  siAnthropic, siClaude, siGithubcopilot, siGooglegemini, siPerplexity,
  siHuggingface, siMistralai, siElevenlabs, siReplicate, siOllama,
  siVercel, siLangchain,
} from "simple-icons";

export type ProductCatalogItem = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  website: string;
  /** Brand logo, when a matching simple-icon exists; otherwise initials are shown. */
  icon?: SimpleIcon;
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

  // ── AI ──────────────────────────────────────────────────────────
  { id: "chatgpt", name: "ChatGPT", vendor: "OpenAI", category: "AI", website: "https://openai.com/chatgpt" },
  { id: "chatgpt-team", name: "ChatGPT Team", vendor: "OpenAI", category: "AI", website: "https://openai.com/chatgpt/team" },
  { id: "chatgpt-enterprise", name: "ChatGPT Enterprise", vendor: "OpenAI", category: "AI", website: "https://openai.com/enterprise" },
  { id: "openai-api", name: "OpenAI API", vendor: "OpenAI", category: "AI", website: "https://platform.openai.com" },
  { id: "codex", name: "Codex", vendor: "OpenAI", category: "AI", website: "https://openai.com/codex" },
  { id: "claude", name: "Claude", vendor: "Anthropic", category: "AI", website: "https://claude.ai", icon: siClaude },
  { id: "claude-pro", name: "Claude Pro", vendor: "Anthropic", category: "AI", website: "https://claude.ai", icon: siClaude },
  { id: "claude-team", name: "Claude Team", vendor: "Anthropic", category: "AI", website: "https://claude.ai/team", icon: siClaude },
  { id: "claude-code", name: "Claude Code", vendor: "Anthropic", category: "AI", website: "https://claude.com/claude-code", icon: siClaude },
  { id: "anthropic-api", name: "Anthropic API", vendor: "Anthropic", category: "AI", website: "https://anthropic.com", icon: siAnthropic },
  { id: "github-copilot", name: "GitHub Copilot", vendor: "GitHub", category: "AI", website: "https://github.com/features/copilot", icon: siGithubcopilot },
  { id: "gemini", name: "Gemini", vendor: "Google", category: "AI", website: "https://gemini.google.com", icon: siGooglegemini },
  { id: "gemini-advanced", name: "Gemini Advanced", vendor: "Google", category: "AI", website: "https://gemini.google.com", icon: siGooglegemini },
  { id: "cursor", name: "Cursor", vendor: "Anysphere", category: "AI", website: "https://cursor.com" },
  { id: "perplexity", name: "Perplexity", vendor: "Perplexity", category: "AI", website: "https://perplexity.ai", icon: siPerplexity },
  { id: "perplexity-pro", name: "Perplexity Pro", vendor: "Perplexity", category: "AI", website: "https://perplexity.ai/pro", icon: siPerplexity },
  { id: "midjourney", name: "Midjourney", vendor: "Midjourney", category: "AI", website: "https://midjourney.com" },
  { id: "huggingface", name: "Hugging Face", vendor: "Hugging Face", category: "AI", website: "https://huggingface.co", icon: siHuggingface },
  { id: "mistral", name: "Mistral AI", vendor: "Mistral AI", category: "AI", website: "https://mistral.ai", icon: siMistralai },
  { id: "elevenlabs", name: "ElevenLabs", vendor: "ElevenLabs", category: "AI", website: "https://elevenlabs.io", icon: siElevenlabs },
  { id: "replicate", name: "Replicate", vendor: "Replicate", category: "AI", website: "https://replicate.com", icon: siReplicate },
  { id: "cohere", name: "Cohere", vendor: "Cohere", category: "AI", website: "https://cohere.com" },
  { id: "grok", name: "Grok", vendor: "xAI", category: "AI", website: "https://x.ai" },
  { id: "deepseek", name: "DeepSeek", vendor: "DeepSeek", category: "AI", website: "https://deepseek.com" },
  { id: "ollama", name: "Ollama", vendor: "Ollama", category: "AI", website: "https://ollama.com", icon: siOllama },
  { id: "jasper", name: "Jasper", vendor: "Jasper", category: "AI", website: "https://jasper.ai" },
  { id: "runway", name: "Runway", vendor: "Runway", category: "AI", website: "https://runwayml.com" },
  { id: "synthesia", name: "Synthesia", vendor: "Synthesia", category: "AI", website: "https://synthesia.io" },
  { id: "v0", name: "v0", vendor: "Vercel", category: "AI", website: "https://v0.dev", icon: siVercel },
  { id: "langsmith", name: "LangSmith", vendor: "LangChain", category: "AI", website: "https://smith.langchain.com", icon: siLangchain },
  { id: "notion-ai", name: "Notion AI", vendor: "Notion", category: "AI", website: "https://notion.so/product/ai", icon: siNotion },
].sort((a, b) => a.name.localeCompare(b.name));
