import { Edit3, Search, X } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { OfferBank } from '../../banks/components/OfferBank';
import { BrandMark } from '../../../shared/ui/BrandMark';
import type { BankApp } from '../../banks/model/bank-apps';
import { isAllPurchases } from '../model/categories';
import { formatPercent, type Offer } from '../model/offers';

interface OffersListProps {
  offers: readonly Offer[];
  visible: readonly Offer[];
  search: string;
  setSearch: (value: string) => void;
  mobile: boolean;
  onEdit: (offer: Offer) => void;
  onOpenBank: (app: BankApp) => void;
}
export function OffersList({
  offers,
  visible,
  search,
  setSearch,
  mobile,
  onEdit,
  onOpenBank,
}: OffersListProps) {
  return (
    <div className="content-layout">
      <section className="offers-section" aria-labelledby="offers-title">
        {offers.length > 0 && (
          <div className="list-toolbar">
            <label className="search-input">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Категория или банк"
                aria-label="Поиск по категории или банку"
              />
              {search && (
                <button
                  className="icon-button"
                  aria-label="Очистить поиск"
                  onClick={() => setSearch('')}
                >
                  <X size={16} />
                </button>
              )}
            </label>
          </div>
        )}
        {!offers.length ? (
          <div className="empty-state">
            <BrandMark className="empty-state-mark" />
            <h3>Пока нет категорий</h3>
            <p>
              Загрузите скриншот из приложения банка с категориями кэшбека и процентами или добавьте
              их вручную.
            </p>
          </div>
        ) : !visible.length ? (
          <div className="no-results">
            <Search size={27} />
            <h3>Ничего не нашлось</h3>
            <p>Попробуйте другое название категории или банка.</p>
            <button className="button secondary" onClick={() => setSearch('')}>
              Сбросить поиск
            </button>
          </div>
        ) : (
          <div className="offers-grid">
            {visible.map((offer) => (
              <article
                className={`offer-card${isAllPurchases(offer.category) ? ' offer-card--all-purchases' : ''}`}
                key={offer.id}
              >
                <div className="offer-details">
                  <CategoryIcon category={offer.category} />
                  <div className="offer-copy">
                    <h3 title={offer.category}>{offer.category}</h3>
                    <OfferBank bank={offer.bank} mobile={mobile} onLaunch={onOpenBank} />
                  </div>
                </div>
                <div className="offer-percent">
                  {formatPercent(offer.percent)}
                  <span>%</span>
                </div>
                <div className="offer-actions">
                  <button
                    className="icon-button"
                    aria-label={`Редактировать ${offer.category}, ${offer.bank}`}
                    onClick={() => onEdit(offer)}
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
