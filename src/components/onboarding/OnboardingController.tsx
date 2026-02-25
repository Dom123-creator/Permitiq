'use client';

import { useState, useEffect } from 'react';
import { OnboardingWizard } from './OnboardingWizard';

export function OnboardingController() {
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // Check after hydration — never runs on the server
    if (!localStorage.getItem('permitiq_onboarded')) {
      setShowWizard(true);
    }
  }, []);

  if (!showWizard) return null;

  return <OnboardingWizard onComplete={() => setShowWizard(false)} />;
}
