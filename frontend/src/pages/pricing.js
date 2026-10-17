import React from 'react';

const Pricing = () => {
  const pricingPlans = [
    {
      name: 'Basic',
      price: '$10/month',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
    {
      name: 'Pro',
      price: '$20/month',
      features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'],
    },
    {
      name: 'Enterprise',
      price: '$50/month',
      features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'],
    },
  ];

  return (
    <div className="pricing-page">
      <h1>Pricing Plans</h1>
      <div className="pricing-plans">
        {pricingPlans.map((plan) => (
          <div key={plan.name} className="pricing-plan">
            <h2>{plan.name}</h2>
            <p>{plan.price}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button>Choose Plan</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;