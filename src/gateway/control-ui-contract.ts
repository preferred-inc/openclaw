export const CONTROL_UI_BOOTSTRAP_CONFIG_PATH = "/__openclaw/control-ui-config.json";

export type ControlUiBootstrapConfig = {
  basePath: string;
  assistantName: string;
  assistantAvatar: string;
  assistantAgentId: string;
  serverVersion?: string;
  /** Custom brand logo URL. When set, replaces the default favicon in the sidebar. */
  brandLogoUrl?: string;
  /** Custom brand title. When set, replaces the default brand name in the sidebar. */
  brandTitle?: string;
};
