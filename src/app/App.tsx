import { useMemo, useState } from 'react';
import { AppDialogs, type AppDialog } from './components/AppDialogs';
import { AppHeader } from './components/AppHeader';
import { StorageNotice, Toast } from './components/Feedback';
import { useToast } from './hooks/useToast';
import { OffersHeader } from '../features/offers/components/OffersHeader';
import { OffersList } from '../features/offers/components/OffersList';
import { createLocalOfferRepository } from '../features/offers/data/local-offer-repository';
import { useOffers } from './hooks/useOffers';
import { useOfferFilters } from '../features/offers/hooks/useOfferFilters';
import type { OfferRepository } from '../features/offers/model/offers';
import { BankAppNotice } from '../features/banks/components/BankAppNotice';
import { bankSuggestions } from '../features/banks/model/banks';
import type { BankApp } from '../features/banks/model/bank-apps';
import { useMobileVersion } from '../shared/hooks/use-mobile-version';
import { useAnalyticsNotice } from '../features/analytics/hooks/useAnalyticsNotice';
import { AnalyticsNotice } from '../features/analytics/components/AnalyticsNotice';
import {
  browserAnalytics,
  type AnalyticsController,
} from '../features/analytics/services/firebase-analytics';

const browserRepository = createLocalOfferRepository();

/** Composition root: browser services are injected into the application model here. */
export default function App({
  repository = browserRepository,
  analyticsController = browserAnalytics,
}: {
  repository?: OfferRepository;
  analyticsController?: AnalyticsController;
}) {
  const toast = useToast();
  const model = useOffers(repository, toast.notify);
  const filters = useOfferFilters(model.offers);
  const [dialog, setDialog] = useState<AppDialog>(null);
  const [bankToOpen, setBankToOpen] = useState<BankApp | null>(null);
  const mobile = useMobileVersion();
  const analytics = useAnalyticsNotice(analyticsController);
  const banks = useMemo(
    () => bankSuggestions(model.offers.map((offer) => offer.bank)),
    [model.offers],
  );
  return (
    <>
      <AppHeader
        onHome={() => filters.setSearch('')}
        onData={() => setDialog({ type: 'data' })}
        onHelp={() => setDialog({ type: 'help' })}
      />
      <main className="page">
        <OffersHeader
          count={model.offers.length}
          hasStorageError={!!model.error}
          onAdd={() => setDialog({ type: 'manual' })}
          onUpload={() => setDialog({ type: 'upload' })}
          onClear={() => setDialog({ type: 'clear' })}
        />
        {model.error && <StorageNotice error={model.error} onRetry={() => model.reload()} />}
        <OffersList
          offers={model.offers}
          {...filters}
          mobile={mobile}
          onScreenshotDrop={(file) => setDialog({ type: 'upload', file })}
          onEdit={(offer) => setDialog({ type: 'manual', offer })}
          onOpenBank={(app) => {
            toast.dismiss();
            setBankToOpen(app);
          }}
        />
      </main>
      <AnalyticsNotice notice={analytics} />
      {toast.message && <Toast message={toast.message} onClose={toast.dismiss} />}
      {mobile && bankToOpen && (
        <BankAppNotice app={bankToOpen} onClose={() => setBankToOpen(null)} />
      )}
      <AppDialogs
        dialog={dialog}
        offers={model.offers}
        banks={banks}
        actions={{
          ...model,
          importOffers: (incoming) => {
            const saved = model.importOffers(incoming);
            if (saved) filters.setSearch('');
            return saved;
          },
        }}
        onClose={() => setDialog(null)}
        onManual={() => setDialog({ type: 'manual' })}
      />
    </>
  );
}
