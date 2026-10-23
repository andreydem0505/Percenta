import { useMemo, useState } from 'react';
import { normalize, sortOffers, type Offer } from '../model/offers';

export function useOfferFilters(offers: readonly Offer[]) {
  const [search, setSearch] = useState('');
  const visible = useMemo(
    () =>
      sortOffers(
        offers.filter((offer) =>
          normalize(`${offer.category} ${offer.bank}`).includes(normalize(search)),
        ),
      ),
    [offers, search],
  );
  return { search, setSearch, visible };
}
