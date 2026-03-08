import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { t } from "../i18n/index.ts";
import type { Tab } from "./navigation.ts";

const STORAGE_PREFIX = "openclaw.onboarding.seen.";

/** Check if a tour has been seen for a given tab. */
export function hasSeenTour(tab: Tab): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${tab}`) === "1";
  } catch {
    return false;
  }
}

/** Mark a tour as seen for a given tab. */
export function markTourSeen(tab: Tab): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tab}`, "1");
  } catch {
    // Ignore storage errors
  }
}

/** Reset all tour states (for "restart tours" button). */
export function resetAllTours(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

/** Active driver instance (only one tour at a time). */
let activeDriver: Driver | null = null;

/** Destroy any active tour. */
export function destroyActiveTour(): void {
  if (activeDriver) {
    activeDriver.destroy();
    activeDriver = null;
  }
}

function buildSteps(tab: Tab): DriveStep[] {
  switch (tab) {
    case "overview":
      return [
        {
          element: ".brand",
          popover: {
            title: t("onboarding.overview.welcome.title"),
            description: t("onboarding.overview.welcome.description"),
          },
        },
        {
          element: ".card:has(.section-title)",
          popover: {
            title: t("onboarding.overview.access.title"),
            description: t("onboarding.overview.access.description"),
          },
        },
        {
          element: ".topbar-status",
          popover: {
            title: t("onboarding.overview.status.title"),
            description: t("onboarding.overview.status.description"),
          },
        },
        {
          element: ".nav",
          popover: {
            title: t("onboarding.overview.nav.title"),
            description: t("onboarding.overview.nav.description"),
          },
        },
        {
          element: ".theme-toggle",
          popover: {
            title: t("onboarding.overview.theme.title"),
            description: t("onboarding.overview.theme.description"),
          },
        },
      ];

    case "channels":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.channels.intro.title"),
            description: t("onboarding.channels.intro.description"),
          },
        },
        {
          element: ".content",
          popover: {
            title: t("onboarding.channels.setup.title"),
            description: t("onboarding.channels.setup.description"),
          },
        },
      ];

    case "instances":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.instances.intro.title"),
            description: t("onboarding.instances.intro.description"),
          },
        },
      ];

    case "sessions":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.sessions.intro.title"),
            description: t("onboarding.sessions.intro.description"),
          },
        },
      ];

    case "usage":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.usage.intro.title"),
            description: t("onboarding.usage.intro.description"),
          },
        },
      ];

    case "cron":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.cron.intro.title"),
            description: t("onboarding.cron.intro.description"),
          },
        },
        {
          element: ".content",
          popover: {
            title: t("onboarding.cron.create.title"),
            description: t("onboarding.cron.create.description"),
          },
        },
      ];

    case "agents":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.agents.intro.title"),
            description: t("onboarding.agents.intro.description"),
          },
        },
        {
          element: ".content",
          popover: {
            title: t("onboarding.agents.manage.title"),
            description: t("onboarding.agents.manage.description"),
          },
        },
      ];

    case "skills":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.skills.intro.title"),
            description: t("onboarding.skills.intro.description"),
          },
        },
        {
          element: ".content",
          popover: {
            title: t("onboarding.skills.manage.title"),
            description: t("onboarding.skills.manage.description"),
          },
        },
      ];

    case "nodes":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.nodes.intro.title"),
            description: t("onboarding.nodes.intro.description"),
          },
        },
      ];

    case "config":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.config.intro.title"),
            description: t("onboarding.config.intro.description"),
          },
        },
        {
          element: ".content",
          popover: {
            title: t("onboarding.config.edit.title"),
            description: t("onboarding.config.edit.description"),
          },
        },
      ];

    case "debug":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.debug.intro.title"),
            description: t("onboarding.debug.intro.description"),
          },
        },
      ];

    case "logs":
      return [
        {
          element: ".content-header",
          popover: {
            title: t("onboarding.logs.intro.title"),
            description: t("onboarding.logs.intro.description"),
          },
        },
      ];

    case "chat":
      return [
        {
          element: ".content--chat",
          popover: {
            title: t("onboarding.chat.intro.title"),
            description: t("onboarding.chat.intro.description"),
          },
        },
      ];

    default:
      return [];
  }
}

/**
 * Start the onboarding tour for a given tab.
 * Returns the Driver instance if started, null if no steps or already seen.
 */
export function startTour(tab: Tab, opts?: { force?: boolean }): Driver | null {
  const steps = buildSteps(tab);
  if (steps.length === 0) {
    return null;
  }

  // Don't start if already seen (unless forced)
  if (!opts?.force && hasSeenTour(tab)) {
    return null;
  }

  // Destroy any existing tour
  destroyActiveTour();

  let tourStarted = false;

  activeDriver = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: "rgba(0, 0, 0, 0.6)",
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: "onboarding-popover",
    nextBtnText: t("onboarding.buttons.next"),
    prevBtnText: t("onboarding.buttons.prev"),
    doneBtnText: t("onboarding.buttons.done"),
    progressText: t("onboarding.buttons.progress"),
    steps,
    onDestroyed: () => {
      if (tourStarted) {
        markTourSeen(tab);
      }
      activeDriver = null;
    },
  });

  // Small delay to ensure DOM is ready after tab switch
  const currentDriver = activeDriver;
  requestAnimationFrame(() => {
    // Guard against race condition if another tour was started before this rAF fires
    if (activeDriver !== currentDriver) {
      return;
    }
    tourStarted = true;
    currentDriver.drive();
  });

  return activeDriver;
}

/** Track the most recently requested tab for maybeStartTour debouncing. */
let pendingTourTab: Tab | null = null;

/**
 * Start tour for a tab if not yet seen.
 * Called automatically on tab switch.
 */
export function maybeStartTour(tab: Tab): void {
  if (!hasSeenTour(tab)) {
    // Record this tab as the pending target so rapid switches only fire the last one
    pendingTourTab = tab;
    // Delay slightly to ensure content is rendered
    setTimeout(() => {
      if (pendingTourTab !== tab) {
        return; // Tab changed since we scheduled this tour
      }
      pendingTourTab = null;
      startTour(tab);
    }, 300);
  }
}
