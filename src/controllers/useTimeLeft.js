"use client";
import { useState, useEffect, useMemo } from "react";

export default function useTimeLeft(time) {
  const targetTime = useMemo(() => new Date(time), [time]);

  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = targetTime - now;

    if (isNaN(targetTime.getTime())) {
      return {
        hours: "--",
        minutes: "--",
        seconds: "--",
        started: false,
        isToday: false,
      };
    }

    return {
      hours:
        difference > 0 ? Math.floor((difference / (1000 * 60 * 60)) % 24) : 0,
      minutes: difference > 0 ? Math.floor((difference / 1000 / 60) % 60) : 0,
      seconds: difference > 0 ? Math.floor((difference / 1000) % 60) : 0,
      started: difference <= 0,
      isToday:
        now.getFullYear() === targetTime.getFullYear() &&
        now.getMonth() === targetTime.getMonth() &&
        now.getDate() === targetTime.getDate(),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  return timeLeft;
}
