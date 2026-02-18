import { Wallet, Shield, Percent } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

const features = [
  {
    icon: <Wallet size={32} strokeWidth={1.5} />,
    title: "Instant Wallet System",
    description: "Get paid instantly with our seamless wallet integration. Your earnings, available immediately.",
  },
  {
    icon: <Shield size={32} strokeWidth={1.5} />,
    title: "Content Protection",
    description: "Advanced DRM and watermarking technology keeps your content secure and protected.",
  },
  {
    icon: <Percent size={32} strokeWidth={1.5} />,
    title: "Only 18% Commission",
    description: "Keep more of what you earn. The lowest commission rate in the industry.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" style={{ width: "100%", padding: "80px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "24px" }}>
          {features.map((feature) => (
            <FeatureCard key={feature.title} icon={feature.icon} title={feature.title} description={feature.description} />
          ))}
        </div>
      </div>
    </section>
  );
}