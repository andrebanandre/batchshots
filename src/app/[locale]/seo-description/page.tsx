'use client';

import { useTranslations } from 'next-intl';
import Card from '../../components/Card';
import SeoProductDescriptionGenerator from '../../components/SeoProductDescriptionGenerator';
import { useIsPro } from '../../hooks/useIsPro';
import Button from '../../components/Button';
import { useRouter } from 'next/navigation';
import Loader from '../../components/Loader';

// Placeholder for translations namespace
const T_NAMESPACE = 'Components.SeoDescriptionPage';

export default function SeoDescriptionPage() {
  const t = useTranslations();
  const tPage = useTranslations(T_NAMESPACE);
  const { isProUser, isLoading: isProLoading } = useIsPro();
  const router = useRouter();
  
  if (isProLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-6xl flex flex-col justify-center items-center min-h-screen">
        <Loader size="lg" className="mb-4" />
        <p className="text-lg font-semibold">{t('Components.BackgroundRemovalPage.loading.tool')}</p> 
      </main>
    );
  }
  
  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          {tPage('title')}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content Area (Left/Center) */}
          <div className="md:col-span-2">
          <SeoProductDescriptionGenerator />
          </div>

          {/* Sidebar Area (Right) */}
          <div className="space-y-6">
            {/* Pro Upgrade Card (Conditional) */}
            {!isProUser && (
              <Card title={tPage('upgradeCard.title')} variant="accent">
                <p className="text-sm mb-4">{tPage('upgradeCard.description')}</p>
                <Button variant='primary' onClick={() => router.push('/pricing')} fullWidth>
                  {tPage('upgradeCard.button')}
                </Button>
              </Card>
            )}

            {/* Instructions Card */}
            <Card title={tPage('instructionsCard.title')} variant="accent">
              <div className="space-y-2 text-sm p-3 bg-white brutalist-border">
                <p>1. {tPage('instructionsCard.step1')}</p>
                <p>2. {tPage('instructionsCard.step2')}</p>
                <p>3. {tPage('instructionsCard.step3')}</p>
                <p>4. {tPage('instructionsCard.step4')}</p>
                <p>5. {tPage('instructionsCard.step5')}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
} 