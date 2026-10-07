import type { Metadata } from "next";
import { notFound } from "next/navigation";

type InfoSection = { heading: string; body: string[] };
type InfoPage = { title: string; description: string; sections: InfoSection[] };

export const INFO_PAGES: Record<string, InfoPage> = {
  about: {
    title: "About Nexus Market",
    description: "What Nexus Market is and who it's for.",
    sections: [
      {
        heading: "A marketplace for independent sellers",
        body: [
          "Nexus Market is a multi-vendor marketplace where verified independent sellers list their products and buyers shop from many stores in a single checkout.",
          "We take care of the plumbing — discovery, payments, order tracking, and buyer protection — so sellers can focus on their products.",
        ],
      },
      {
        heading: "How we keep quality high",
        body: [
          "Every seller goes through an application review with CNIC verification, and every product listing is approved by our moderation team before it goes live.",
          "Ratings and reviews come only from customers with delivered orders.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact us",
    description: "How to reach the Nexus Market team.",
    sections: [
      {
        heading: "Customer support",
        body: [
          "Email: support@nexusmarket.local — we respond within one business day.",
          "Include your order number (NX-…) so we can help faster.",
        ],
      },
      {
        heading: "Seller support",
        body: ["Email: sellers@nexusmarket.local for listings, payouts, and account questions."],
      },
    ],
  },
  faq: {
    title: "Frequently asked questions",
    description: "Answers to common questions about orders, returns, and selling.",
    sections: [
      {
        heading: "Orders & delivery",
        body: [
          "How do I track my order? — Open Account → Orders and open your order to see a live status timeline per seller order.",
          "When do I get free delivery? — Orders over Rs 30,000 ship free; below that a flat delivery fee applies per seller order.",
        ],
      },
      {
        heading: "Returns & refunds",
        body: [
          "How do I return something? — Open the delivered order and choose “Request return”. Once approved and received, the refund is processed to your original payment method.",
          "Cash on delivery refunds are issued via bank transfer — our team will ask for your details.",
        ],
      },
      {
        heading: "Selling",
        body: [
          "How do I become a seller? — Submit an application on the Sell page. Approval usually takes 1–2 business days.",
          "What does it cost? — A commission per completed order (shown on the Sell page); no upfront listing fees.",
        ],
      },
    ],
  },
  shipping: {
    title: "Shipping",
    description: "Delivery timelines and fees.",
    sections: [
      {
        heading: "Delivery",
        body: [
          "Sellers typically dispatch within 1–3 business days; metro deliveries usually arrive in 2–5 days after dispatch.",
          "Each seller order ships separately — items from different stores may arrive on different days.",
        ],
      },
      {
        heading: "Fees",
        body: [
          "Flat delivery fee per seller order, waived automatically on orders over Rs 30,000.",
          "Delivery fees and free-shipping thresholds are shown at checkout before you pay.",
        ],
      },
    ],
  },
  returns: {
    title: "Returns & refunds",
    description: "Our return policy and refund timelines.",
    sections: [
      {
        heading: "Return window",
        body: [
          "Eligible items can be returned within 7 days of delivery in original condition with tags attached.",
          "Start a return from Account → Orders → Request return on a delivered order.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Once the seller receives the return, the refund is issued to your original payment method.",
          "Card/bank refunds usually settle within 5–7 business days; COD refunds are transferred by bank.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: "How we handle your data.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account details (name, email), shipping addresses, order history, and basic usage data needed to run the marketplace.",
          "Payment card details are handled by our payment providers — we never store full card numbers.",
        ],
      },
      {
        heading: "Who sees it",
        body: [
          "Sellers only receive the details required to fulfil your order (name, delivery address, contact number).",
          "We never sell personal data to third parties.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service",
    description: "The ground rules for using Nexus Market.",
    sections: [
      {
        heading: "Using the marketplace",
        body: [
          "You're responsible for your account activity and for providing accurate delivery details.",
          "Listings are provided by independent sellers; the marketplace facilitates the transaction and buyer protection.",
        ],
      },
      {
        heading: "Orders & cancellations",
        body: [
          "Orders can be cancelled while pending or confirmed; after dispatch, use the return flow instead.",
          "Prices, commissions, and policies may change; the versions shown at checkout apply to your order.",
        ],
      },
    ],
  },
  fees: {
    title: "Fees & commissions",
    description: "What selling on Nexus Market costs.",
    sections: [
      {
        heading: "Commission",
        body: [
          "A commission is deducted from each completed order — product-level and category-level rules can override the platform default.",
          "Your effective commission is always visible in your seller dashboard earnings breakdown.",
        ],
      },
      {
        heading: "Payouts",
        body: [
          "Earnings become available once an order is delivered. Request a payout from the Earnings page once you pass the minimum threshold.",
        ],
      },
    ],
  },
};

const slugs = Object.keys(INFO_PAGES);

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  if (!page) return {};
  return { title: page.title, description: page.description };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  if (!page) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground">{page.description}</p>
      </header>

      <div className="space-y-10">
        {page.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
