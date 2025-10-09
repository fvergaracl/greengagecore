import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Swal from "sweetalert2";
import GoBack from "@/components/Admin/GoBack";
import { isUUID } from "@/utils/isUUID";
import { getApiBaseUrl, getApiGameBaseUrl } from "@/config/api";

interface CampaignFormProps {
  campaignId?: string;
  onSuccess?: () => void;
}

const CampaignForm: React.FC<CampaignFormProps> = ({
  campaignId,
  onSuccess,
}) => {
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    groupName: "",
    isOpen: true,
    startDatetime: null as string | null,
    endDatetime: null as string | null,
    gameId: null as string | null,
    selectedStrategyId: "",
    createWithGamification: false,
    location: "",
    category: "",
  });
  const router = useRouter();
  const [hasStartDatetime, setHasStartDatetime] = useState(false);
  const [hasEndDatetime, setHasEndDatetime] = useState(false);
  const [hasGamification, setHasGamification] = useState(false);
  const [groupSuggestions, setGroupSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState(null);
  const [gamificationStrategies, setGamificationStrategies] = useState<any[]>(
    [],
  );

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/auth/token", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch token");
        const { access_token } = await response.json();
        setAccessToken(access_token);
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    const fetchGamificationStrategies = async () => {
      const strategies = await getAllGamificationStrategies();
      setGamificationStrategies(strategies);
    };

    if (accessToken) {
      fetchGamificationStrategies();
    }
  }, [accessToken]);

  const createGame = async () => {
    {
      try {
        const strategyId = (formValues as any).selectedStrategyId;
        const response = await fetch(
          `${getApiBaseUrl()}/admin/gamification/campaign/${campaignId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              strategyId,
            }),
          },
        );
        if (!response.ok) throw new Error("Failed to create game");
        const data = await response.json();
        setFormValues((prev) => ({
          ...prev,
          gameId: data.gameId,
        }));
        Swal.fire({
          title: "Gamification Created",
          text: `Game ID: ${data.gameId}`,
          icon: "success",
          timer: 4000,
        });
        setHasGamification(true);
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: "Error",
          text: "Failed to create gamification.",
          icon: "error",
        });
      }
    }
  };

  const removeGame = async () => {
    if (!formValues.gameId) return;
    try {
      await axios.delete(
        `${getApiBaseUrl()}/admin/gamification/campaign/${campaignId}`,
      );
      setFormValues((prev) => ({ ...prev, gameId: null }));
      Swal.fire({
        title: "Gamification Removed",
        text: "Gamification has been removed successfully.",
        icon: "success",
        timer: 4000,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: "Failed to remove gamification.",
        icon: "error",
      });
    }

    // DELETE ALL ATTRIBUTES TO DON'T POST IN FORM
    setFormValues((prev) => {
      const { selectedStrategyId, createWithGamification, gameId, ...rest } =
        prev;
      return {
        ...rest,
      };
    });
    hasGamification && setHasGamification(false);
  };

  useEffect(() => {
    if (campaignId) {
      const fetchCampaign = async () => {
        try {
          setLoading(true);
          const response = await axios.get(
            `${getApiBaseUrl()}/admin/campaigns/${campaignId}`,
          );
          setFormValues({
            name: response.data.name,
            description: response.data.description || "",
            isOpen: response.data.isOpen,
            startDatetime: response.data.startDatetime || null,
            endDatetime: response.data.endDatetime || null,
            location: response.data.location || "",
            category: response.data.category || "",
            gameId: response.data.gameId || "",
          });
          setHasStartDatetime(!!response.data.startDatetime);
          setHasEndDatetime(!!response.data.endDatetime);
          setHasGamification(!!response.data.gameId);
          setLoading(false);
        } catch (err) {
          console.error(err);
          setError("Failed to fetch campaign details.");
          setLoading(false);
        }
      };

      fetchCampaign();
    }
  }, [campaignId]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get(
          `${getApiBaseUrl()}/admin/campaigns/groups`,
        );
        setGroupSuggestions(res.data);
      } catch (err) {
        console.error("Failed to load groups", err);
      }
    };

    fetchGroups();
  }, []);

  const validateForm = () => {
    const missingFields: string[] = [];

    if (!formValues.name.trim()) missingFields.push("Name");
    if (!formValues.category.trim()) missingFields.push("Category");

    if (missingFields.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        html: `Please fill the following fields:<br><b>${missingFields.join(
          ", ",
        )}</b>`,
        timer: 5000,
        timerProgressBar: true,
      });
      return false;
    }
    return true;
  };

  const getAllGamificationStrategies = async () => {
    if (!accessToken) {
      console.error("Access token is not available");
      return [];
    }
    try {
      const response = await fetch(`${getApiGameBaseUrl()}/strategies`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch gamification strategies");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching gamification strategies:", error);
      return [];
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const now = new Date();
    const endDatetime = formValues.endDatetime
      ? new Date(formValues.endDatetime)
      : null;
    const startDatetime = formValues.startDatetime
      ? new Date(formValues.startDatetime)
      : null;

    if (endDatetime && startDatetime && endDatetime <= startDatetime) {
      Swal.fire({
        title: "Validation Error",
        text: "End date and time must be after the start date and time.",
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
      });
      return;
    }

    if (hasGamification && !isUUID(formValues.gameId)) {
      Swal.fire({
        title: "Validation Error",
        text: "Game ID must be a valid UUID.",
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const swalMessage = campaignId
        ? "Updating campaign..."
        : "Creating campaign...";

      Swal.fire({
        title: swalMessage,
        icon: "info",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      const formValuesCleaned = {
        ...formValues,
        startDatetime: hasStartDatetime ? formValues?.startDatetime : null,
        endDatetime: hasEndDatetime ? formValues?.endDatetime : null,
        gameId: hasGamification ? formValues?.gameId : null,
      };
      if (formValuesCleaned.selectedStrategyId === "") {
        delete formValuesCleaned.selectedStrategyId;
      }
      if (createWithGamification === false) {
        delete formValuesCleaned.createWithGamification;
      }
      if (campaignId) {
        // delete selectedStrategyId
        delete formValuesCleaned.selectedStrategyId;
        delete formValuesCleaned.createWithGamification;
        await axios.put(
          `${getApiBaseUrl()}/admin/campaigns/${campaignId}`,
          formValuesCleaned,
        );
      } else {
        if (
          formValues.createWithGamification &&
          formValues.selectedStrategyId
        ) {
          await axios.post(
            `${getApiBaseUrl()}/admin/campaigns/createGameWithStrategy`,
            {
              ...formValuesCleaned,
              strategyId: formValues.selectedStrategyId,
            },
          );
        } else {
          await axios.post(
            `${getApiBaseUrl()}/admin/campaigns`,
            formValuesCleaned,
          );
        }
      }

      setLoading(false);
      Swal.fire({
        title: "Success!",
        text: `Campaign ${campaignId ? "updated" : "created"} successfully!`,
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
      });

      if (onSuccess) onSuccess();
      else router.back();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: "Failed to save the campaign. Please try again.",
        icon: "error",
      });
      setLoading(false);
    }
  };

  const handleDatetimeToggle = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end",
  ) => {
    if (type === "start") {
      setHasStartDatetime(e.target.checked);
      if (!e.target.checked) {
        setFormValues((prev) => ({ ...prev, startDatetime: null }));
      }
    } else {
      setHasEndDatetime(e.target.checked);
      if (!e.target.checked) {
        setFormValues((prev) => ({ ...prev, endDatetime: null }));
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md dark:bg-gray-800"
    >
      <GoBack data-cy="go-back-campaign-details" />
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="mb-4">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formValues.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description
        </label>
        <input
          type="text"
          id="description"
          name="description"
          value={formValues.description}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="groupName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Group
        </label>
        <input
          list="groupName-options"
          type="text"
          id="groupName"
          name="groupName"
          value={formValues.groupName || ""}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        />
        <datalist id="groupName-options">
          {groupSuggestions.map((g, i) => (
            <option key={i} value={g} />
          ))}
        </datalist>
      </div>
      <div className="mb-4">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Category <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="category"
          name="category"
          value={formValues.category}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Location
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formValues.location}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        />
      </div>{" "}
      {!campaignId && (
        <>
          <div className="mb-4">
            <input
              type="checkbox"
              id="createWithGamification"
              checked={formValues.createWithGamification}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  createWithGamification: e.target.checked,
                }))
              }
            />
            <label
              htmlFor="createWithGamification"
              className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Create campaign with gamification
            </label>
          </div>

          {formValues.createWithGamification && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gamification Strategy
              </label>
              <select
                id="strategy"
                name="strategy"
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    selectedStrategyId: e.target.value,
                  }))
                }
                value={formValues.selectedStrategyId}
              >
                <option value="">Select strategy</option>
                {gamificationStrategies.map((strategy) => (
                  <option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
      {campaignId && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Gamification Strategy
            </label>
            <select
              id="strategy"
              name="strategy"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  gameId: "", // Reset al cambiar estrategia
                  selectedStrategyId: e.target.value,
                }))
              }
              value={(formValues as any).selectedStrategyId || ""}
            >
              <option value="">Select strategy</option>
              {gamificationStrategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>

          {formValues.gameId ? (
            <div className="mb-4">
              <p className="text-green-600 dark:text-green-400">
                Gamification set with Game ID:{" "}
                <strong>{formValues.gameId}</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  removeGame();
                  setFormValues((prev) => ({
                    ...prev,
                    gameId: null,
                    selectedStrategyId: "",
                  }));
                }}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove Gamification
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <button
                type="button"
                disabled={
                  !(formValues as any).selectedStrategyId || !accessToken
                }
                onClick={async () => {
                  if (!(formValues as any).selectedStrategyId) {
                    Swal.fire({
                      title: "Select Strategy",
                      text: "Please select a gamification strategy first.",
                      icon: "warning",
                      timer: 3000,
                      timerProgressBar: true,
                    });
                    return;
                  }
                  await createGame();
                }}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Gamification
              </button>
            </div>
          )}
        </>
      )}
      <div className="mb-4">
        <input
          type="checkbox"
          id="hasStartDatetime"
          checked={hasStartDatetime}
          onChange={(e) => handleDatetimeToggle(e, "start")}
        />
        <label
          htmlFor="hasStartDatetime"
          className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Set Start Date and Time
        </label>
      </div>
      {hasStartDatetime && (
        <div className="mb-4">
          <label
            htmlFor="startDatetime"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Start Date and Time
          </label>
          <input
            type="datetime-local"
            id="startDatetime"
            name="startDatetime"
            value={formValues.startDatetime || ""}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          />
        </div>
      )}
      <div className="mb-4">
        <input
          type="checkbox"
          id="hasEndDatetime"
          checked={hasEndDatetime}
          onChange={(e) => handleDatetimeToggle(e, "end")}
        />
        <label
          htmlFor="hasEndDatetime"
          className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Set End Date and Time
        </label>
      </div>{" "}
      {hasEndDatetime && (
        <div className="mb-4">
          <label
            htmlFor="endDatetime"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            End Date and Time
          </label>
          <input
            type="datetime-local"
            id="endDatetime"
            name="endDatetime"
            value={formValues.endDatetime || ""}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          />
        </div>
      )}
      <div className="mb-4">
        <label
          htmlFor="isOpen"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Status
        </label>
        <select
          id="isOpen"
          name="isOpen"
          value={formValues.isOpen ? "true" : "false"}
          onChange={(e) =>
            setFormValues((prev) => ({
              ...prev,
              isOpen: e.target.value === "true",
            }))
          }
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        >
          <option value="true">Open (Anyone can join)</option>
          <option value="false">Closed (Invite-only)</option>
        </select>
      </div>
      <button
        type="submit"
        className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring focus:ring-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600"
        disabled={loading}
      >
        {loading
          ? "Saving..."
          : campaignId
            ? "Update Campaign"
            : "Create Campaign"}
      </button>
    </form>
  );
};

export default CampaignForm;
