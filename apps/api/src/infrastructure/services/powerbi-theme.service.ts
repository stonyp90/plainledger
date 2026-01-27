import { Injectable } from "@nestjs/common";

export interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  foreground?: string;
  error?: string;
  warning?: string;
  success?: string;
}

// Power BI theme format is complex and allows nested arrays of color objects
// Using a more flexible type to accommodate the actual structure
export interface PowerBITheme {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visualStyles: Record<string, Record<string, Record<string, any>>>;
}

@Injectable()
export class PowerBIThemeService {
  /**
   * Generate Power BI theme JSON from tenant branding colors
   */
  generateTheme(tenantName: string, colors: ThemeColors): PowerBITheme {
    const defaultColors = {
      primary: "#1a1a2e",
      secondary: "#16213e",
      accent: "#0f3460",
      background: "#ffffff",
      foreground: "#333333",
      error: "#e94560",
      warning: "#ffc93c",
      success: "#00d9a5",
      ...colors,
    };

    return {
      name: `${tenantName} Theme`,
      visualStyles: {
        "*": {
          "*": {
            "*": [
              {
                color: {
                  solid: {
                    color: defaultColors.primary,
                  },
                },
              },
            ],
            background: [
              {
                color: {
                  solid: {
                    color: defaultColors.background,
                  },
                },
              },
            ],
            foreground: [
              {
                color: {
                  solid: {
                    color: defaultColors.foreground,
                  },
                },
              },
            ],
          },
        },
        page: {
          "*": {
            background: [
              {
                color: {
                  solid: {
                    color: defaultColors.background,
                  },
                },
              },
            ],
          },
        },
        title: {
          "*": {
            "*": [
              {
                color: {
                  solid: {
                    color: defaultColors.foreground,
                  },
                },
              },
            ],
          },
        },
        card: {
          "*": {
            "*": [
              {
                color: {
                  solid: {
                    color: defaultColors.foreground,
                  },
                },
              },
            ],
            background: [
              {
                color: {
                  solid: {
                    color: defaultColors.background,
                  },
                },
              },
            ],
          },
        },
        dataColors: {
          "*": {
            "*": [
              {
                color: {
                  solid: {
                    color: defaultColors.primary,
                  },
                },
              },
              {
                color: {
                  solid: {
                    color: defaultColors.secondary,
                  },
                },
              },
              {
                color: {
                  solid: {
                    color: defaultColors.accent,
                  },
                },
              },
            ],
          },
        },
      },
    };
  }

  /**
   * Generate minimal theme for white-labeling (hides Power BI chrome)
   */
  generateMinimalTheme(tenantName: string, colors: ThemeColors): PowerBITheme {
    const theme = this.generateTheme(tenantName, colors);

    // Add settings to hide Power BI navigation and filter pane
    theme.visualStyles["*"]["*"]["*"].push({
      showFilterPane: false,
      showNavigationPane: false,
    });

    return theme;
  }
}
