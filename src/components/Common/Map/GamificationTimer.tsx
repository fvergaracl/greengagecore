import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";

interface GamificationTimerProps {
  endTime: number;
  fetchGamificationData: () => void;
}

export default function GamificationTimer({
  endTime,
  fetchGamificationData,
}: GamificationTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(() => {
    const initialDiff = endTime && endTime > 0 ? endTime - Date.now() : 0;
    return initialDiff > 0 ? initialDiff : 0;
  });

  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (!endTime || endTime <= 0) return;

    const interval = setInterval(() => {
      const diff = endTime - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  useEffect(() => {
    if (timeLeft <= 0 && !hasExecutedRef.current) {
      fetchGamificationData();
      hasExecutedRef.current = true;
    }
  }, [timeLeft, fetchGamificationData]);

  const formatTime = (milliseconds: number): string => {
    if (!milliseconds || milliseconds <= 0) return "00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (!endTime || endTime <= 0) return null;
  if (timeLeft <= 0) return null;
  return (
    <div className="fixed top-3 right-3 z-50">
      <Tooltip
        title={t("Time left to complete the challenge and earn points")}
        arrow
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-800 text-white shadow-lg"
        >
          <div className="flex items-center gap-1">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-semibold">
              {formatTime(timeLeft)}
            </span>
          </div>
          <InfoIcon className="text-sm opacity-80" />
        </motion.div>
      </Tooltip>
    </div>
  );
}
