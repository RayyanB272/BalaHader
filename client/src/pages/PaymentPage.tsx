import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import PageFrame from "../components/layout/PageFrame";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { createPaymentIntent } from "../services/orderService";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

function PaymentForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-result?order=${orderId}`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Payment could not be completed.");
      setProcessing(false);
      return;
    }

    window.location.href = `/payment-result?order=${orderId}`;
  }

  return (
    <form onSubmit={submitPayment} className="space-y-5">
      <PaymentElement />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60"
      >
        {processing ? "Processing payment..." : "Pay securely"}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError("Missing order ID.");
      return;
    }

    createPaymentIntent(orderId)
      .then((data) => setClientSecret(data.client_secret))
      .catch(() => setError("Could not start the payment."));
  }, [orderId]);

  return (
    <PageFrame hideFooter>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
        <Link to="/cart" className="text-sm font-semibold text-[#C9472E]">
          ← Back to cart
        </Link>

        <section className="mt-6 rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#3A2925]">
            Secure payment
          </h1>
          <p className="mt-2 text-sm text-[#71605A]">
            Your order is reserved temporarily while payment is completed.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {!error && !clientSecret && <LoadingSpinner />}

          {clientSecret && (
            <div className="mt-6">
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: "stripe" } }}
              >
                <PaymentForm orderId={orderId!} />
              </Elements>
            </div>
          )}
        </section>
      </main>

      </PageFrame>
  );
}
