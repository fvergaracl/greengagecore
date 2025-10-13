import { useRouter } from "next/router";
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import ReactDOMServer from "react-dom/server";
import {
  MapContainer as LeafletMapContainer,
  Circle,
  Tooltip,
  TileLayer,
  Marker,
  Polygon,
  Popup,
} from "react-leaflet";
import L, { DivIcon } from "leaflet";
import "leaflet-routing-machine";
import findContainingArea from "@/utils/findContainingArea";
import LeafletRoutingMachine from "leaflet-routing-machine";
import CustomMarker from "../Mapmarker";
import DistanceIndicator from "./DistanceIndicator";
import "leaflet/dist/leaflet.css";
import { useDashboard, DashboardContextType } from "@/context/DashboardContext";
import { useAdmin, AdminContextType } from "@/context/AdminContext";
import MapControls from "./MapControls";
import { useTranslation } from "@/hooks/useTranslation";
import FitBounds from "./FitBounds";
import "../styles.css";
import { logEvent } from "@/utils/logger";
import { getApiBaseUrl, getApiGameBaseUrl } from "@/config/api";
import { getDeviceHeading } from "@/utils/getDeviceHeading";
import Lottie from "lottie-react";
import MapLocationNeeded from "@/lotties/map_location_needed.json";
import TaskList from "./TaskList";
import GamificationTimer from "./GamificationTimer";
import Swal from "sweetalert2";
import { Point, PolygonData, CampaignData, PointOfInterest } from "./types";
import "leaflet.heat";
import { HeatLayerForArea } from "./HeatLayerForArea";

interface MapProps {
  showMyLocation?: boolean;
  points: Point[];
  polygons: PolygonData[];
  polygonsMultiColors?: boolean;
  polygonsTitle?: boolean;
  polygonsFitBounds?: boolean;
  clickOnPolygon?: (polygon: PolygonData) => void;
  selectedCampaign: CampaignData | null;
  modeView?: "contribuitor-view" | "admin-view";
  showMapControl?: boolean;
}

type ContextType = {
  mapCenter: [number, number];
  position: { lat: number; lng: number } | null;
  isTracking: boolean;
};

type Dimension = { [key: string]: number };
type TaskPreProccess = {
  externalTaskId: string;
  totalSimulatedPoints: number;
  dimensions: Dimension[];
};

type ProcessedPOI = {
  poiId: string;
  averagePoints: number;
  normalizedScore: number;
};

const decodeToken = (token: string): { roles?: string[] } | null => {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );
    return payload;
  } catch {
    console.error("Invalid token format");
    return null;
  }
};

export const useContextMapping = ():
  | DashboardContextType
  | AdminContextType
  | ContextType => {
  const router = useRouter();

  const isDashboard = router.pathname.startsWith("/dashboard");
  const isAdmin = router.pathname.startsWith("/admin");

  if (isAdmin) {
    return useAdmin();
  }

  if (isDashboard) {
    return useDashboard();
  }

  return {
    mapCenter: [0, 0],
    position: null,
    isTracking: false,
  };
};

