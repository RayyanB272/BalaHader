import { Link } from "react-router-dom";
import PublicHeader from "../components/layout/PublicHeader";
import Footer from "../components/layout/Footer";

const content = {
  terms: {
    title: "Terms of Service",
    sections: [
      ["Using BalaHader", "BalaHader connects customers, food businesses and charities in Tripoli to reduce food waste. You agree to provide accurate information and to use the platform lawfully."],
      ["Orders and food safety", "Businesses are responsible for the quality and safety of the food they list. Customers should collect or receive orders within the stated time."],
      ["Charities and donations", "Charities must be verified by an administrator before claiming donations. Donated food must only be used for its intended charitable purpose."],
      ["Accounts", "You are responsible for keeping your password secure. We may suspend accounts that misuse the platform."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["What we collect", "We collect the details you give us when registering (name, email, phone) and, for businesses and charities, your organization details and address."],
      ["How we use it", "We use your information to run your account, process orders and donations, and send notifications about them."],
      ["Sharing", "Businesses and charities see the details needed to fulfil an order or donation. We do not sell your personal data."],
      ["Your choices", "You can update your profile details in your account settings at any time."],
    ],
  },
};

export default function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const page = content[kind];
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF9EE]">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <h1 className="text-4xl font-bold text-[#3A2925]">{page.title}</h1>
        <p className="mt-2 text-sm text-[#71605A]">A plain-language summary. Replace with your final legal text before launch.</p>
        <div className="mt-8 space-y-6">
          {page.sections.map(([heading, body]) => (
            <section key={heading} className="rounded-2xl border border-[#EEDFD3] bg-white p-6">
              <h2 className="text-xl font-bold text-[#3A2925]">{heading}</h2>
              <p className="mt-2 leading-relaxed text-[#71605A]">{body}</p>
            </section>
          ))}
        </div>
        <Link to="/register" className="mt-8 inline-block font-semibold text-[#C9472E] hover:underline">← Back to sign up</Link>
      </main>
      <Footer />
    </div>
  );
}
