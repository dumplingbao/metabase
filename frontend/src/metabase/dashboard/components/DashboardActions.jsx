import React from "react";
import { t } from "ttag";
import Tooltip from "metabase/components/Tooltip";
import NightModeIcon from "metabase/components/icons/NightModeIcon";
import FullscreenIcon from "metabase/components/icons/FullscreenIcon";
import RefreshWidget from "metabase/dashboard/components/RefreshWidget";

export const getDashboardActions = ({
  isEditing = false,
  isEmpty = false,
  isFullscreen,
  themeMode,
  onThemeModeChange,
  onFullscreenChange,
  refreshPeriod,
  setRefreshElapsedHook,
  onRefreshPeriodChange,
}) => {
  const buttons = [];

  if (!isEditing && !isEmpty) {
    buttons.push(
      <RefreshWidget
        key="refresh"
        data-metabase-event="Dashboard;Refresh Menu Open"
        className="text-brand-hover"
        period={refreshPeriod}
        setRefreshElapsedHook={setRefreshElapsedHook}
        onChangePeriod={onRefreshPeriodChange}
      />,
    );
  }

  if (!isEditing && isFullscreen) {
    buttons.push(
      <Tooltip
        key="night"
        tooltip={themeMode}
      >
        <span data-metabase-event={"Dashboard;themeMode Mode;" + themeMode}>
          <NightModeIcon
            className="text-brand-hover cursor-pointer"
            theme={themeMode}
            onThemeModeChange={onThemeModeChange}
          />
        </span>
      </Tooltip>,
    );
  }

  if (!isEditing && !isEmpty) {
    // option click to enter fullscreen without making the browser go fullscreen
    buttons.push(
      <Tooltip
        key="fullscreen"
        tooltip={isFullscreen ? t`Exit fullscreen` : t`Enter fullscreen`}
      >
        <span
          data-metabase-event={"Dashboard;Fullscreen Mode;" + !isFullscreen}
        >
          <FullscreenIcon
            className="text-brand-hover cursor-pointer"
            isFullscreen={isFullscreen}
            onClick={e => onFullscreenChange(!isFullscreen, !e.altKey)}
          />
        </span>
      </Tooltip>,
    );
  }

  return buttons;
};
