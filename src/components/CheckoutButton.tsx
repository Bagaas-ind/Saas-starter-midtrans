"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import type { PlanTier } from "@/types/database";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface CheckoutButtonProps {
  planId: PlanTier;
  planName: string;
  priceIdr: number;
  currentPlan?: PlanTier | null;
  isAuthenticated: boolean;
  variant?: "primary" | "outline";
  className?: string;
}

export function CheckoutButton({
  planId,
  planName,
  priceIdr,
  currentPlan,
  isAuthenticated,
  variant = "primary",
  className = "",
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCurrentPlan = isAuthenticated && currentPlan === planId;
  const isFreePlan = priceIdr === 0 || planId === "free";

  const handleCheckout = async () => {
    setErrorMessage(null);

    if (!isAuthenticated) {
      router.push(`/login?plan=${planId}`);
      return;
    }

    if (isCurrentPlan) {
      router.push("/dashboard");
      return;
    }

    if (isFreePlan) {
      router.push("/dashboard");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to initiate payment");
      }

      if (window.snap && data.token) {
        window.snap.pay(data.token, {
          onSuccess: () => {
            router.push(`/dashboard?payment=success&order_id=${data.order_id}`);
            router.refresh();
          },
          onPending: () => {
            router.push(`/dashboard?payment=pending&order_id=${data.order_id}`);
            router.refresh();
          },
          onError: () => {
            setErrorMessage("Payment failed or was declined. Please try again.");
            router.refresh();
          },
          onClose: () => {
            router.refresh();
          },
        });
      } else if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        throw new Error("Midtrans Snap is not initialized.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unexpected checkout error"
      );
    } finally {
      setLoading(false);
    }
  };

  let buttonLabel = `Upgrade to ${planName}`;
  if (!isAuthenticated) {
    buttonLabel = isFreePlan ? "Get Started Free" : `Choose ${planName}`;
  } else if (isCurrentPlan) {
    buttonLabel = "Current Active Plan";
  } else if (isFreePlan) {
    buttonLabel = "Included on Free Tier";
  }

  const baseStyles =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const variantStyles =
    variant === "primary"
      ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
      : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || isCurrentPlan}
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Initializing Snap...</span>
          </>
        ) : (
          <>
            <span>{buttonLabel}</span>
            {!isCurrentPlan && <ArrowRight className="h-4 w-4" />}
          </>
        )}
      </button>

      {errorMessage && (
        <p className="mt-2 text-xs font-medium text-rose-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
