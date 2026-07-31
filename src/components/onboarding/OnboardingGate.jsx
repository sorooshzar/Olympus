import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import OnboardingFlow from "./OnboardingFlow";
import WelcomeScreen from "./WelcomeScreen";
import SignUpScreen from "./SignUpScreen";
import UsernameSetupScreen from "./UsernameSetupScreen";
import { initUserStorage, userStorage } from "@/components/utils/userStorage";
import { applyTheme } from "@/components/profile/SettingsPanel";

/**
 * Strict state machine:
 *   loading    → check auth
 *   welcome    → show WelcomeScreen (unauthenticated)
 *   login      → show LoginScreen
 *   onboarding → show OnboardingFlow (authenticated, no onboarding)
 *   signup     → show SignUpScreen (onboarding done, no account yet — pending answers)
 *   app        → render children
 */
export default function OnboardingGate({ children }) {
  const [status, setStatus] = useState("loading");
  const [onboardingAnswers, setOnboardingAnswers] = useState(null);

  // Ensure dark mode on app load
  useEffect(() => {
    const saved = localStorage.getItem("gym-dark-mode");
    const isDark = saved === null ? true : saved === "true";
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const checkState = async () => {
    setStatus("loading");
    try {
      const user = await base44.auth.me();
      initUserStorage(user.id);
      const savedTheme = userStorage.getItem("gym-theme");
      if (savedTheme) applyTheme(savedTheme);

      // Generate a friend code if the user doesn't have one yet
      if (!user.friend_code) {
        const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
        const code = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
        await base44.auth.updateMe({ friend_code: code });
      }

      // After OAuth sign-up redirect, recover & save pending onboarding answers
      const pending = sessionStorage.getItem("pending_onboarding");
      if (pending && !user.onboarding_completed) {
        sessionStorage.removeItem("pending_onboarding");
        const a = JSON.parse(pending);
        const FIELDS = ["goal","goal_weight_kg","goal_timeline_weeks","experience_level","sex","age","height_cm","weight_kg","body_fat_pct","activity_level","workout_days_per_week","nutrition_tracking","daily_calories","daily_protein","daily_carbs","daily_fat","weight_unit","week_start","workout_style"];
        const payload = { onboarding_completed: true };
        FIELDS.forEach(k => { if (a[k] != null) payload[k] = a[k]; });
        await base44.auth.updateMe(payload);
        // Mirror to local storage
        if (a.weight_unit) userStorage.setItem("gym-weight-unit", a.weight_unit);
        if (a.week_start) userStorage.setItem("gym-week-start", a.week_start === "sunday" ? "0" : "1");
        setStatus("app");
        return;
      }

      if (user.onboarding_completed) {
        // Gate: require username before entering app
        if (!user.username) {
          setStatus("username_setup");
        } else {
          setStatus("app");
        }
      } else {
        setStatus("onboarding");
      }
    } catch {
      setStatus("welcome");
    }
  };

  useEffect(() => {
    checkState();
  }, []);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">⚡</span>
          </div>
          <div className="w-6 h-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (status === "welcome") {
    return (
      <WelcomeScreen
        onGetStarted={() => setStatus("onboarding")}
        onLogin={() => base44.auth.redirectToLogin(window.location.href)}
      />
    );
  }

  if (status === "onboarding") {
    return (
      <OnboardingFlow
        onComplete={(answers) => {
          setOnboardingAnswers(answers);
          setStatus("signup");
        }}
        onLoginRequested={() => base44.auth.redirectToLogin(window.location.href)}
      />
    );
  }

  if (status === "signup") {
    return (
      <SignUpScreen
        answers={onboardingAnswers}
        onComplete={checkState}
      />
    );
  }

  if (status === "username_setup") {
    return <UsernameSetupScreen onComplete={checkState} />;
  }

  return <>{children}</>;
}