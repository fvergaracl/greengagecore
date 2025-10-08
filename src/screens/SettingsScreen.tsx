import { useRouter } from "next/router";
import React, { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AdminLayout from "@/components/AdminLayout";
import { useDashboard } from "@/context/DashboardContext";
import { useAdmin } from "@/context/AdminContext";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageDropdown from "@/components/Common/LanguageDropdown";
import axios from "axios";
import Swal from "sweetalert2";
import { getApiBaseUrl } from "@/config/api";
import { logEvent } from "@/utils/logger";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck, faBug } from "@fortawesome/free-solid-svg-icons";

const SettingsScreen = ({ DashboardContext }) => {
  const { t } = useTranslation();
  const { setUser, logout, user } = DashboardContext();
  const lastFetchTime = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userDataMemo.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  useEffect(() => {
    logEvent("RENDER_SETTINGS_SCREEN", "User viewed the settings screen");
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const now = Date.now();
      if (lastFetchTime.current && now - lastFetchTime.current < 60000) {
        return;
      }

      try {
        const response = await axios.get(`${getApiBaseUrl()}/auth/user`);
        if (response.status !== 200) {
          setUser(null);
          logout();
          throw new Error("Failed to fetch user data");

        }
        const userData = response?.data;

        setUser({
          id: userData.sub,
          name: userData.name,
          email: userData.email,
          picture: userData.picture,
          pictureKeycloak: userData.pictureKeycloak,
          roles: userData.roles,
          locale: userData.locale,
        });

        lastFetchTime.current = now;
      } catch (error) {
        console.error("Error fetching user data:", error);
        Swal.fire({
          icon: "error",
          title: t("Error"),
          text: t(
            "Failed to load user information. You will be redirected to the login page."
          ),
          timer: 10000,
          showConfirmButton: true,
          confirmButtonText: t("Ok"),
        }).then(() => {
          logout();
        });
      }
    };

    fetchUser();
  }, [setUser, t, logout]);

  const photoUrl = useMemo(
    () => user?.pictureKeycloak || user?.picture || null,
    [user?.pictureKeycloak, user?.picture]
  );

  const userDataMemo = useMemo(
    () => ({
      id: user?.id || t("No ID"),
      name: user?.name || t("No Name"),
      email: user?.email || t("No Email"),
      roles: user?.roles || [],
    }),
    [user, t]
  );

  const initials = useMemo(() => {
    if (!user?.name) return "NN";
    return user.name
      .split(" ")
      .map((word) => word[0])
      .join("");
  }, [user?.name]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.put(
        `${getApiBaseUrl()}/updatePhotoUser`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        const newPhotoUrl = response.data.url;

        setUser((prev) => ({
          ...prev,
          picture: newPhotoUrl,
          pictureKeycloak: newPhotoUrl,
        }));

        Swal.fire({
          icon: "success",
          title: t("Success!"),
          text: t("Photo updated successfully"),
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("Oops..."),
        text: t("Failed to upload the photo"),
      });
    }
  };


  const handleLogout = () => {
    Swal.fire({
      title: t("Are you sure?"),
      text: t("You will be logged out"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes"),
      cancelButtonText: t("No"),
    }).then((result) => {
      if (result.isConfirmed) logout();
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-10">
      <div className="bg-white  shadow-lg rounded-2xl p-6 flex flex-col items-center">
        {/* Foto */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 shadow mb-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              data-cy="settings-profile-photo"
            />
          ) : (
            <div
              className="flex items-center justify-center w-full h-full bg-blue-600 text-white text-2xl font-semibold"
              data-cy="settings-profile-initials"
            >
              {initials}
            </div>
          )}
        </div>

        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-sm">
              <span className="text-gray-500">{t("User ID")}:</span>
              <span className="font-medium text-gray-800 truncate max-w-[180px]">
                {userDataMemo.id}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="text-blue-600 hover:text-blue-800 transition"
              title={copied ? t("Copied!") : t("Copy to clipboard")}
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            </button>
          </div>

          <div className="text-sm">
            <p className="text-gray-500">{t("Name")}:</p>
            <p className="font-medium text-gray-800">{userDataMemo.name}</p>
          </div>

          <div className="text-sm">
            <p className="text-gray-500">{t("Email")}:</p>
            <p className="font-medium text-gray-800">{userDataMemo.email}</p>
          </div>

          {userDataMemo.roles.length > 0 ? (
            <div className="text-sm">
              <p className="text-gray-500 mb-1">{t("Roles")}:</p>
              <div className="flex flex-wrap gap-2">
                {userDataMemo.roles.map((role) => (
                  <span
                    key={role}
                    className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full shadow-sm"
                    data-cy="settings-user-role"
                  >
                    {t(role)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t("No roles assigned")}.</p>
          )}

          <div className="text-sm flex items-center gap-2 pt-1">
            <LanguageDropdown />
          </div>
          {user?.roles?.includes("admin") && (
            <div className="text-sm flex items-center gap-2 pt-1">
              <button
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow"
                onClick={() => {
                  router.push("/admin");
                }}
                data-cy="settings-admin-panel-button"
                title={t("Open admin panel")}
              >
                {t("Admin Panel")}
              </button>
            </div>
          )}
          {user?.id && (
            <div className="text-sm flex items-center gap-2 pt-3">
              <a
                href={`https://docs.google.com/forms/d/e/1FAIpQLSewsWIB4ffZpwiPT-xzOAkUxlPon2fwVmmT-uBoEAtV8M9FYQ/viewform?usp=pp_url&entry.2109072124=${user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t("Help us improve by reporting an issue")}
                className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 transition-colors duration-200 text-white font-semibold rounded-xl shadow flex items-center justify-center gap-2"
                data-cy="settings-report-bug-button"
                onClick={() =>
                  logEvent(
                    "CLICK_REPORT_BUG",
                    "User opened the bug report form",
                    {
                      userId: user.id,
                    }
                  )
                }
              >
                <FontAwesomeIcon icon={faBug} className="text-white" />
                {t("Report an issue")}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow"
          data-cy="settings-logout-button"
        >
          {t("Logout")}
        </button>
      </div>
    </div>
  );
};

export default function SettingsInApp() {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <div className="pt-6 max-full mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          {t("Settings")}
        </h1>
      </div>
      <SettingsScreen DashboardContext={useDashboard} />
    </DashboardLayout>
  );
}

const SettingsInAdmin = () => {
  const { t } = useTranslation();
  return (
    <AdminLayout>
      <div className="pt-6 max-full mx-auto text-center">
        <h1 className="text-3xl font-bold text-white mb-6">{t("Settings")}</h1>
      </div>
      <SettingsScreen DashboardContext={useAdmin} />
    </AdminLayout>
  );
};

export { SettingsInAdmin };
