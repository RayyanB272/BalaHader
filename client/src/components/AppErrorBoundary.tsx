import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Keeps a component failure from leaving the entire SPA as a blank page. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("BalaHader page failed to render", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF9EE] px-6 py-12 text-[#3A2925]">
        <section className="w-full max-w-lg rounded-2xl border border-[#EEDFD3] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#E85D3F]">Page error</p>
          <h1 className="mt-2 text-2xl font-bold">This page could not be displayed</h1>
          <p className="mt-3 text-sm text-[#71605A]">
            Refresh the page and try again. Your saved account data is safe.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white"
            >
              Refresh page
            </button>
            <Link
              to="/business/listings"
              className="rounded-xl border border-[#EEDFD3] px-5 py-3 text-sm font-semibold text-[#3A2925]"
            >
              Back to listings
            </Link>
          </div>
        </section>
      </main>
    );
  }
}
