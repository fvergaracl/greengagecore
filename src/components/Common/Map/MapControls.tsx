import { useRouter } from "next/router";
import { FiMapPin } from "react-icons/fi";
import { LuRouteOff, LuRoute } from "react-icons/lu";
import { TbLassoPolygon } from "react-icons/tb";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { Position, CampaignData } from "./types";
import { useTranslation } from "@/hooks/useTranslation";
import { logEvent } from "@/utils/logger";
import { useEffect, useState } from "react";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { useOpenTaskStore } from "@/state/opentaskStore";
import swal from "sweetalert2";

interface MapControlsProps {
  position: Position | null;
  showRoute?: boolean;
  isSelectedPoi?: boolean;
  setSelectedCampaign: (campaign: any | null) => void;
  toggleRoute: () => void | null;
  campaignData: CampaignData | null;
  areaOpenTask: any | null;
  explorationIndices?: any;
}

const MapControls: React.FC<MapControlsProps> = ({
  position,
  showRoute = false,
  isSelectedPoi = false,
  setSelectedCampaign,
  toggleRoute = null,
  campaignData,
  areaOpenTask = null,
  explorationIndices,
}) => {
  const router = useRouter();
  const gameId = campaignData?.gameId;
  const [isInsideArea, setIsInsideArea] = useState(false);
  const openTask = areaOpenTask?.openTasks?.[0];
  const rawIndex = explorationIndices?.[areaOpenTask?.id];
  const indexExploration =
    typeof rawIndex === "number" ? rawIndex.toFixed(2) : 0;
  const points = Math.round(100 - indexExploration);
  const { t } = useTranslation();
  const map = useMap();

  const focusOnCurrentLocation = () => {
    if (position) {
      logEvent(
        "BUTTON_CLICKED_FOCUS_ON_CURRENT_LOCATION_WITH_COORDINATES",
        "User clicked on focus on current location button with coordinates",
        { position },
      );
      map.setView([position.lat, position.lng], 16);
    } else {
      console.warn("Current location is not available.");
    }
  };

  const focusOnCampaign = () => {
    if (campaignData?.areas) {
      const bounds = L.latLngBounds([]);
      let haveArea = false;
      campaignData.areas.forEach((area: any) => {
        area.polygon.forEach(([lat, lng]: [number, number]) => {
          bounds.extend([lat, lng]);
          haveArea = true;
        });
      });
      if (!haveArea) {
        swal.fire({
          title: t("No area defined"),
          text: t("This campaign does not have a defined area."),
          icon: "warning",
        });
        return;
      }
      if (!campaignData?.isDisabled && haveArea) {
        map.fitBounds(bounds);
        logEvent(
          "BUTTON_CLICKED_FOCUS_ON_CAMPAIGN_AREA",
          "User clicked on focus on campaign area button",
          { campaignData, bounds },
        );
      } else if (campaignData?.isDisabled) {
        logEvent(
          "BUTTON_CLICKED_FOCUS_ON_CAMPAIGN_AREA_DISABLED",
          "User clicked on focus on campaign area button but the campaign is disabled",
          { campaignData, bounds },
        );
        setSelectedCampaign(null);
        map.setView([position?.lat || 0, position?.lng || 0], 16);
        console.warn("Campaign is disabled.");
      }
    } else {
      console.warn("Campaign data is not available.");
    }
  };

  const openAOpentask = () => {
    if (points && points >= 0 && gameId) {
      logEvent(
        "BUTTON_CLICKED_OPEN_THE_OPENTASK",
        "User clicked on open task details button",
        { openTask, gameId, points, from: "map" },
      );
      useOpenTaskStore.getState().setData({ openTask, gameId, points });
      router.push({
        pathname: `/dashboard/opentask/${openTask?.id}`,
      });
    }
  };

  useEffect(() => {
    if (!position || !areaOpenTask?.polygon) {
      setIsInsideArea(false);
      return;
    }

    const userPoint = point([position.lng, position.lat]);
    const coords = areaOpenTask.polygon.map(([lat, lng]: [number, number]) => [
      lng,
      lat,
    ]);
    const first = coords[0];
    const last = coords[coords.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }

    const taskPolygon = polygon([coords]);

    setIsInsideArea(booleanPointInPolygon(userPoint, taskPolygon));
  }, [position, areaOpenTask]);

  return (
    <div className="absolute bottom-4 right-4 z-99999 flex flex-col gap-2">
      {isSelectedPoi && (
        <>
          {showRoute ? (
            <button
              onClick={toggleRoute}
              className="w-12 aspect-square bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md flex items-center justify-center"
              title={t("Remove route")}
            >
              <LuRouteOff size={24} />
            </button>
          ) : (
            <button
              onClick={toggleRoute}
              className="w-12 aspect-square bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md flex items-center justify-center"
              title={t("Show route")}
            >
              <LuRoute size={24} />
            </button>
          )}
        </>
      )}
      {areaOpenTask &&
        areaOpenTask?.openTasks?.length > 0 &&
        points >= 0 &&
        isInsideArea && (
          <button
            onClick={() => {
              openAOpentask();
            }}
            className="w-12 aspect-square bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md flex items-center justify-center text-sm font-bold"
            title={t("Focus on area with open tasks")}
            data-cy="focus-on-area-with-open-tasks"
          >
            {points}🪙
          </button>
        )}
      <button
        onClick={focusOnCampaign}
        className={`w-12 aspect-square ${
          campaignData?.areas ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-300"
        } text-white rounded-full shadow-md flex items-center justify-center`}
        title={t("Focus on campaign area")}
        data-cy="focus-on-campaign"
        disabled={!campaignData?.areas}
      >
        <TbLassoPolygon size={24} />
      </button>
      <button
        onClick={focusOnCurrentLocation}
        className={`w-12 aspect-square ${
          position ? "bg-indigo-500 hover:bg-indigo-600" : "bg-gray-300"
        } text-white rounded-full shadow-md flex items-center justify-center`}
        title={
          position
            ? `${t("Focus on current location")}: ${position.lat}, ${position.lng}`
            : t("Current location is not available")
        }
        disabled={!position}
      >
        <FiMapPin size={24} />
      </button>
    </div>
  );
};

export default MapControls;
