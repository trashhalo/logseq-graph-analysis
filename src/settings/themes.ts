interface Theme {
  // Background color and text color inherited from Logseq
  mode: "dark" | "light";
  nodeColor: string;
  edgeColor: string;
  nodeLabelColor: string;
  nodeLabelBackground: string;
  nodeLabelShadowColor: string;
}

const lightTheme: Theme = {
  mode: "light",
  nodeColor: "#5c5c5c",
  edgeColor: "#e5e5e5",
  nodeLabelColor: "#000000",
  nodeLabelBackground: "#ffffff",
  nodeLabelShadowColor: "rgb(0, 0, 0)",
};

const darkTheme: Theme = {
  mode: "dark",
  nodeColor: "#aaaaaa",
  edgeColor: "#444444",
  nodeLabelColor: "#ffffff",
  nodeLabelBackground: "rgb(0, 0, 0, 0.7)",
  nodeLabelShadowColor: "#ffffff",
};

export const setThemeColors = () => {
  const root = parent.document.querySelector(":root");
  if (root) {
    const rootStyles = getComputedStyle(root);
    document.body.style.setProperty("--theme-background", rootStyles.getPropertyValue("--ls-primary-background-color") || "#ffffff");
    document.body.style.setProperty("--theme-color", rootStyles.getPropertyValue("--ls-primary-text-color") || "#000000");
    document.body.style.setProperty("--theme-accent-color", rootStyles.getPropertyValue("--ls-primary-accent-color") || "#000000");
    document.body.style.setProperty("--theme-secondary-background", rootStyles.getPropertyValue("--ls-secondary-background-color") || "#000000");
    document.body.style.setProperty("--theme-border-color", rootStyles.getPropertyValue("--ls-border-color") || "#000000");
  }
};
export function getTheme(mode: "light" | "dark"): Theme {
  if (mode === "light") {
    return lightTheme;
  } else {
    return darkTheme;
  }
}
