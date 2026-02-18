const steps = [
  { number: 1, label: "Create Your Profile" },
  { number: 2, label: "Upload Content" },
  { number: 3, label: "Get Paid" },
];

export function HowItWorksSection() {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12" style={{ color: '#F1F5F9' }}>
          How It Works
        </h2>
        <div className="grid grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4"
                style={{ backgroundColor: '#8B5CF6' }}
              >
                {step.number}
              </div>
              <h3 className="text-xl font-semibold" style={{ color: '#F1F5F9' }}>
                {step.label}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}