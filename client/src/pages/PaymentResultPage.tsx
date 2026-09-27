import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import { clearCart } from "../services/cartService";
import { getCheckoutPayment, getOrder } from "../services/orderService";

type Result = "checking" | "paid" | "failed" | "pending" | "error";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const checkoutId = params.get("checkout");
  const [result, setResult] = useState<Result>("checking");

  useEffect(() => {
    if (!orderId && !checkoutId) {
      setResult("error");
      return;
    }

    let stopped = false;
    let attempts = 0;

    async function checkOrder() {
      try {
        const order = checkoutId ? await getCheckoutPayment(checkoutId) : await getOrder(orderId!);
        if (stopped) return;

        if (order.payment_status === "paid") {
          clearCart();
          setResult("paid");
          stopped = true;
        } else if (
          order.payment_status === "failed" ||
          ("order_status" in order && order.order_status === "cancelled")
        ) {
          setResult("failed");
          stopped = true;
        } else if (++attempts >= 15) {
          setResult("pending");
          stopped = true;
        }
      } catch {
        if (!stopped) {
          setResult("error");
          stopped = true;
        }
      }
    }

    void checkOrder();
    const timer = window.setInterval(() => {
      if (!stopped) void checkOrder();
      else window.clearInterval(timer);
    }, 2000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [orderId, checkoutId]);

  const message = {
    checking: "Checking your payment...",
    paid: "Payment confirmed! Your order is placed.",
    failed: "Payment was not completed.",
    pending: "Payment is still processing. Please check your orders shortly.",
    error: "We could not check this order right now.",
  }[result];

  return (
    <PageFrame hideFooter>
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-12">
        <section
          role="status"
          className="w-full rounded-2xl border border-[#EEDFD3] bg-white p-8 text-center shadow-sm"
        >
          <h1 className="text-2xl font-bold text-[#3A2925]">
            {result === "paid" && checkoutId ? "Payment confirmed! All business orders are placed." : message}
          </h1>

          {orderId && (
            <p className="mt-3 text-sm text-[#71605A]">
              Order #{orderId.slice(-8).toUpperCase()}
            </p>
          )}
          {checkoutId && <p className="mt-3 text-sm text-[#71605A]">Combined checkout #{checkoutId.slice(-8).toUpperCase()}</p>}

          <Link
            to="/orders"
            className="mt-6 inline-block rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white"
          >
            View my orders
          </Link>
        </section>
      </main>
      </PageFrame>
  );
}