const colors = [
  { border: "blue", fill: "lightblue" },
  { border: "red", fill: "pink" },
  { border: "green", fill: "lightgreen" },
  { border: "purple", fill: "plum" },
  { border: "orange", fill: "peachpuff" },
];
const Routing = ({ map, start, end, routingControlRef }) => {
  useEffect(() => {
    if (!map || !start || !end) return;

    if (routingControlRef.current) {
      routingControlRef.current
        .getPlan()
        .setWaypoints([
          L.latLng(start.lat, start.lng),
          L.latLng(end.lat, end.lng),
        ]);
      return;
    }

    try {
      routingControlRef.current = L.Routing.control({
        waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
        router: new L.Routing.OSRMv1({
          serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1",
          profile: "driving",
        }),
        routeWhileDragging: true,
        lineOptions: {
          styles: [{ color: "#FF0000", opacity: 1, weight: 5 }],
        },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        createMarker: () => null,
      }).addTo(map);
    } catch (error) {
      console.error("Error al inicializar la ruta:", error);
    }

    return () => {};
  }, [map, start, end]);

  return null;
};
const FOURTEEN_MINUTES_MS = 14 * 60 * 1000;
export default function Map({
  showMyLocation = false,
  points = [],
  polygons = [],
  polygonsMultiColors = true,
  polygonsTitle = false,
  polygonsFitBounds = false,
  clickOnPolygon = undefined,
  selectedCampaign,
  modeView = "contribuitor-view",
  showMapControl = false,
}: MapProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    mapCenter,
    position,
    isTracking,
    positionFullDetails,
    setSelectedCampaign,
  } = useContextMapping();
  const mapRef = useRef<L.Map | null>(null);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const [errorPoi, setErrorPoi] = useState<any>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const [selectedPolygon, setSelectedPolygon] = useState<PolygonData | null>(
    null,
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [lastFetchToken, setLastFetchToken] = useState<Date | null>(null);
  const [gamificationData, setGamificationData] = useState<any>(null);
  const [myActivityInCampaign, setMyActivityInCampaign] = useState<any>(null);
  const [showRoute, setShowRoute] = useState<boolean>(false);
  const [lastFetchGamificationData, setLastFetchGamificationData] =
    useState<Date | null>(null);
  const [areaOpenTask, setAreaOpenTask] = useState<any>(null);
  const [explorationIndices, setExplorationIndices] = useState<
    Record<string, number>
  >({});
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find((cookie) =>
    cookie.startsWith("access_token="),
  );
  tokenCookie ? tokenCookie.split("=")[1] : null;

  const fetchGamificationData = async () => {
    const now = new Date().getTime();
    try {
      const decodedToken = decodeToken(accessToken);
      const res = await fetch(
        `${getApiGameBaseUrl()}/games/${campaignData?.gameId}/users/${decodedToken?.sub}/points/simulated`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const resJson = await res.json();
      setGamificationData(resJson);
      logEvent(
        "USER_FETCHED_GAMIFICATION_DATA",
        `User fetched gamification data for campaign: ${selectedCampaign?.id}`,
        {
          gamificationData: resJson,
          campaignData,
          gameId: campaignData?.gameId,
          userId: decodedToken?.sub,
          accessToken,
        },
      );

      if (resJson?.detail) {
        logEvent(
          "USER_FETCHED_GAMIFICATION_DATA_ERROR",
          `User fetched gamification data for campaign: ${selectedCampaign?.id} with error`,
          {
            gamificationData: resJson,
            campaignData,
            gameId: campaignData?.gameId,
            userId: decodedToken?.sub,
            accessToken,
          },
        );

        if (res.status === 404) {
          console.warn("Game not found (404). Retrying in 5 minutes.");
          setTimeout(
            () => {
              fetchGamificationData();
            },
            5 * 60 * 1000,
          );
          return;
        } else {
          console.error(
            ">>>> Error fetching gamification data",
            resJson.detail,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          fetchGamificationData();
        }

        return;
      }
      localStorage.setItem(
        `gamificationData_${selectedCampaign?.id}`,
        JSON.stringify(resJson),
      );
      localStorage.setItem(
        `lastFetchGamificationData_${selectedCampaign?.id}`,
        new Date().toString(),
      );
      setLastFetchGamificationData(now);
    } catch (err) {
      localStorage.setItem(
        `gamificationData_${selectedCampaign?.id}`,
        JSON.stringify([]),
      );
      localStorage.setItem(
        `lastFetchGamificationData_${selectedCampaign?.id}`,
        new Date().toString(),
      );
      setGamificationData([]);
      setLastFetchGamificationData(now);
      console.error("Failed to fetch gamification data", err);
    }
  };

  useEffect(() => {
    if (!position || !campaignData) return;
    const containingArea = findContainingArea(campaignData, position);

    if (containingArea) {
      setAreaOpenTask(containingArea);
    }
  }, [campaignData, position]);

  useEffect(() => {
    const fetchMyActivity = async () => {
      if (!selectedCampaign) return;
      const res = await fetch(
        `${getApiBaseUrl()}/campaigns/myActivityCount?campaignId=${selectedCampaign?.id}`,
        {
          method: "GET",
          credentials: "include",
        },
      );
      const resJson = await res.json();

      setMyActivityInCampaign(resJson);
    };

    fetchMyActivity();
  }, [selectedCampaign]);

  useEffect(() => {
    if (!isTracking || !selectedCampaign || !campaignData || !accessToken)
      return;

    const shouldFetch = (): boolean => {
      const lastFetchStr = localStorage.getItem(
        `lastFetchGamificationData_${selectedCampaign?.id}`,
      );
      if (!lastFetchStr) return true;

      const lastFetch = new Date(lastFetchStr).getTime(); // convertir GMT a timestamp
      const now = Date.now();

      return now - lastFetch > FOURTEEN_MINUTES_MS;
    };

    if (shouldFetch()) {
      fetchGamificationData();
    } else {
      const cachedData = localStorage.getItem(
        `gamificationData_${selectedCampaign?.id}`,
      );
      if (cachedData) {
        const cachedDataJson = JSON.parse(cachedData);
        if (cachedDataJson?.detail) {
          localStorage.removeItem(`gamificationData_${selectedCampaign?.id}`);
          localStorage.removeItem(
            `lastFetchGamificationData_${selectedCampaign?.id}`,
          );
          fetchGamificationData();
          return;
        }
        setGamificationData(cachedDataJson);
        const storedTimestamp = new Date(
          localStorage.getItem(
            `lastFetchGamificationData_${selectedCampaign?.id}`,
          )!,
        ).getTime();

        setLastFetchGamificationData(storedTimestamp);
        const cachedTasks = cachedDataJson.tasks;
        const expectedTaskIds = [];
        for (const area of campaignData.areas) {
          for (const poi of area.pointOfInterests) {
            for (const task of poi.tasks) {
              const id = `GREENCROWD_CAMPAIGNID_${selectedCampaign?.id}_POI_${poi.id}_TASK_${task.id}`;
              expectedTaskIds.push(id);
            }
          }
        }

        const existingTaskIds = cachedTasks?.map((task) => task.externalTaskId);

        const missing = expectedTaskIds?.filter(
          (id) => !existingTaskIds?.includes(id),
        );

        if (missing.length > 0) {
          localStorage.removeItem(`gamificationData_${selectedCampaign?.id}`);
          localStorage.removeItem(
            `lastFetchGamificationData_${selectedCampaign?.id}`,
          );
          setLastFetchGamificationData(null);
          setGamificationData(null);
          fetchGamificationData();
        }
      }
    }

    fetchTimerRef.current = setInterval(() => {
      if (shouldFetch()) {
        fetchGamificationData();
      }
    }, 60 * 1000); // check every minutes

    return () => {
      if (fetchTimerRef.current) {
        clearInterval(fetchTimerRef.current);
        fetchTimerRef.current = null;
      }
    };
  }, [isTracking, selectedCampaign?.id, campaignData?.gameId, accessToken]);

  useEffect(() => {
    if (!router.isReady) return;

    const fetchToken = async () => {
      try {
        const response = await fetch("/api/auth/token", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch token");

        const { access_token } = await response.json();
        setLastFetchToken(new Date());
        setAccessToken(access_token);
        localStorage.setItem("accessToken", access_token);
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };

    const fetchTokenInterval = 15 * 60 * 1000;

    if (
      !lastFetchToken ||
      new Date().getTime() - lastFetchToken.getTime() > fetchTokenInterval
    ) {
      fetchToken();
    }

    const interval = setInterval(() => {
      fetchToken();
    }, fetchTokenInterval);

    return () => clearInterval(interval);
  }, [router.isReady, lastFetchToken]);

  useEffect(() => {
    if (!isTracking) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const heading = await getDeviceHeading();
        if (isMounted) setHeading(heading);
      } catch (error) {
        console.error("Error getting device heading:", error);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isTracking, positionFullDetails]);

  const toggleRoute = (logEventShouldBeLogged = true) => {
    if (showRoute) {
      if (logEventShouldBeLogged) {
        logEvent(
          "USER_SELECTED_POI_REMOVED_ROUTE_MAP",
          `User removed the route in the map`,
          {
            poi: selectedPoi,
          },
        );
      }
      setShowRoute(false);
      if (routingControlRef.current) {
        try {
          if (routingControlRef.current) {
            routingControlRef.current.getPlan().setWaypoints([]);
          }
        } catch (error) {
          console.error("Error al limpiar la ruta:", error);
        }
      }
      return;
    }

    if (logEventShouldBeLogged) {
      logEvent(
        "USER_SELECTED_POI_SHOWED_ROUTE_MAP",
        `User showed the route in the map`,
        {
          poi: selectedPoi,
        },
      );
    }
    setShowRoute(true);
  };

  const processTasks = (data: { tasks: TaskPreProccess[] }) => {
    const poiMap: Record<string, { total: number; count: number }> = {};
    data?.tasks?.forEach((task) => {
      const match = task.externalTaskId.match(
        /GREENCROWD_CAMPAIGNID_[^_]+_POI_([^_]+)_TASK_/,
      );
      if (match) {
        const poiId = match[1];

        let pointsToCount = task.totalSimulatedPoints || 0;

        if (!poiMap[poiId]) {
          poiMap[poiId] = { total: 0, count: 0 };
        }

        poiMap[poiId].total += pointsToCount;
        poiMap[poiId].count += 1;
      }
    });

    const poiList: ProcessedPOI[] = Object.entries(poiMap)?.map(
      ([poiId, values]) => ({
        poiId,
        averagePoints: values.total / values.count,
        normalizedScore: 0,
      }),
    );

    const minPoints = Math.min(...poiList?.map((poi) => poi.averagePoints));
    const maxPoints = Math.max(...poiList?.map((poi) => poi.averagePoints));

    poiList?.forEach((poi) => {
      if (maxPoints !== minPoints) {
        poi.normalizedScore = Math.round(
          1 + (poi.averagePoints - minPoints) * (9 / (maxPoints - minPoints)),
        );
      } else {
        poi.normalizedScore = 1;
      }
    });

    return poiList;
  };

  const createCustomIcon = (color: string, size: number) => {
    const markerHtml = ReactDOMServer.renderToString(
      <CustomMarker markerColor={color} size={size} />,
    );

    return L.divIcon({
      html: markerHtml,
      className: "custom-marker",
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
    });
  };

  const handleSelectPoi = (poi: PointOfInterest | null) => {
    if (!position) {
      Swal.fire({
        icon: "error",
        title: t("Error"),
        text: t(
          "Please enable location services or give permissions to the app to access",
        ),
      });
      return;
    }
    logEvent(
      poi ? "USER_SELECTED_POI_IN_MAP" : "USER_UNSELECTED_POI_IN_MAP",
      `User selected a point of interest in the map with id: ${poi?.id}`,
      { poi },
    );

    setSelectedPoi(poi);
  };

  const handleIndexCalculated = useCallback((id: string, index: number) => {
    setExplorationIndices((prev) => {
      if (prev[id] === index) return prev;
      return {
        ...prev,
        [id]: index,
      };
    });
  }, []);
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!selectedCampaign) return;
      const res = await fetch(
        `${getApiBaseUrl()}/campaigns/${selectedCampaign?.id}`,
      );
      const resJson = await res.json();
      setCampaignData(resJson);
    };

    fetchCampaignData();
  }, [selectedCampaign]);

  const markerIcon = useMemo(() => {
    if (isTracking) {
      return new DivIcon({
        className: "blinking-marker-container",
        html: `
          <div class="rotating-wrapper" style="transform: rotate(${heading}deg); transform-origin: center;">
            <div class="blinking-marker">
              <div class="inner-circle"></div>
              <div class="arrow"></div>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
    } else {
      return new DivIcon({
        className: "static-marker-icon",
        html: `
          <div class="static-marker">
            <div class="inner-circle"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
    }
  }, [isTracking, positionFullDetails]);

  useEffect(() => {
    if (selectedPoi) {
      checkTaskAndPoi(selectedPoi);
    }
  }, [selectedPoi]);

  const firstDivClassName =
    modeView === "contribuitor-view" ? "h-[calc(100vh-4rem)]" : "h-96";

  const secondDivClassName =
    modeView === "contribuitor-view"
      ? `${selectedPoi ? "h-[70%]" : "h-full"} transition-all duration-300`
      : "h-full";

  const checkTaskAndPoi = (poi: PointOfInterest) => {
    const destination = L.latLng(poi?.latitude, poi?.longitude);

    const distance = mapRef.current?.distance(
      L.latLng(position?.lat, position?.lng),
      destination,
    );

    if (distance && distance <= poi.radius) {
      if (poi.tasks.length > 0) {
        handleSelectPoi(poi);
      } else {
        setErrorPoi(t("This point of interest has no tasks"));
      }
    } else {
      setErrorPoi(t("You are not close enough to this point of interest"));
    }
  };

  if (!isTracking) {
    return (
      <div
        className="min-h-screen flex flex-col justify-center items-center"
        data-cy="map-container-for-dashboard"
      >
        <div className="flex justify-center">
          <Lottie
            animationData={MapLocationNeeded}
            loop={true}
            className="max-w-[300px] w-full"
          />
        </div>
        <h2 className="text-center text-2xl">
          {t("Please enable location services to see the map")}
        </h2>
      </div>
    );
  }

  let gamificationDataNormalized = null;
  if (gamificationData && campaignData?.gameId) {
    gamificationDataNormalized = processTasks(gamificationData);
  }

  const getOnlyTaskToShow = (allTasks) => {
    const responseCountMap = {};

    myActivityInCampaign?.forEach(({ task }) => {
      const key = `${task.id}|${task.pointOfInterestId}`;
      responseCountMap[key] = (responseCountMap[key] || 0) + 1;
    });

    const validTasks = allTasks?.filter((task) => {
      const {
        id,
        pointOfInterestId,
        responseLimit,
        responseLimitInterval,
        availableFrom,
        availableTo,
        isDisabled,
      } = task;

      const key = `${id}|${pointOfInterestId}`;
      const currentResponses = responseCountMap[key] || 0;

      if (responseLimit && currentResponses >= responseLimit) {
        return false;
      }

      if (responseLimitInterval) {
        const lastResponse = myActivityInCampaign?.find(
          ({ task }) => task.id === id,
        );
        if (lastResponse) {
          const lastResponseDate = new Date(lastResponse.createdAt);
          const now = new Date();
          const diff = now.getTime() - lastResponseDate.getTime();
          const diffInHours = diff / (1000 * 60 * 60);
          if (diffInHours < responseLimitInterval) {
            return false;
          }
        }
      }

      if (availableFrom) {
        const from = new Date(availableFrom);
        if (from > new Date()) {
          return false;
        }
      }

      if (availableTo) {
        const to = new Date(availableTo);
        if (to < new Date()) {
          return false;
        }
      }

      if (isDisabled) {
        return false;
      }
      return true;
    });

    return validTasks;
  };

  const renderMarkers = useMemo(() => {
    if (isTracking && !campaignData?.gameId) {
      return campaignData?.areas
        ?.flatMap((area: { pointOfInterests: any }) => area?.pointOfInterests)
        .map((poi: PointOfInterest) => (
          <React.Fragment key={`poi-${poi.id}`}>
            <Circle
              key={`${poi.id}-circle`}
              center={[poi.latitude, poi.longitude]}
              radius={poi.radius}
              pathOptions={{ color: "green", fillOpacity: 0.2 }}
              eventHandlers={{
                click: () => {
                  if (selectedPoi?.id === poi?.id) {
                    handleSelectPoi(null);
                  } else {
                    handleSelectPoi(poi);
                  }
                },
              }}
            />
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
              icon={createCustomIcon("green", 36)}
              eventHandlers={{
                click: () => {
                  if (selectedPoi) {
                    logEvent(
                      "USER_SELECTED_POI_IN_MAP_BY_MARKER",
                      `User selected a point of interest in the map with id: ${selectedPoi.id}`,
                      { poi: selectedPoi },
                    );

                    setSelectedPoi(null);
                    return;
                  }
                  handleSelectPoi(poi);
                },
              }}
            />
          </React.Fragment>
        ));
    }
    if (isTracking && campaignData?.areas) {
      return campaignData?.areas
        ?.flatMap(
          (area: { pointOfInterests: any }) => area?.pointOfInterests || [],
        )
        .map((poi: PointOfInterest) => {
          const taskToShow = getOnlyTaskToShow(poi.tasks);

          if (taskToShow.length === 0) return null;
          if (!Array.isArray(gamificationDataNormalized)) return null;
          const poiId = poi.id;

          if (!poiId) return null;

          const normalizedData = gamificationDataNormalized.find(
            (item) => item.poiId === poiId,
          );

          if (!normalizedData)
            return (
              <React.Fragment key={`poi-${poi.id}`}>
                <Circle
                  key={`${poi.id}-circle`}
                  center={[poi.latitude, poi.longitude]}
                  radius={poi.radius}
                  pathOptions={{ color: "green", fillOpacity: 0.2 }}
                  eventHandlers={{
                    click: () => {
                      if (selectedPoi?.id === poi?.id) {
                        handleSelectPoi(null);
                      } else {
                        handleSelectPoi(poi);
                      }
                    },
                  }}
                />
                <Marker
                  key={poi.id}
                  position={[poi.latitude, poi.longitude]}
                  icon={createCustomIcon("green", 36)}
                  eventHandlers={{
                    click: () => {
                      if (selectedPoi) {
                        logEvent(
                          "USER_SELECTED_POI_IN_MAP_BY_MARKER",
                          `User selected a point of interest in the map with id: ${selectedPoi.id}`,
                          { poi: selectedPoi },
                        );

                        setSelectedPoi(null);
                        return;
                      }
                      handleSelectPoi(poi);
                    },
                  }}
                />
              </React.Fragment>
            );
          const { averagePoints, normalizedScore } = normalizedData;

          const iconSize = 8 + normalizedScore * 2;
          return (
            <>
              <Circle
                key={`${poi.id}-circle`}
                center={[poi.latitude, poi.longitude]}
                radius={poi.radius}
                pathOptions={{ color: "green", fillOpacity: 0.2 }}
                eventHandlers={{
                  click: () => {
                    if (selectedPoi?.id === poi?.id) {
                      handleSelectPoi(null);
                    } else {
                      handleSelectPoi(poi);
                    }
                  },
                }}
              />
              <Marker
                key={poi.id}
                position={[poi.latitude, poi.longitude]}
                icon={createCustomIcon("green", iconSize)}
                eventHandlers={{
                  click: () => {
                    if (selectedPoi) {
                      logEvent(
                        "USER_SELECTED_POI_IN_MAP_BY_MARKER",
                        `User selected a point of interest in the map with id: ${selectedPoi.id}`,
                        { poi: selectedPoi },
                      );

                      setSelectedPoi(null);
                      return;
                    }
                    handleSelectPoi(poi);
                  },
                }}
              >
                <Tooltip
                  direction="top"
                  data-cy="tooltip-average-points"
                  offset={[0, -10]}
                  permanent
                >
                  <span
                    style={{
                      fontSize: iconSize,
                    }}
                  >
                    {averagePoints.toFixed(1).toString().replace(".", ",")} 🪙
                  </span>
                </Tooltip>
              </Marker>
            </>
          );
        });
    }
    return <></>;
  }, [campaignData, gamificationDataNormalized, selectedPoi]);

  useEffect(() => {
    if (campaignData && campaignData?.isDisabled) {
      logEvent("CAMPAIGN_DISABLED", `Campaign ${campaignData.id} is disabled`, {
        campaignData,
      });
      setSelectedCampaign(null);
      router.push("/dashboard");
    }
  }, [campaignData, router, setSelectedCampaign]);

  return (
    <>
      <div className={firstDivClassName} data-cy="map-container-for-dashboard">
        {campaignData?.gameId &&
          gamificationData &&
          gamificationData?.tasks?.length > 0 && (
            <div className="absolute top-4 right-4 z-[9999]">
              <GamificationTimer
                endTime={lastFetchGamificationData + FOURTEEN_MINUTES_MS}
                fetchGamificationData={fetchGamificationData}
              />
            </div>
          )}

        <div className={secondDivClassName}>
          <LeafletMapContainer
            center={mapCenter || [0, 0]}
            zoom={mapCenter ? 16 : 13}
            style={{ height: "100%", width: "100%" }}
            data-cy="map-container-for-dashboard"
            whenReady={(event) => {
              mapRef.current = event.target;
            }}
          >
            {selectedPoi && position && (
              <DistanceIndicator
                poi={selectedPoi}
                position={position}
                onRadiusChange={(isInside) => {
                  if (isInside) {
                    setErrorPoi(null);
                  }
                }}
              />
            )}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {showMapControl && isTracking && (
              <MapControls
                position={position}
                showRoute={showRoute}
                isSelectedPoi={!!selectedPoi}
                setSelectedCampaign={setSelectedCampaign}
                toggleRoute={selectedPoi && toggleRoute}
                campaignData={campaignData}
                areaOpenTask={areaOpenTask}
                explorationIndices={explorationIndices}
              />
            )}
            {isTracking &&
              polygons?.map((polygon, index) => {
                if (polygonsMultiColors) {
                  const color = colors[index % colors.length];
                  return (
                    <Polygon
                      key={polygon.id}
                      positions={polygon.polygon}
                      pathOptions={{
                        color: color.border,
                        fillColor: color.fill,
                        fillOpacity: 0.2,
                      }}
                      eventHandlers={{
                        click: () => {
                          setSelectedPolygon(polygon);
                          if (clickOnPolygon) clickOnPolygon(polygon);
                        },
                      }}
                    >
                      {polygonsTitle && <Tooltip>{polygon.name}</Tooltip>}
                      {selectedPolygon?.id === polygon.id && (
                        <Popup>
                          <div>
                            <h3>
                              <strong></strong>
                              {polygon.name}
                            </h3>
                            <p>
                              <strong>{t("Description")}:</strong>
                              {polygon.description}
                            </p>
                            <button
                              onClick={() => {
                                router.push(`/admin/areas/${polygon.id}`);
                              }}
                              className="text-blue-600 underline"
                            >
                              {t("See more")}
                            </button>
                          </div>
                        </Popup>
                      )}
                    </Polygon>
                  );
                }
                return (
                  <Polygon
                    key={index}
                    positions={polygon.coordinates}
                    pathOptions={{ color: "blue", weight: 2 }}
                  />
                );
              })}
            {isTracking &&
              points?.map((point, index) => (
                <Marker
                  key={index}
                  position={[point.lat, point.lng]}
                  icon={L.icon({
                    iconUrl: "/marker-icon.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  })}
                />
              ))}
            {isTracking &&
              campaignData?.areas?.map(
                (area: {
                  id: string;
                  name: string;
                  description: string;
                  polygon: [number, number][];
                  pointOfInterests: any[];
                  openTasks?: {
                    responses?: { latitude: number; longitude: number }[];
                  }[];
                }) => (
                  <>
                    <Polygon
                      key={area.id}
                      positions={area.polygon}
                      pathOptions={{ color: "blue", weight: 2 }}
                    >
                      <Popup>
                        <h3>{area.name}</h3>
                        <p>{area.description}</p>
                      </Popup>
                    </Polygon>

                    {area.openTasks?.some((task) => task.responses?.length) && (
                      <HeatLayerForArea
                        area={area}
                        position={position}
                        totalResponses={area?.responses?.length || 0}
                        onIndexCalculated={handleIndexCalculated}
                      />
                    )}
                  </>
                ),
              )}

            {renderMarkers}

            {showMyLocation && position && (
              <Marker position={[position.lat, position.lng]} icon={markerIcon}>
                <Popup>
                  <h3>{t("Your current location")}</h3>
                </Popup>
              </Marker>
            )}
            {isTracking && polygonsFitBounds && (
              <FitBounds polygons={polygons} />
            )}
            {isTracking &&
              selectedPoi &&
              showRoute &&
              position &&
              mapRef.current && (
                <Routing
                  map={mapRef.current}
                  start={{ lat: position.lat, lng: position.lng }}
                  end={{
                    lat: selectedPoi.latitude,
                    lng: selectedPoi.longitude,
                  }}
                  routingControlRef={routingControlRef}
                />
              )}
          </LeafletMapContainer>
        </div>
        {isTracking && selectedPoi && (
          <div className="h-[30%] overflow-y-auto">
            {selectedPoi.tasks.length >= 0 && (
              <TaskList
                isTracking={isTracking}
                selectedPoi={selectedPoi}
                myActivityInCampaign={myActivityInCampaign.filter(
                  ({ task }) => task.pointOfInterestId === selectedPoi.id,
                )}
                errorPoi={errorPoi}
                logEvent={logEvent}
                t={t}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
