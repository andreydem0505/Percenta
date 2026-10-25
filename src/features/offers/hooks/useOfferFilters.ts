import { useMemo, useState } from 'react';
import { matchesOfferSearch, sortOffers, type Offer } from '../model/offers';

export function useOfferFilters(offers: readonly Offer[]) {
  const [search, setSearch] = useState('');
  const visible = useMemo(
    () => sortOffers(offers.filter((offer) => matchesOfferSearch(offer, search))),
    [offers, search],
  );
  return { search, setSearch, visible };
}
